from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    ForeignKey,
    TIMESTAMP,
    VARCHAR,
    text,
)
from .database import Base
from sqlalchemy.sql.expression import text
from sqlalchemy.sql.sqltypes import TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


class User(Base):
    __tablename__ = "accounts"

    id = Column(Integer, nullable=False, primary_key=True)
    business_name = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    account_tier = Column(String, nullable=False)
    sla = Column(Integer, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
    incidents = relationship("Tickets", back_populates="owner")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, nullable=False, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    role = Column(String, server_default="Admin", default="Admin", nullable=False)


class Tickets(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, nullable=False)
    thread_id = Column(String, unique=True, index=True, nullable=True)
    user_id = Column(
        Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True
    )
    account_tier = Column(String, default="Standard", nullable=False)

    # 2. Ingestion & Vision Phase (Raw Data)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    ticket_safe = Column(Boolean, nullable=True)
    ticket_check_message = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    unified_ticket = Column(String, nullable=True)
    telemetry_data = Column(JSONB, nullable=True)

    department = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    priority = Column(String, nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    extracted_keywords = Column(ARRAY(String), nullable=True)
    search_query = Column(String, nullable=True)
    retrieved_docs = Column(JSONB, nullable=True)
    retries = Column(Integer, nullable=False, default=0, server_default="0")

    eval_confidence = Column(Float, nullable=True)
    has_hallucinations = Column(Boolean, nullable=True)
    grounding_source_ids = Column(ARRAY(String), nullable=True)
    eval_feedback = Column(String, nullable=True)

    ai_draft = Column(JSONB, nullable=True)
    human_decision = Column(String, nullable=True)
    human_edited_text = Column(String, nullable=True)
    final_response_text = Column(String, nullable=True)

    status = Column(String, default="QUEUED", nullable=False)
    
    email_sent = Column(Boolean, default=False, nullable=False)
    message_id = Column(String, nullable=True)
    latency = Column(Float, nullable=True)

    initial_latency = Column(Float, nullable=True)
    total_latency = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=text("now()"),
    )

    # Relationships
    owner = relationship("User", back_populates="incidents")
    
    # reward signal
    user_rating = Column(Integer, nullable=True)
    user_feedback_comment = Column(String, nullable=True)
    
    # engineer solution
    resolved_by = Column(String, nullable=True)
    troubleshooting_steps = Column(ARRAY(String), nullable=True)
    solution = Column(String, nullable=True)
    root_cause = Column(String, nullable=True)

        

class TicketDiffs(Base):
    __tablename__ = "ticket_diffs"

    id = Column(Integer, nullable=False, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=True)
    agent_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=True)
    department = Column(String, nullable=True)
    change_type = Column(VARCHAR, nullable=True)
    target_entity = Column(VARCHAR, nullable=True)
    old_value = Column(VARCHAR, nullable=True)
    new_value = Column(VARCHAR, nullable=True)
    factual_correction = Column(VARCHAR, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
