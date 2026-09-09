from fastapi import Depends, status, HTTPException, APIRouter, BackgroundTasks, Query, Request
from sqlalchemy import func, case, text
from database.postgres.database import get_db
from sqlalchemy.orm import Session, joinedload
from database.postgres import models
from services.oauth2 import get_current_admin
from agents.state import UserTicketResponse
from agents.graph import get_graph
from typing import Any
from api.background_tasks import send_processed_ticket
from api.background_tasks.save_ticket_info import save_ticket_info
from model.schemas.schema import ResolvedTicket, EngineerSolution
from database.postgres.database import get_db
from sqlalchemy.orm import Session, joinedload
from database.postgres import models
from langgraph.types import Command
from agents.state import ApprovalDecision
from agents.graph import get_graph
from agents.state import UserTicketResponse
from api.background_tasks.send_ticket_response import send_resolved_email
from api.background_tasks.send_processed_ticket import (
    send_resolved_email as send_direct_resolved_email,
)
from api.background_tasks.save_ticket_info import save_ticket_info
from api.background_tasks.semantic_diff import node_semantic_diff
from api.background_tasks.save_resolved_ticket import save_incoming_resolved_ticket
from api.background_tasks.save_engineer_resolved_ticket import (
    save_engineer_resolved_ticket,
)
from api.background_tasks.escalate import escalate_to_l3
from cache import get_latest_drift_alert as get_cached_drift_alert
import json
from datetime import datetime, timedelta
from huggingface_hub import InferenceClient
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
import json
from datetime import datetime, timedelta, timezone  
from arq.connections import ArqRedis
from paths import PROJECT_ROOT

load_dotenv(PROJECT_ROOT / ".env", override=True)

HUGGIN_FACE_TOKEN = os.getenv("HF_TOKEN")

hf_client = InferenceClient(
    provider="featherless-ai",
    api_key=HUGGIN_FACE_TOKEN,
)
MODEL_ID = "meta-llama/Llama-3.1-8B-Instruct"

router = APIRouter(prefix="/admin/tickets", tags=["Admin Tickets"])


async def get_arq_redis(request: Request) -> ArqRedis:
    startup_task = getattr(request.app.state, "redis_startup_task", None)
    if startup_task is not None and not startup_task.done():
        await startup_task

    arq_redis = getattr(request.app.state, "arq_redis", None)
    if arq_redis is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis job queue is unavailable. Retry after the backend reconnects.",
        )

    return arq_redis


def _serialize_admin_ticket(ticket: models.Tickets) -> dict[str, Any]:
    user_details = None
    if ticket.owner is not None:
        user_details = {
            "id": ticket.owner.id,
            "email": ticket.owner.email,
            "name": getattr(ticket.owner, "name", None),
            "business_name": getattr(ticket.owner, "business_name", None),
            "account_tier": ticket.owner.account_tier,
        }

    telemetry_data = getattr(ticket, "telemetry_data", None)
    semantic_cache = (
        telemetry_data.get("semantic_cache")
        if isinstance(telemetry_data, dict)
        else None
    )

    return {
        "ticket_id": ticket.id,
        "id": ticket.id,
        "thread_id": ticket.thread_id,
        "user_id": ticket.user_id,
        "subject": ticket.subject,
        "body": ticket.body,
        "account_tier": ticket.account_tier,
        "status": ticket.status,
        "department": ticket.department,
        "confidence": ticket.confidence,
        "priority": ticket.priority,
        "failure_reason": getattr(ticket, "ticket_check_message", None),
        "retrieved_docs": getattr(ticket, "retrieved_docs", []) or [],
        "retries": getattr(ticket, "retries", 0),
        "eval_confidence": getattr(ticket, "eval_confidence", None),
        "has_hallucinations": getattr(ticket, "has_hallucinations", False),
        "grounding_source_ids": getattr(ticket, "grounding_source_ids", []) or [],
        "eval_feedback": getattr(ticket, "eval_feedback", None),
        "tags": getattr(ticket, "tags", []) or [],
        "extracted_keywords": getattr(ticket, "extracted_keywords", []) or [],
        "telemetry_data": telemetry_data,
        "jira_escalation": (
            telemetry_data.get("jira_escalation")
            if isinstance(telemetry_data, dict)
            else None
        ),
        "ai_draft": getattr(ticket, "ai_draft", None),
        "human_decision": getattr(ticket, "human_decision", None),
        "human_edited_text": getattr(ticket, "human_edited_text", None),
        "created_at": getattr(ticket, "created_at", None),
        "updated_at": getattr(ticket, "updated_at", None),
        "initial_latency": getattr(ticket, "initial_latency", None),
        "total_latency": getattr(ticket, "total_latency", None),
        "latency": getattr(ticket, "latency", None),
        "final_response_text": getattr(ticket, "final_response_text", None),
        "resolved_by": getattr(ticket, "resolved_by", None),
        "troubleshooting_steps": getattr(ticket, "troubleshooting_steps", []) or [],
        "solution": getattr(ticket, "solution", None),
        "root_cause": getattr(ticket, "root_cause", None),
        "user": user_details,
        "semantic_cache": semantic_cache,
        "cache_hit": (
            bool(semantic_cache.get("cache_hit"))
            if isinstance(semantic_cache, dict)
            else False
        ),
    }


