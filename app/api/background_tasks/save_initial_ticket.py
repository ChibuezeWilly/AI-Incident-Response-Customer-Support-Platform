from ...database.postgres import models
from ...database.postgres.database import get_db_ctx


def save_human_review(
    frontend_payload: dict,
) -> None:
    ticket_info = frontend_payload["ticket_info"]
    rag_audit = frontend_payload["rag_audit_trail"]
    ai_draft = frontend_payload["ai_draft"]

    ticket_id = ticket_info["ticket_id"]

    with get_db_ctx() as db:
        ticket = (
            db.query(models.Tickets)
            .filter(
                models.Tickets.id == ticket_id
            )
            .first()
        )

        if ticket is None:
            raise ValueError(
                f"Ticket #{ticket_id} not found."
            )

        # -------------------------------------------------
        # Ticket information
        # -------------------------------------------------

        ticket.thread_id = frontend_payload["thread_id"]

        ticket.user_id = ticket_info["user_id"]

        ticket.account_tier = (
            ticket_info["account_tier"]
        )

        ticket.subject = (
            ticket_info["subject"]
        )

        ticket.body = (
            ticket_info["original_body"]
        )

        ticket.unified_ticket = (
            ticket_info["unified_ticket"]
        )

        ticket.telemetry_data = (
            ticket_info["telemetry_data"]
        )

        # -------------------------------------------------
        # Triage
        # -------------------------------------------------

        ticket.department = (
            ticket_info["department"]
        )

        ticket.priority = (
            ticket_info["priority"]
        )

        ticket.confidence = (
            ticket_info["confidence"]
        )

        ticket.tags = list(
            ticket_info["tags"] or []
        )

        ticket.extracted_keywords = list(
            ticket_info["extracted_keywords"] or []
        )

        ticket.search_query = (
            ticket_info["search_query"]
        )


        ticket.retrieved_docs = list(
            rag_audit["retrieved_docs"] or []
        )

        ticket.eval_confidence = (
            rag_audit["confidence_score"]
        )

        ticket.has_hallucinations = (
            rag_audit["has_hallucinations"]
        )

        ticket.grounding_source_ids = list(
            rag_audit["grounding_source_ids"] or []
        )

        ticket.eval_feedback = (
            rag_audit["feedback_for_rewriter"]
        )
        ticket.retries = (
            ticket_info["retries"] or 0
        )

        ticket.ai_draft = ai_draft

        ticket.final_response_text = (
            ai_draft.get("full_response_text")
        )

        ticket.human_decision = None
        ticket.human_edited_text = None

        ticket.status = (
            "AWAITING HUMAN REVIEW"
        )

      

        db.commit()

    