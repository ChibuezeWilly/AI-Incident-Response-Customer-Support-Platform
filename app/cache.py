"""Small ChromaDB semantic search helpers and Redis telemetry alerts."""

import json
import os
from datetime import datetime
from typing import Any

import chromadb
from dotenv import load_dotenv
from redis.asyncio import Redis

from .database.postgres.database import get_db_ctx
from .database.postgres import models
from .paths import PROJECT_ROOT

load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=True)

_embedding_model: Any | None = None


def _get_embedding_model() -> Any:
    global _embedding_model

    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer

        _embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    return _embedding_model

chromadb_api_key = os.getenv("CHROMADB_API_KEY")
tenant_key = os.getenv("CHROMADB_TENANT")
database_key = os.getenv("CHROMADB_DATABASE")
COLLECTION_NAME = "resolved_tickets"
HISTORY_COLLECTION_NAME = "resolved_ticket_history"


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DRIFT_ALERT_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60
SIMILARITY_THRESHOLD = 0.90
QUERY_RESULT_LIMIT = 5

_redis: Redis | None = None


def configure_redis(client: Redis) -> None:
    """Register the application Redis client during FastAPI startup."""
    global _redis
    _redis = client


def _client() -> Redis:
    if _redis is None:
        raise RuntimeError(
            "Redis has not been initialized. Start the FastAPI app first."
        )
    return _redis


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Cannot serialize {type(value).__name__}")