def _ticket_as_graph_state(ticket: models.Tickets) -> dict[str, Any]:
    owner = ticket.owner
    return {
        "id": ticket.id,
        "user_id": ticket.user_id,
        "email": getattr(owner, "email", ""),
        "subject": ticket.subject,
        "body": ticket.body,
        "account_tier": ticket.account_tier,
        "department": ticket.department,
        "confidence": ticket.confidence,
        "priority": ticket.priority,
        "failure_reason": ticket.ticket_check_message,
        "tags": ticket.tags or [],
        "extracted_keywords": ticket.extracted_keywords or [],
        "search_query": ticket.search_query,
        "retrieved_docs": ticket.retrieved_docs or [],
        "telemetry_data": ticket.telemetry_data,
        "unified_ticket": ticket.unified_ticket,
        "final_response_text": ticket.final_response_text,
    }

@router.get(
    "",
    status_code=status.HTTP_200_OK,
)
async def fetch_all_tickets(
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin),
    pending: bool = Query(
        False,
        description="Return tickets currently waiting for admin approval.",
    ),
    processed: bool = Query(
        False,
        description="Return tickets that were resolved through the semantic cache.",
    ),
    min_confidence: float | None = Query(
        None,
        description="Only return tickets with confidence >= this value.",
    ),
    escalated: bool = Query(
        False,
        description="Return the total number of escalated tickets.",
    ),
    analytics: bool = Query(
        False,
        description="Return aggregated operational metrics.",
    ),
):
    """
    Admin ticket management endpoint.

    Supported modes:

    /tickets
        Return all tickets.

    /tickets?pending=true
        Return tickets waiting for admin approval.

    /tickets?escalated=true
        Return total escalated ticket count.

    /tickets?analytics=true
        Return operational analytics.

    /tickets?min_confidence=0.70
        Return tickets above the specified confidence.
    """

    if not current_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform action",
        )
        

    if analytics:

        VIP_SLA_MINUTES = 30
        PREMIUM_SLA_MINUTES = 60
        STANDARD_SLA_MINUTES = 120

        metrics = (
            db.query(
                func.count(
                    models.Tickets.id
                ).label("total_tickets"),

                func.count(
                    case(
                        (
                            (
                                models.Tickets.status
                                == "RESOLVED"
                            )
                            & (
                                models.Tickets.human_decision
                                == "APPROVE"
                            ),
                            models.Tickets.id,
                        )
                    )
                ).label(
                    "ai_resolved_pure"
                ),

                func.count(
                    case(
                        (
                            (
                                models.Tickets.status
                                == "RESOLVED"
                            )
                            & (
                                (
                                    models.Tickets.human_decision
                                    == "EDIT_AND_SEND"
                                )
                                | (
                                    models.Tickets.human_edited_text.isnot(
                                        None
                                    )
                                )
                            ),
                            models.Tickets.id,
                        )
                    )
                ).label(
                    "operator_edited"
                ),

                func.count(
                    case(
                        (
                            (
                                models.Tickets.status
                                == "ESCALATED"
                            )
                            | (
                                models.Tickets.human_decision
                                == "REJECT_AND_ESCALATE"
                            ),
                            models.Tickets.id,
                        )
                    )
                ).label(
                    "total_escalated"
                ),


                func.count(
                    case(
                        (
                            (
                                models.Tickets.status
                                == "QUEUED"
                            )
                            & (
                                case(
                                    (
                                        models.Tickets.account_tier
                                        == "VIP",
                                        func.now()
                                        - models.Tickets.created_at
                                        > text(
                                            f"interval '{VIP_SLA_MINUTES} minutes'"
                                        ),
                                    ),
                                    (
                                        models.Tickets.account_tier
                                        == "Premium",
                                        func.now()
                                        - models.Tickets.created_at
                                        > text(
                                            f"interval '{PREMIUM_SLA_MINUTES} minutes'"
                                        ),
                                    ),
                                    else_=(
                                        func.now()
                                        - models.Tickets.created_at
                                        > text(
                                            f"interval '{STANDARD_SLA_MINUTES} minutes'"
                                        )
                                    ),
                                )
                            ),
                            models.Tickets.id,
                        )
                    )
                ).label(
                    "sla_breaches"
                ),

                func.count(
                    case(
                        (
                            models.Tickets.confidence < 0.70,
                            models.Tickets.id,
                        )
                    )
                ).label(
                    "low_confidence_count"
                ),

                func.avg(models.Tickets.eval_confidence).label("grounding_average"),
                func.count(
                    case((models.Tickets.retries > 0, models.Tickets.id))
                ).label("retried_ticket_count"),

                
                func.count(
                    case(
                        (
                            (
                                models.Tickets.human_decision
                                != "REJECT_AND_ESCALATE"
                            )
                            & (
                                models.Tickets.status
                                != "ESCALATED"
                            ),
                            models.Tickets.id,
                        )
                    )
                ).label(
                    "accurate_routes"
                ),
            )
            .first()
        )

        total = metrics.total_tickets or 0

        ai_resolution_rate = (
            round(
                (
                    metrics.ai_resolved_pure
                    / total
                )
                * 100,
                1,
            )
            if total
            else 0.0
        )

        escalation_rate = (
            round(
                (
                    metrics.total_escalated
                    / total
                )
                * 100,
                1,
            )
            if total
            else 0.0
        )

        routing_accuracy = (
            round(
                (
                    metrics.accurate_routes
                    / total
                )
                * 100,
                1,
            )
            if total
            else 0.0
        )

        return {
            "total_tickets": total,
            "ai_resolution_rate": (
                f"{ai_resolution_rate}%"
            ),
            "resolved_without_human_override": (
                metrics.ai_resolved_pure
            ),
            "response_draft_edited_by_operator": (
                metrics.operator_edited
            ),
            "escalation_rate": (
                f"{escalation_rate}%"
            ),
            "jira_engineering_escalations": (
                metrics.total_escalated
            ),
            "sla_breaches": (
                metrics.sla_breaches
            ),
            "low_confidence_tickets": (
                metrics.low_confidence_count
            ),
            "routing_accuracy": (
                f"{routing_accuracy}%"
            ),
            "grounding_average": float(metrics.grounding_average or 0),

        }

    if processed:
        tickets = (
            db.query(models.Tickets)
            .options(joinedload(models.Tickets.owner))
            .filter(models.Tickets.status == "PROCESSED")
            .order_by(models.Tickets.created_at.desc())
            .all()
        )

        return [_serialize_admin_ticket(ticket) for ticket in tickets]


    if escalated:

        total_escalated = (
            db.query(
                func.count(
                    models.Tickets.id
                )
            )
            .filter(
                (
                    models.Tickets.status
                    == "ESCALATED"
                )
                | (
                    models.Tickets.human_decision
                    == "REJECT_AND_ESCALATE"
                )
            )
            .scalar()
        )

        return {
            "total_escalated_tickets": (
                total_escalated or 0
            )
        }

    if pending:

        tickets = (
            db.query(models.Tickets)
            .options(
                joinedload(
                    models.Tickets.owner
                )
            )
            .filter(
                models.Tickets.status
                == "AWAITING HUMAN REVIEW"
            )
            .order_by(
                models.Tickets.created_at.desc()
            )
            .all()
        )

        pending_payloads = []

        graph = get_graph()

        for ticket in tickets:

            thread_id = (
                f"ticket_thread_{ticket.id}"
            )

            config = {
                "configurable": {
                    "thread_id": thread_id,
                }
            }

            try:

                graph_state = (
                    await graph.aget_state(
                        config
                    )
                )

            except Exception as e:

              

                continue

            if (
                not graph_state
                or not graph_state.values
            ):
                continue

            state_values = (
                graph_state.values
            )

            eval_result = (
                state_values.get(
                    "eval_result"
                )
            )

            confidence_score = (
                getattr(
                    eval_result,
                    "confidence_score",
                    1.0,
                )
                if eval_result
                else 1.0
            )

            has_hallucinations = (
                getattr(
                    eval_result,
                    "has_hallucinations",
                    False,
                )
                if eval_result
                else False
            )

            grounding_source_ids = (
                getattr(
                    eval_result,
                    "grounding_source_ids",
                    [],
                )
                if eval_result
                else []
            )

            raw_docs = (
                state_values.get(
                    "retrieved_docs",
                    [],
                )
            )

            formatted_docs = []

            for doc in raw_docs:

                if hasattr(
                    doc,
                    "model_dump",
                ):
                    formatted_docs.append(
                        doc.model_dump()
                    )

                elif isinstance(
                    doc,
                    dict,
                ):
                    formatted_docs.append(
                        doc
                    )

                else:
                    formatted_docs.append(
                        str(doc)
                    )
            raw_draft = state_values.get("ai_draft") or ticket.ai_draft

            if hasattr(
                raw_draft,
                "model_dump",
            ):
                ai_draft = (
                    raw_draft.model_dump()
                )

            elif isinstance(
                raw_draft,
                dict,
            ):
                ai_draft = raw_draft

            else:
                ai_draft = raw_draft

            owner = ticket.owner

            user_details = None

            if owner:

                user_details = {
                    "id": owner.id,
                    "email": owner.email,
                    "account_tier": (
                        owner.account_tier
                    ),
                }

                if hasattr(
                    owner,
                    "name",
                ):
                    user_details["name"] = (
                        owner.name
                    )

                elif hasattr(
                    owner,
                    "full_name",
                ):
                    user_details["name"] = (
                        owner.full_name
                    )


            payload = {
                "question": (
                    "Do you approve sending "
                    "this response to the customer?"
                ),

                "thread_id": thread_id,

                "ticket_info": {
                    "ticket_id": ticket.id,

                    "user_id": ticket.user_id,

                    "account_tier": (
                        ticket.account_tier
                    ),

                    "confidence": (
                        ticket.confidence
                    ),

                    "priority": (
                        state_values.get(
                            "priority",
                            ticket.priority
                            or "Medium",
                        )
                    ),

                    "department": (
                        state_values.get(
                            "department",
                            ticket.department
                            or "General",
                        )
                    ),

                    "subject": (
                        ticket.subject
                    ),

                    "original_body": (
                        ticket.body
                    ),

                    "unified_ticket": (
                        ticket.unified_ticket
                    ),

                    "retries": (
                        state_values.get(
                            "retries",
                            ticket.retries,
                        )
                    ),

                    "search_query": (
                        state_values.get(
                            "search_query",
                            ticket.search_query,
                        )
                    ),

                    "tags": (
                        state_values.get(
                            "tags",
                            ticket.tags or [],
                        )
                        or []
                    ),

                    "extracted_keywords": (
                        state_values.get(
                            "extracted_keywords",
                            ticket.extracted_keywords or [],
                        )
                        or []
                    ),

                    "status": ticket.status,

                    "initial_latency": (
                        ticket.initial_latency
                    ),

                    "total_latency": (
                        ticket.total_latency
                    ),

                    "latency": ticket.latency,

                    "created_at": ticket.created_at,

                    "updated_at": ticket.updated_at,

                    "telemetry_data": (
                        state_values.get("telemetry_data")
                        or ticket.telemetry_data
                    ),
                },

          
                "user": user_details,

                "rag_audit_trail": {
                    "confidence_score": (
                        confidence_score
                    ),

                    "has_hallucinations": (
                        has_hallucinations
                    ),

                    "grounding_source_ids": (
                        grounding_source_ids
                    ),

                    "retrieved_docs": (
                        formatted_docs
                    ),

                    "feedback_for_rewriter": (
                        getattr(
                            eval_result,
                            "feedback_for_rewriter",
                            ticket.eval_feedback,
                        )
                    ),
                },

                

                "ai_draft": ai_draft,

              

                "allowed_decisions": [
                    "APPROVE",
                    "EDIT_AND_SEND",
                    "REJECT_AND_ESCALATE",
                ],
            }

            pending_payloads.append(
                payload
            )

        return pending_payloads

    query = (
        db.query(models.Tickets)
        .options(
            joinedload(
                models.Tickets.owner
            )
        )
    )

    # Optional confidence filter

    if min_confidence is not None:

        if not 0 <= min_confidence <= 1:

            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "min_confidence must be "
                    "between 0 and 1"
                ),
            )

        query = query.filter(
            models.Tickets.confidence
            >= min_confidence
        )

    tickets = (
        query
        .order_by(
            models.Tickets.created_at.desc()
        )
        .all()
    )


    response = []

    for ticket in tickets:

        owner = ticket.owner

        user_details = None

        if owner:

            user_details = {
                "id": owner.id,
                "email": owner.email,
                "account_tier": (
                    owner.account_tier
                ),
            }

            if hasattr(
                owner,
                "name",
            ):
                user_details["name"] = (
                    owner.name
                )

            elif hasattr(
                owner,
                "full_name",
            ):
                user_details["name"] = (
                    owner.full_name
                )

        response.append(
            {
                "ticket_id": ticket.id,
                "user_id": ticket.user_id,
                "subject": ticket.subject,
                "body": ticket.body,
                "account_tier": ticket.account_tier,
                "confidence": ticket.confidence,
                "eval_confidence": ticket.eval_confidence,
                "priority": ticket.priority,
                "department": ticket.department,
                "status": ticket.status,
                "unified_ticket": ticket.unified_ticket,
                "search_query": ticket.search_query,
                "retrieved_docs": ticket.retrieved_docs or [],
                "retries": ticket.retries,
                "has_hallucinations": ticket.has_hallucinations,
                "grounding_source_ids": ticket.grounding_source_ids or [],
                "eval_feedback": ticket.eval_feedback,
                "tags": ticket.tags or [],
                "extracted_keywords": ticket.extracted_keywords or [],
                "telemetry_data": ticket.telemetry_data,
                "ai_draft": ticket.ai_draft,
                "human_decision": (
                    ticket.human_decision
                ),
                "human_edited_text": (
                    ticket.human_edited_text
                ),
                "created_at": ticket.created_at,
                "updated_at": ticket.updated_at,
                "initial_latency": ticket.initial_latency,
                "total_latency": ticket.total_latency,
                "latency": ticket.latency,
                "final_response_text": ticket.final_response_text,
                "user": user_details,
            }
        )

    return response

