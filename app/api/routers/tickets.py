from fastapi import (
    Depends,
    status,
    HTTPException,
    APIRouter,
    File,
    Form,
    Request,
    UploadFile,
)
from ...model.schemas.schema import TicketReward

import base64

import time
from ...database.postgres.database import get_db
from sqlalchemy.orm import Session, joinedload
from ...database.postgres import models
from ...services.oauth2 import get_current_user

from ...cache import (
    get_global_semantic_cache,
)
from ..background_tasks.ticket_payloads import build_initial_graph_state

from arq.connections import ArqRedis

analyzer = None
anonymizer = None


def _get_pii_tools():
    global analyzer, anonymizer
    if analyzer is None or anonymizer is None:
        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine

        analyzer = AnalyzerEngine()
        anonymizer = AnonymizerEngine()
    return analyzer, anonymizer


def sanitize_ticket_body(raw_body: str) -> str:
    analyzer_engine, anonymizer_engine = _get_pii_tools()
    results = analyzer_engine.analyze(
        text=raw_body,
        entities=[
            "PHONE_NUMBER",
            "EMAIL_ADDRESS",
            "CREDIT_CARD",
            "SECRET_KEY",
            "IP_ADDRESS",
            "URL",
            "API keys",
        ],
        language="en",
    )
    sanitized = anonymizer_engine.anonymize(text=raw_body, analyzer_results=results)
    return sanitized.text


router = APIRouter(prefix="/tickets", tags=["Tickets"])


def get_arq_redis(request: Request) -> ArqRedis:
    return request.app.state.arq_redis


def _ticket_response(ticket: models.Tickets, user: models.User, *, semantic_cache: dict | None = None) -> dict:
    user_payload = {
        "id": user.id,
        "email": user.email,
        "name": getattr(user, "name", None),
        "business_name": getattr(user, "business_name", None),
        "account_tier": user.account_tier,
    }

    response = {
        "id": ticket.id,
        "ticket_id": ticket.id,
        "thread_id": ticket.thread_id,
        "user_id": ticket.user_id,
        "subject": ticket.subject,
        "body": ticket.body,
        "description": ticket.body,
        "status": ticket.status,
        "account_tier": ticket.account_tier,
        "failure_reason": ticket.ticket_check_message,
        "department": ticket.department,
        "confidence": ticket.confidence,
        "priority": ticket.priority,
        "tags": ticket.tags or [],
        "extracted_keywords": ticket.extracted_keywords or [],
        "search_query": ticket.search_query,
        "retrieved_docs": ticket.retrieved_docs or [],
        "retries": ticket.retries,
        "eval_confidence": ticket.eval_confidence,
        "has_hallucinations": ticket.has_hallucinations,
        "grounding_source_ids": ticket.grounding_source_ids or [],
        "eval_feedback": ticket.eval_feedback,
        "telemetry_data": ticket.telemetry_data,
        "jira_escalation": (
            ticket.telemetry_data.get("jira_escalation")
            if isinstance(ticket.telemetry_data, dict)
            else None
        ),
        "ai_draft": ticket.ai_draft,
        "human_decision": ticket.human_decision,
        "human_edited_text": ticket.human_edited_text,
        "final_response_text": ticket.final_response_text,
        "latency": ticket.latency,
        "initial_latency": ticket.initial_latency,
        "total_latency": ticket.total_latency,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "user": user_payload,
    }

    if semantic_cache is not None:
        response["cache_hit"] = bool(semantic_cache.get("cache_hit", False))
        response["matched_ticket_id"] = semantic_cache.get("matched_ticket_id")
        response["semantic_cache"] = semantic_cache
        response["matched_ticket"] = semantic_cache.get("matched_ticket")
        response["matched_resolution_text"] = semantic_cache.get(
            "matched_resolution_text"
        )
        response["resolution"] = semantic_cache.get("resolution")

    return response