def _coerce_ticket_id(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _ticket_payload(ticket: models.Tickets) -> dict[str, Any]:
    owner = ticket.owner
    user_payload = None
    if owner is not None:
        user_payload = {
            "id": owner.id,
            "email": owner.email,
            "name": getattr(owner, "name", None),
            "business_name": getattr(owner, "business_name", None),
            "account_tier": owner.account_tier,
        }

    return {
        "id": ticket.id,
        "ticket_id": ticket.id,
        "thread_id": ticket.thread_id,
        "user_id": ticket.user_id,
        "subject": ticket.subject,
        "body": ticket.body,
        "unified_ticket": ticket.unified_ticket,
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
        "ai_draft": ticket.ai_draft,
        "human_decision": ticket.human_decision,
        "human_edited_text": ticket.human_edited_text,
        "final_response_text": ticket.final_response_text,
        "user_rating": ticket.user_rating,
        "user_feedback_comment": ticket.user_feedback_comment,
        "resolved_by": ticket.resolved_by,
        "troubleshooting_steps": ticket.troubleshooting_steps or [],
        "solution": ticket.solution,
        "root_cause": ticket.root_cause,
        "image_url": ticket.image_url,
        "latency": ticket.latency,
        "initial_latency": ticket.initial_latency,
        "total_latency": ticket.total_latency,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "user": user_payload,
    }


def _hydrate_cache_match(
    *,
    ticket_id: int | None,
    similarity_score: float,
    matched_doc_text: str,
    metadata_payload: dict[str, Any],
    source_collection: str,
) -> dict[str, Any]:
    matched_ticket_payload: dict[str, Any] | None = None

    if ticket_id is not None:
        with get_db_ctx() as db:
            ticket = (
                db.query(models.Tickets)
                .filter(models.Tickets.id == ticket_id)
                .first()
            )
            if ticket is not None:
                matched_ticket_payload = _ticket_payload(ticket)

    resolution_text = (
        (matched_ticket_payload or {}).get("final_response_text")
        or matched_doc_text
    )

    payload: dict[str, Any] = {
        "cache_hit": True,
        "is_cache_hit": True,
        "matched_ticket_id": ticket_id,
        "ticket_id": ticket_id,
        "similarity_score": round(similarity_score, 4),
        "matched_resolution_text": resolution_text,
        "resolution": resolution_text,
        "content": matched_doc_text,
        "department": (
            (matched_ticket_payload or {}).get("department")
            or str(metadata_payload.get("department", "general"))
        ),
        "tags": (
            (matched_ticket_payload or {}).get("tags")
            or [
                tag.strip()
                for tag in str(metadata_payload.get("tags", "")).split(",")
                if tag.strip()
            ]
        ),
        "source_collection": source_collection,
        "matched_ticket": matched_ticket_payload,
        "semantic_cache": {
            "cache_hit": True,
            "matched_ticket_id": ticket_id,
            "similarity_score": round(similarity_score, 4),
            "resolution": resolution_text,
            "department": (
                (matched_ticket_payload or {}).get("department")
                or str(metadata_payload.get("department", "general"))
            ),
            "tags": (
                (matched_ticket_payload or {}).get("tags")
                or [
                    tag.strip()
                    for tag in str(metadata_payload.get("tags", "")).split(",")
                    if tag.strip()
                ]
            ),
            "source_collection": source_collection,
        },
    }

    if matched_ticket_payload is not None:
        payload["matched_ticket"] = matched_ticket_payload

    return payload


def _query_collection(
    collection: Any,
    *,
    query_vector: list[float],
    threshold: float,
    source_collection: str,
    where: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    query_kwargs: dict[str, Any] = {
        "query_embeddings": [query_vector],
        "n_results": QUERY_RESULT_LIMIT,
    }
    if where is not None:
        query_kwargs["where"] = where

    results = collection.query(**query_kwargs)

    documents = results.get("documents") or []
    metadatas = results.get("metadatas") or []
    distances = results.get("distances") or []

    candidates: list[dict[str, Any]] = []

    for index, documents_for_query in enumerate(documents):
        metadatas_for_query = metadatas[index] if index < len(metadatas) else []
        distances_for_query = distances[index] if index < len(distances) else []

        for result_index, document_text in enumerate(documents_for_query or []):
            if not document_text:
                continue

            metadata_payload = (
                metadatas_for_query[result_index]
                if result_index < len(metadatas_for_query)
                else {}
            ) or {}
            distance_value = (
                float(distances_for_query[result_index])
                if result_index < len(distances_for_query)
                else 1.0
            )
            similarity_score = max(0.0, 1.0 - distance_value)

            if similarity_score < threshold:
                continue

            candidates.append(
                {
                    "similarity_score": similarity_score,
                    "document_text": document_text,
                    "metadata": metadata_payload,
                    "ticket_id": _coerce_ticket_id(
                        metadata_payload.get("ticket_id")
                    ),
                    "source_collection": source_collection,
                }
            )

    return candidates


async def get_global_semantic_cache(
    query_text: str,
    threshold: float = SIMILARITY_THRESHOLD,
) -> dict[str, Any] | None:
    """Find a semantically similar resolved ticket across ChurnDesk's collection.

    Connects to ChromaDB cloud instances using tenant metadata.
    """
   
    client = chromadb.CloudClient(
        api_key=chromadb_api_key, 
        tenant=tenant_key, 
        database=database_key
    )
   
    query_embedding = _get_embedding_model().encode(
        [query_text],
        show_progress_bar=False,
    )[0]
    query_vector = query_embedding.tolist()
    resolved_collection = client.get_or_create_collection(name=COLLECTION_NAME)
    history_collection = client.get_or_create_collection(
        name=HISTORY_COLLECTION_NAME
    )

    candidates = []
    candidates.extend(
        _query_collection(
            resolved_collection,
            query_vector=query_vector,
            threshold=threshold,
            source_collection=COLLECTION_NAME,
            where={"data_type": "resolved_ticket"},
        )
    )
    candidates.extend(
        _query_collection(
            history_collection,
            query_vector=query_vector,
            threshold=threshold,
            source_collection=HISTORY_COLLECTION_NAME,
        )
    )

    if not candidates:
        return None

    best_match = max(candidates, key=lambda item: item["similarity_score"])
    return _hydrate_cache_match(
        ticket_id=best_match["ticket_id"],
        similarity_score=best_match["similarity_score"],
        matched_doc_text=best_match["document_text"],
        metadata_payload=best_match["metadata"],
        source_collection=best_match["source_collection"],
    )


async def cache_drift_alert(alert: dict[str, Any]) -> None:
    """Stores telemetry metrics in fast key-value memory layer."""
    await _client().setex(
        "drift:documentation:latest",
        DRIFT_ALERT_CACHE_TTL_SECONDS,
        json.dumps(alert, default=_json_default),
    )


async def get_latest_drift_alert() -> dict[str, Any] | None:
    """Retrieves current drift status updates from fast telemetry layers."""
    cached = await _client().get("drift:documentation:latest")
    return json.loads(cached) if cached else None