@router.post(
    "/{ticket_id}/resolve",
    status_code=status.HTTP_200_OK,
)
async def resolve_ticket(
    ticket_id: int,
    payload: ResolvedTicket,
    background_tasks: BackgroundTasks,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized",
        )

    if ticket_id != payload.ticket_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket ID mismatch",
        )

    ticket = (
        db.query(models.Tickets)
        .options(joinedload(models.Tickets.owner))
        .filter(models.Tickets.id == ticket_id)
        .first()
    )

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if ticket.status != "PROCESSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(f"Ticket cannot be resolved " f"from status {ticket.status}"),
        )

    if ticket.owner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket creator not found",
        )

    ticket.final_response_text = payload.resolution

    if hasattr(ticket, "edited"):
        ticket.edited = payload.edited

    ticket.status = "RESOLVED"

    try:
        db.commit()
        db.refresh(ticket)

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve ticket",
        ) from e

    background_tasks.add_task(
        send_processed_ticket,
        recipient=ticket.owner.email,
        subject=f"Resolved: {ticket.subject}",
        email_body=payload.resolution,
    )

    # This task runs after the status change and records end-to-end latency.
    background_tasks.add_task(save_ticket_info, f"ticket_thread_{ticket.id}")

    return {
        "ticket_id": ticket.id,
        "status": ticket.status,
        "edited": payload.edited,
        "message": ("Ticket resolved successfully"),
    }