@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ticket(
    subject: str = Form(...),
    body: str = Form(...),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    new_ticket_images: list[UploadFile] = File(default=[]),
    arq_redis: ArqRedis = Depends(get_arq_redis),
):
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized to perform action",
        )

    body = sanitize_ticket_body(body)
    image_data_urls: list[str] = []

    for image in new_ticket_images:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Attachment '{image.filename}' must be an image.",
            )

        content = await image.read()
        encoded_str = base64.b64encode(content).decode("ascii")
        image_data_urls.append(f"data:{image.content_type};base64,{encoded_str}")

    ticket_response = {
        "user_id": user.id,
        "subject": subject,
        "body": body,
        "account_tier": user.account_tier,
        "status": "QUEUED",
        "image_url": image_data_urls[0] if image_data_urls else None,
        "telemetry_data": {
            "uploaded_images": image_data_urls,
        },
    }

    start_time = time.perf_counter()

    try:
        ticket = models.Tickets(**ticket_response)
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        ticket.thread_id = f"ticket_thread_{ticket.id}"
        db.commit()
        db.refresh(ticket)
    except Exception as e:
        db.rollback()
        print(f"Error creating ticket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected database error occurred while creating your ticket",
        ) from e

    # Check global Redis Semantic Cache (Threshold >= 0.95)
    incoming_issue_text = f"{ticket.subject} {ticket.body}"
    cached_match = await get_global_semantic_cache(
        query_text=incoming_issue_text,
        threshold=0.90,
    )

    if cached_match:
        matched_resolution_text = (
            cached_match.get("matched_resolution_text")
            or cached_match.get("resolution")
            or ""
        )
        print(
            "Cache Hit! "
            f"Matched Ticket #{cached_match.get('matched_ticket_id')} "
            f"(Score: {cached_match['similarity_score']})"
        )
        try:
            ticket.status = "PROCESSED"
            ticket.department = cached_match.get("department") or ticket.department
            ticket.confidence = cached_match.get("similarity_score")
            ticket.final_response_text = matched_resolution_text
            ticket.human_decision = "CACHE_HIT"
            ticket.human_edited_text = None
            ticket.ai_draft = {
                "greeting": "",
                "issue_summary": "",
                "root_cause": "",
                "resolution_steps": [],
                "closing": "",
                "full_response_text": matched_resolution_text,
                "full_response_text_cached": matched_resolution_text,
                "matched_ticket_id": cached_match.get("matched_ticket_id"),
                "source_collection": cached_match.get("source_collection"),
            }
            ticket.telemetry_data = {
                **(ticket.telemetry_data or {}),
                "semantic_cache": {
                    "cache_hit": True,
                    "matched_ticket_id": cached_match.get("matched_ticket_id"),
                    "similarity_score": cached_match.get("similarity_score"),
                    "resolution": matched_resolution_text,
                    "source_collection": cached_match.get("source_collection"),
                },
            }
            db.commit()
            db.refresh(ticket)
        except Exception as e:
            db.rollback()
            print(f"Error updating cached ticket: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update ticket status",
            ) from e

        return _ticket_response(
            ticket,
            user,
            semantic_cache=cached_match,
        )

   
    initial_graph_state = build_initial_graph_state(
        ticket_id=ticket.id,
        user_id=user.id,
        email=user.email,
        subject=ticket.subject,
        body=ticket.body,
        account_tier=user.account_tier,
        image_data_urls=image_data_urls,
    )

    try:
        job = await arq_redis.enqueue_job(
            "run_langgraph_task",
            ticket_id=str(ticket.id),
            input_state=initial_graph_state,
            _job_id=f"ticket-{ticket.id}",
        )
        if job is None:
            raise RuntimeError("ARQ did not create a job for this ticket.")
        
    except Exception as e:
        
        # Keep the ticket eligible for the worker's startup recovery sweep.
        ticket.status = "QUEUED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Ticket saved, but background processing pipeline failed "
                "to initialize."
            ),
        ) 
    
    end_time = time.perf_counter()
    latency_ms = (end_time - start_time) * 1000

    # Return immediately to prevent web server HTTP timeouts.
    return {
        **_ticket_response(ticket, user),
        "latency_ms": latency_ms,
        "job_id": job.job_id,
        "message": "Ticket received and queued for analysis.",
    }


@router.get(
    "/user",
    status_code=status.HTTP_200_OK,
)
async def get_all_tickets(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authorized",
        )

    tickets = (
        db.query(models.Tickets)
        .options(joinedload(models.Tickets.owner))
        .filter(models.Tickets.user_id == user.id)
        .order_by(models.Tickets.created_at.desc())
        .all()
    )

    return [
        {
            "ticket_id": ticket.id,
            "subject": ticket.subject,
            "body": ticket.body,
            "status": ticket.status,
            "account_tier": ticket.account_tier,
            "department": ticket.department,
            "priority": ticket.priority,
            "confidence": ticket.confidence,
            "search_query": ticket.search_query,
            "retrieved_docs": ticket.retrieved_docs or [],
            "retries": ticket.retries,
            "eval_confidence": ticket.eval_confidence,
            "has_hallucinations": ticket.has_hallucinations,
            "grounding_source_ids": ticket.grounding_source_ids or [],
            "tags": ticket.tags or [],
            "extracted_keywords": ticket.extracted_keywords or [],
            "telemetry_data": ticket.telemetry_data,
            "ai_draft": ticket.ai_draft,
            "final_response_text": ticket.final_response_text,
            "human_decision": ticket.human_decision,
            "human_edited_text": ticket.human_edited_text,
            "user_rating": ticket.user_rating,
            "user_feedback_comment": ticket.user_feedback_comment,
            "latency": ticket.latency,
            "initial_latency": ticket.initial_latency,
            "total_latency": ticket.total_latency,
            "created_at": ticket.created_at,
            "updated_at": ticket.updated_at,
            "user": (
                {
                    "id": ticket.owner.id,
                    "email": ticket.owner.email,
                    "name": getattr(
                        ticket.owner,
                        "name",
                        None,
                    ),
                    "account_tier": (ticket.owner.account_tier),
                }
                if ticket.owner
                else None
            ),
        }
        for ticket in tickets
    ]


# get one ticket
@router.get("/{id}", status_code=status.HTTP_200_OK)
async def fetch_one_ticket(
    id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):

    ticket = db.query(models.Tickets).filter(models.Tickets.id == id).first()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket doesn't exist"
        )

    if ticket.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this ticket",
        )

    return ticket


@router.get("/status/{id}", status_code=status.HTTP_200_OK)
async def send_ticket_status(id: int, db: Session = Depends(get_db)):
    # check if ticket exists
    ticket = db.query(models.Tickets).filter(models.Tickets.id == id).first()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket doesn't exist"
        )

    return ticket.status


@router.put("/{ticket_id}/ticket_reward")
async def submit_ticket_reward(
    ticket_id: int,
    reward: TicketReward,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # search for ticket
    search_query = db.query(models.Tickets).filter(models.Tickets.id == ticket_id)

    ticket = search_query.first()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    if ticket.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to rate this ticket",
        )

    updated_ticket = {
        "user_rating": reward.user_rating,
        "user_feedback_comment": reward.user_feedback,
    }

    try:
        search_query.update(updated_ticket, synchronize_session=False)

        db.commit()
        return updated_ticket
    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
