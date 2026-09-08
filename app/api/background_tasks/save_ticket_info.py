from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from agents.graph import get_graph
from database.postgres import models
from database.postgres.database import get_db_ctx


def _as_dict(value: Any) -> dict[str, Any] | None:
    """Return a JSON-ready representation of a Pydantic model or mapping."""
    if value is None:
        return None
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, dict):
        return value
    return None


def _set_when_present(ticket: models.Tickets, field: str, value: Any) -> None:
    """Avoid overwriting persisted review data with absent graph-state values."""
    if value is not None:
        setattr(ticket, field, value)


async def save_ticket_info(thread_id: str) -> dict[str, str]:
    """Merge the latest LangGraph snapshot into the ticket record."""
    config = {"configurable": {"thread_id": thread_id}}
    snapshot = await get_graph().aget_state(config)
    state = snapshot.values if snapshot else None

    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No state found for thread_id {thread_id}",
        )

    ticket_id = state.get("id")
    if ticket_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Graph state for {thread_id} has no ticket id.",
        )

    with get_db_ctx() as db:
        try:
            ticket = (
                db.query(models.Tickets)
                .filter(models.Tickets.id == ticket_id)
                .first()
            )
            if ticket is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Ticket with id {ticket_id} not found in the database.",
                )

           
            for field in (
                "user_id", "account_tier", "subject", "body", "unified_ticket",
                "department", "confidence", "priority", "tags",
                "extracted_keywords", "search_query", "retries", "human_decision",
                "final_response_text", "status", "email_sent", "message_id",
            ):
                _set_when_present(ticket, field, state.get(field))

            state_telemetry = _as_dict(state.get("telemetry_data"))
            if state_telemetry is not None:
                persisted_telemetry = ticket.telemetry_data or {}
                ticket.telemetry_data = {
                    **persisted_telemetry,
                    **state_telemetry,
                }

            if state.get("retrieved_docs") is not None:
                ticket.retrieved_docs = [
                    serialized
                    for doc in state["retrieved_docs"]
                    if (serialized := _as_dict(doc)) is not None
                ]

            _set_when_present(ticket, "ai_draft", _as_dict(state.get("ai_draft")))

            eval_result = _as_dict(state.get("eval_result"))
            if eval_result is not None:
                _set_when_present(ticket, "eval_confidence", eval_result.get("confidence_score"))
                _set_when_present(ticket, "has_hallucinations", eval_result.get("has_hallucinations"))
                _set_when_present(ticket, "grounding_source_ids", eval_result.get("grounding_source_ids"))
                _set_when_present(ticket, "eval_feedback", eval_result.get("feedback_for_rewriter"))

            ticket.thread_id = thread_id
            ticket.resolved_by = "AI AGENT"

            now = datetime.now(timezone.utc)
            created_at = ticket.created_at
            if created_at and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            elapsed_ms = (now - created_at).total_seconds() * 1000 if created_at else 0.0
            if ticket.initial_latency is None:
                ticket.initial_latency = elapsed_ms
            if state.get("human_decision"):
                ticket.total_latency = elapsed_ms
                ticket.latency = elapsed_ms

            db.commit()

        except HTTPException:
            db.rollback()
            raise
        except Exception as exc:
            db.rollback()
           
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred while saving ticket info.",
            ) from exc

    return {"status": "SAVED"}