@router.post(
    "/{ticket_id}/retry",
    status_code=status.HTTP_200_OK,
)
async def retry_ticket(
    ticket_id: int,
    request: Request,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    arq_redis: ArqRedis = Depends(get_arq_redis),
):
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized",
        )

    ticket = (
        db.query(models.Tickets)
        .options(joinedload(models.Tickets.owner))
        .filter(models.Tickets.id == ticket_id)
        .first()
    )

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    if ticket.status != "FAILED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed tickets can be retried.",
        )

    ticket.retries = (ticket.retries or 0) + 1
    ticket.status = "QUEUED"

    try:
        db.commit()
        db.refresh(ticket)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update ticket before retrying.",
        ) from exc

    try:
        job = await arq_redis.enqueue_job(
            "run_langgraph_task",
            ticket_id=ticket_id,
            _job_id=f"ticket-{ticket.id}-retry-{ticket.retries}",
        )
        if job is None:
            raise RuntimeError("ARQ did not create a retry job for this ticket.")
    except Exception as exc:
        ticket.retries = max((ticket.retries or 1) - 1, 0)
        ticket.status = "FAILED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ticket was updated, but retry enqueue failed.",
        ) from exc

    return {
        "ticket_id": ticket.id,
        "status": ticket.status,
        "retries": ticket.retries,
        "job_id": job.job_id,
        "message": "Ticket requeued for processing.",
    }


