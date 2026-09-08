from contextlib import asynccontextmanager
import asyncio
import os
from pathlib import Path
import shlex
import subprocess
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis, ConnectionPool
from arq import create_pool
from arq.connections import RedisSettings
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# 1. Absolute imports from root
from api.routers import (
    admin,
    admin_fetch_tickets,
    authentication,
    internal_admin,
    models,
    tickets,
    users,
)
from database.postgres.config import (
    settings,
    resolve_postgres_url,
    resolve_redis_url,
)
from api.background_tasks.drift_detection import node_drift_alert
from agents.graph import initialize_graph
from cache import configure_redis

scheduler = AsyncIOScheduler()


def _build_arq_settings() -> RedisSettings:
    """Create a resilient ARQ Redis config for local and Docker runs."""
    arq_settings = RedisSettings.from_dsn(resolve_redis_url(settings.REDIS_URL))
    arq_settings.conn_timeout = 5
    arq_settings.conn_retries = 10
    arq_settings.conn_retry_delay = 2
    arq_settings.retry_on_timeout = True
    arq_settings.max_connections = 20
    return arq_settings


def _start_arq_worker_process() -> subprocess.Popen[bytes] | None:
    """Launch the ARQ worker as a sibling process for local FastAPI runs."""
    if not settings.ARQ_AUTOSTART_WORKER:
        return None

    if os.environ.get(settings.ARQ_WORKER_BOOT_ENV) == "1":
        return None

    env = os.environ.copy()
    env[settings.ARQ_WORKER_BOOT_ENV] = "1"

    command = shlex.split(settings.ARQ_WORKER_COMMAND)
    if command[:2] == ["python", "-m"]:
        command[0] = sys.executable
    elif command and command[0] == "python":
        command[0] = sys.executable

    return subprocess.Popen(
        command,
        env=env,
        cwd=str(Path(__file__).resolve().parent),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_client = None
    pool = None
    arq_redis = None
    checkpointer_context = None
    redis_startup_task = None
    database_startup_task = None
    app.state.arq_redis = None
    app.state.arq_worker_process = None

    async def initialize_redis_services():
        nonlocal redis_client, pool, arq_redis
        try:
            pool = ConnectionPool.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                socket_keepalive=True,
                health_check_interval=30,
                retry_on_timeout=True,
            )
            redis_client = Redis(connection_pool=pool)
            await redis_client.ping()
            configure_redis(redis_client)
            arq_redis = await create_pool(_build_arq_settings())
            app.state.arq_redis = arq_redis
            app.state.arq_worker_process = _start_arq_worker_process()
        except Exception:
            redis_client = None
            pool = None
            arq_redis = None

    redis_startup_task = asyncio.create_task(initialize_redis_services())

    async def initialize_database_services():
        nonlocal checkpointer_context
        try:
            sanitized_db_url = resolve_postgres_url(
                settings.DATABASE_URL
            ).replace(
                "postgresql+psycopg://",
                "postgresql://",
            )

            if sanitized_db_url.startswith("postgresql"):
                checkpointer_context = AsyncPostgresSaver.from_conn_string(
                    sanitized_db_url,
                    serde=JsonPlusSerializer(
                        allowed_msgpack_modules=[
                            ("agents.state", "EvaluationResult"),
                            ("agents.state", "AIDraftResolution"),
                        ]
                    ),
                )
                checkpointer = await checkpointer_context.__aenter__()
                await checkpointer.setup()
                initialize_graph(checkpointer)

                scheduler.add_job(
                    node_drift_alert,
                    trigger=IntervalTrigger(days=7),
                    id="daily_drift_check",
                    replace_existing=True,
                )
                scheduler.start()
        except Exception:
            checkpointer_context = None

    # Non-blocking async background task so Render port detection passes instantly
    database_startup_task = asyncio.create_task(initialize_database_services())

    try:
        yield
    finally:
        if redis_startup_task is not None and not redis_startup_task.done():
            redis_startup_task.cancel()
            await asyncio.gather(redis_startup_task, return_exceptions=True)
        if database_startup_task is not None and not database_startup_task.done():
            database_startup_task.cancel()
            await asyncio.gather(
                database_startup_task, return_exceptions=True
            )
        if scheduler.running:
            scheduler.shutdown(wait=False)
        if checkpointer_context is not None:
            await checkpointer_context.__aexit__(None, None, None)
        if arq_redis is not None:
            await arq_redis.aclose()
        arq_worker_process = getattr(app.state, "arq_worker_process", None)
        if arq_worker_process is not None and arq_worker_process.poll() is None:
            arq_worker_process.terminate()
            try:
                arq_worker_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                arq_worker_process.kill()
        if redis_client is not None:
            await redis_client.aclose()
        if pool is not None:
            await pool.aclose()


app = FastAPI(lifespan=lifespan)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-incident-response-customer-suppo.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route Registrations
app.include_router(models.router)
app.include_router(users.router)
app.include_router(authentication.router)
app.include_router(tickets.router)
app.include_router(admin_fetch_tickets.router)
app.include_router(admin.router)
app.include_router(internal_admin.router)
