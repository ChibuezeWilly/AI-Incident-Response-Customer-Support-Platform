from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path
from typing import Any

from arq import create_pool
from arq.connections import RedisSettings
from dotenv import load_dotenv
from langfuse.langchain import CallbackHandler
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from sqlalchemy.orm import joinedload

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from app.agents.graph import initialize_graph, get_graph
from ...database.postgres.database import get_db_ctx
from ...database.postgres import models
from .ticket_payloads import build_recovery_graph_state
from app.database.postgres.config import (
    settings,
    resolve_postgres_url,
    resolve_redis_url,
)

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )

def _build_arq_settings() -> RedisSettings:
    """Create a more durable Redis config for worker reconnects."""
    arq_settings = RedisSettings.from_dsn(resolve_redis_url(settings.REDIS_URL))
    arq_settings.conn_timeout = 5
    arq_settings.conn_retries = 10
    arq_settings.conn_retry_delay = 2
    arq_settings.retry_on_timeout = True
    arq_settings.max_connections = 20
    return arq_settings


async def run_langgraph_task(
    ctx: dict[str, Any],
    ticket_id: str,
    input_state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """ARQ Task that executes the LangGraph workflow."""

    graph = get_graph()
    langfuse_handler = CallbackHandler()

    if input_state is None:
        with get_db_ctx() as db:
            ticket = (
                db.query(models.Tickets)
                .options(joinedload(models.Tickets.owner))
                .filter(models.Tickets.id == int(ticket_id))
                .first()
            )

        if ticket is None:
            raise ValueError(f"Ticket #{ticket_id} was not found in the database.")

        input_state = build_recovery_graph_state(ticket)

    thread_id = f"ticket_thread_{ticket_id}"
    config = {
        "configurable": {"thread_id": thread_id},
        "callbacks": [langfuse_handler],
        "metadata": {
            "langfuse_user_id": str(input_state.get("user_id")),
            "langfuse_session_id": thread_id,
            "langfuse_tags": ["ticket", "incident-response"],
        },
    }

    try:
        final_state = await graph.ainvoke(input_state, config=config)

        return final_state
    finally:
        try:
            if hasattr(langfuse_handler, "flush"):
                langfuse_handler.flush()
            elif hasattr(langfuse_handler, "client") and hasattr(
                langfuse_handler.client,
                "flush",
            ):
                langfuse_handler.client.flush()
        except Exception as exc:
            logger.debug("Langfuse flush failed: %s", exc)


async def recover_unfinished_tickets(ctx: dict[str, Any]) -> None:
    """
    Requeue any queued tickets that never reached LangGraph.

    Deterministic job IDs prevent duplicate work if a queued ticket is
    discovered more than once.
    """
    with get_db_ctx() as db:
        queued_tickets = (
            db.query(models.Tickets)
            .options(joinedload(models.Tickets.owner))
            .filter(models.Tickets.status == "QUEUED")
            .order_by(models.Tickets.created_at.asc())
            .all()
        )

    if not queued_tickets:
        return

    arq_redis = await create_pool(_build_arq_settings())
    requeued = 0
    skipped = 0

    try:
        for ticket in queued_tickets:
            try:
                recovery_state = build_recovery_graph_state(ticket)
                job = await arq_redis.enqueue_job(
                    "run_langgraph_task",
                    ticket_id=str(ticket.id),
                    input_state=recovery_state,
                    _job_id=f"ticket-{ticket.id}",
                )
                if job is None:
                    skipped += 1
                    continue
                requeued += 1

            except Exception as exc:
                logger.warning(
                    "Failed to requeue ticket %s during worker recovery: %s",
                    ticket.id,
                    exc,
                )
    finally:
        await arq_redis.aclose()

async def startup(ctx: dict[str, Any]) -> None:
    """Open DB connections, pre-load models & compile graph on ARQ worker boot."""

    sanitized_db_url = resolve_postgres_url(settings.DATABASE_URL).replace(
        "postgresql+psycopg://",
        "postgresql://",
    )

    checkpointer_context = AsyncPostgresSaver.from_conn_string(
        sanitized_db_url,
        serde=JsonPlusSerializer(
            allowed_msgpack_modules=[
                ("app.agents.state", "EvaluationResult"),
                ("app.agents.state", "AIDraftResolution"),
            ]
        ),
    )
    checkpointer = await checkpointer_context.__aenter__()
    await checkpointer.setup()

    ctx["checkpointer_context"] = checkpointer_context
    initialize_graph(checkpointer)

    await recover_unfinished_tickets(ctx)


async def shutdown(ctx: dict[str, Any]) -> None:
    """Clean up DB connections when the worker stops."""
    checkpointer_context = ctx.get("checkpointer_context")
    if checkpointer_context:
        await checkpointer_context.__aexit__(None, None, None)


class WorkerSettings:
    """Settings loaded by ARQ CLI."""
    functions = [run_langgraph_task]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _build_arq_settings()
    max_jobs = 15