# get all owner's tickets
@router.get(
    "/user/{id}",
    response_model=list[UserTicketResponse],
    status_code=status.HTTP_200_OK,
)
async def get_user_tickets(
    id: int,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # search for user
    current_user = db.query(models.User).filter(models.User.id == id).first()

    # check admin status
    if not current_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform action",
        )

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    all_tickets = current_user.incidents or []

    return all_tickets


# get one ticket
@router.get("/detail/{id}", status_code=status.HTTP_200_OK, response_model=UserTicketResponse)
async def fetch_one_ticket(
    id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):

    # check if ticket exists
    ticket = db.query(models.Tickets).filter(models.Tickets.id == id).first()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket doesn't exist"
        )

    # check user status
    if current_admin is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this ticket",
        )

    return ticket


@router.put("/{ticket_id}/engineer-resolution")
async def get_engineering_resolution(
    ticket_id: int,
    resolution: EngineerSolution,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # search for ticket
    search_query = db.query(models.Tickets).filter(models.Tickets.id == ticket_id)

    ticket = search_query.first()

    updated_ticket_values = {
        "status": "RESOLVED",
        "resolved_by": resolution.engineer_id,
        "root_cause": resolution.root_cause,
        "troubleshooting_steps": resolution.troubleshooting_steps,
        "solution": resolution.solution,
    }

    if ticket == None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    try:
        search_query.update(updated_ticket_values, synchronize_session=False)

        db.commit()
        db.refresh(ticket)

        background_tasks.add_task(
            save_engineer_resolved_ticket,
            ticket,
            resolution.solution,
        )
        return updated_ticket_values
    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/alerts/latest", status_code=status.HTTP_200_OK)
async def get_latest_alert():
    """Return the most recent alert produced by the weekly drift job."""
    alert = await get_cached_drift_alert()
    if alert is None:
        return {"alert": None, "message": "No documentation drift alerts yet."}
    return {"alert": alert}


@router.post("/{thread_id}/approval")
async def approve_pending_ticket(
    thread_id: int,
    payload: ApprovalDecision,
    background_tasks: BackgroundTasks,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized",
        )

    if payload.department is not None:
        allowed_departments = {
            "Billing and Payments",
            "Customer Service",
            "General Inquiry",
            "Human Resources",
            "IT Support",
            "Product Support",
            "Returns and Exchanges",
            "Sales and Pre-Sales",
            "Service Outages and Maintenance",
            "Technical Support",
        }

        if payload.department not in allowed_departments:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid department",
            )

        ticket = (
            db.query(models.Tickets)
            .filter(models.Tickets.id == thread_id)
            .first()
        )
        if ticket is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found",
            )

        ticket.department = payload.department
        db.commit()

    graph_thread_id = f"ticket_thread_{thread_id}"
    config = {"configurable": {"thread_id": graph_thread_id}}

    graph = get_graph()
    snapshot = await graph.aget_state(config)

    if not snapshot:
        ticket = (
            db.query(models.Tickets)
            .options(joinedload(models.Tickets.owner))
            .filter(models.Tickets.id == thread_id)
            .first()
        )
        if (
            ticket is None
            or ticket.status != "PROCESSED"
            or not ticket.final_response_text
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ticket is not awaiting approval or thread_id is invalid",
            )

        if payload.decision == "REJECT_AND_ESCALATE":
            ticket.human_decision = payload.decision
            ticket.human_edited_text = None
            # Jira creation runs after this response.  Do not report a completed
            # escalation until Jira has accepted the issue creation request.
            ticket.status = "ESCALATION_PENDING"
            db.commit()
            db.refresh(ticket)

            background_tasks.add_task(
                escalate_to_l3,
                _ticket_as_graph_state(ticket),
            )

            return {
                "status": "ESCALATION_PENDING",
                "thread_id": thread_id,
                "decision": payload.decision,
                "department": payload.department,
                "final_response_text": ticket.final_response_text,
            }

        resolved_text = payload.edited_text or ticket.final_response_text
        ticket.human_decision = payload.decision
        ticket.human_edited_text = (
            payload.edited_text if payload.edited_text else None
        )
        ticket.final_response_text = resolved_text
        ticket.status = "RESOLVED"
        db.commit()
        db.refresh(ticket)

        background_tasks.add_task(
            send_direct_resolved_email,
            recipient=ticket.owner.email if ticket.owner else "",
            subject=f"Resolved: {ticket.subject}",
            email_body=resolved_text,
        )

        return {
            "status": "RESOLVED",
            "thread_id": thread_id,
            "decision": payload.decision,
            "department": payload.department,
            "final_response_text": resolved_text,
        }

    updated_state = await graph.ainvoke(
        Command(resume=payload.model_dump()), config=config
    )

    human_decision = updated_state.get("human_decision")
    final_response_text = updated_state.get("final_response_text")

    if not final_response_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Approval did not produce a final response.",
        )

    if human_decision == "REJECT_AND_ESCALATE":
        background_tasks.add_task(escalate_to_l3, graph_thread_id)
        background_tasks.add_task(save_ticket_info, graph_thread_id)

        return {
            "status": "ESCALATION_PENDING",
            "thread_id": thread_id,
            "decision": payload.decision,
            "department": payload.department,
            "final_response_text": final_response_text,
        }

    background_tasks.add_task(
        send_resolved_email,
        graph_thread_id,
        final_response_text,
    )
    background_tasks.add_task(save_ticket_info, graph_thread_id)
    background_tasks.add_task(node_semantic_diff, graph_thread_id)
    background_tasks.add_task(save_incoming_resolved_ticket, graph_thread_id)

    return {
        "status": "RESOLVED",
        "thread_id": thread_id,
        "decision": payload.decision,
        "department": payload.department,
        "final_response_text": final_response_text,
    }


