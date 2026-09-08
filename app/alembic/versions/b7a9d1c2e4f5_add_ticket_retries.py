"""Persist LangGraph RAG retry counts with each ticket."""

from alembic import op
import sqlalchemy as sa


revision = "b7a9d1c2e4f5"
down_revision = "02f92f035afd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tickets",
        sa.Column("retries", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("tickets", "retries")
