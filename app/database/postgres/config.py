import os
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    HF_TOKEN: str
    META_KEY: str
    QWEN_KEY: str
    GOOGLE_AI_KEY: str
    GROQ_KEY: str
    REDIS_URL: str 
    CHROMADB_API_KEY: str
    CHROMADB_TENANT: str
    CHROMADB_DATABASE: str
    AGENTMAIL_API_KEY: str
    AGENT_DISPLAY_NAME: str
    JIRA_API_KEY: str
    JIRA_EMAIL: str
    JIRA_BASE_URL: str
    JIRA_PROJECT_KEY: str
    LANGFUSE_SECRET_KEY: str
    LANGFUSE_PUBLIC_KEY: str
    LANGFUSE_BASE_URL: str
    ARQ_AUTOSTART_WORKER: bool = True
    ARQ_WORKER_COMMAND: str = "python -m arq app.api.background_tasks.arq_worker.WorkerSettings"
    ARQ_WORKER_BOOT_ENV: str = "ARQ_WORKER_BOOTED"

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env", BASE_DIR / "app" / ".env"),
        extra="ignore",
    )


settings = Settings()


def resolve_redis_url(raw_url: str) -> str:
    """Use localhost when a Docker service hostname is configured outside Docker."""
    parsed = urlparse(raw_url)
    if parsed.hostname == "redis" and not os.path.exists("/.dockerenv"):
        netloc = "localhost"
        if parsed.port:
            netloc = f"{netloc}:{parsed.port}"
        if parsed.username or parsed.password:
            auth = parsed.username or ""
            if parsed.password:
                auth = f"{auth}:{parsed.password}"
            netloc = f"{auth}@{netloc}"
        return urlunparse(parsed._replace(netloc=netloc))

    return raw_url


def resolve_postgres_url(raw_url: str) -> str:
    """Use localhost when a Docker Postgres hostname is configured outside Docker."""
    parsed = urlparse(raw_url)
    if parsed.hostname in {"postgres", "db", "postgresql"} and not os.path.exists(
        "/.dockerenv"
    ):
        netloc = "localhost"
        if parsed.port:
            netloc = f"{netloc}:{parsed.port}"
        if parsed.username or parsed.password:
            auth = parsed.username or ""
            if parsed.password:
                auth = f"{auth}:{parsed.password}"
            netloc = f"{auth}@{netloc}"
        return urlunparse(parsed._replace(netloc=netloc))

    return raw_url