@router.delete("/{ticket_id}", status_code=status.HTTP_200_OK)
async def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_admin: Any = Depends(get_current_admin),
):
    if not current_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform action",
        )

    ticket = (
        db.query(models.Tickets)
        .options(joinedload(models.Tickets.owner))
        .filter(models.Tickets.id == ticket_id)
        .first()
    )

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    ticket_payload = _serialize_admin_ticket(ticket)

    try:
        db.delete(ticket)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete ticket.",
        ) from exc

    return {
        "status": "DELETED",
        "ticket_id": ticket_id,
        "message": "Ticket deleted successfully.",
        "ticket": ticket_payload,
    }


@router.get("/analyze_incidents", status_code=status.HTTP_200_OK)
async def analyze_ticket_clusters(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
    pending: bool = Query(
        True, description="Include pending/QUEUED tickets in the analysis"
    ),
    include_processed: bool = Query(
        False, description="Include completed/PROCESSED tickets in the analysis"
    ),
):
    # Guard Clause: Authorize user
    if not current_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform action",
        )

    # 2. Build dynamic status filters based on query parameters
    status_filters = []
    if pending:
        status_filters.append("QUEUED")
    if include_processed:
        status_filters.append("PROCESSED")

    # Fallback if no filters are selected
    if not status_filters:
        return {"potential_incidents_detected": False, "clusters": []}

    # FIX: Use timezone-aware UTC to prevent DB timestamp mismatch bugs
    time_window = datetime.now(timezone.utc) - timedelta(hours=48)

    tickets = (
        db.query(models.Tickets)
        .filter(
            models.Tickets.status.in_(status_filters),
            models.Tickets.created_at >= time_window,
        )
        .all()
    )

    if not tickets:
        return {"potential_incidents_detected": False, "clusters": []}

    # Map database row outputs into clean context arrays for the LLM
    llm_payload = [
        {
            "id": t.id,
            "status": t.status,
            "subject": t.subject,
            "body": t.body,
            "customer_id": t.user_id,
            "region": getattr(t, "region", "Unknown"),
        }
        for t in tickets
    ]

    # 3. Define the structural schema expected by your frontend UI
    json_schema = {
        "type": "object",
        "properties": {
            "potential_incidents_detected": {"type": "boolean"},
            "clusters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "incident_title": {"type": "string"},
                        "description": {"type": "string"},
                        "affected_regions": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "ticket_ids": {
                            "type": "array",
                            "items": {"type": "integer"},
                        },
                    },
                    "required": [
                        "incident_title",
                        "description",
                        "affected_regions",
                        "ticket_ids",
                    ],
                },
            },
        },
        "required": ["potential_incidents_detected", "clusters"],
    }

    # 4. Trigger the Llama 3.1 Inference Engine
    try:
        response = hf_client.chat_completion(
            model=MODEL_ID,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert incident management agent. Look at the text records from pending or processed customer tickets. "
                        "Identify cross-customer or cross-region linkages that suggest a broader infrastructure outage or application breakdown. "
                        "Group related data cleanly. If tickets are isolated with no shared technical patterns, set potential_incidents_detected to false."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Analyze these ticket records for incident anomalies: {json.dumps(llm_payload)}",
                },
            ],
            # FIX: Swapped "schema" to "value" to match huggingface_hub validation rules
            response_format={"type": "json_object", "value": json_schema},
            max_tokens=2048,
            temperature=0.1,  # Kept low for deterministic structuring
        )

        # 5. Extract and parse string payload back into a Python object
        raw_content = response.choices[0].message.content
        parsed_analysis = json.loads(raw_content)
        return parsed_analysis

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"HuggingFace inference or parsing failed: {str(e)}",
        )
