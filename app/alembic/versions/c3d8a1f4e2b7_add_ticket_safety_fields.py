"""Persist Llama Guard safety decisions on tickets."""

from alembic import op
import sqlalchemy as sa


revision = "c3d8a1f4e2b7"
down_revision = "82aac3f3b9bf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("ticket_safe", sa.Boolean(), nullable=True))
    op.add_column(
        "tickets",
        sa.Column("ticket_check_message", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tickets", "ticket_check_message")
    op.drop_column("tickets", "ticket_safe")
