from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings, resolve_postgres_url
from contextlib import contextmanager


SQLALCHEMY_DATABASE_URL = resolve_postgres_url(settings.DATABASE_URL)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(bind=engine, autoflush=False)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_ctx():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
