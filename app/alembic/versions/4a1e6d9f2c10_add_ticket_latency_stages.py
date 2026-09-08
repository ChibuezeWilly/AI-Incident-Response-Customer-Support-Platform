"""add ticket latency stages

Revision ID: 4a1e6d9f2c10
Revises: 91806808b4bd
"""
from alembic import op
import sqlalchemy as sa

revision = "4a1e6d9f2c10"
down_revision = "91806808b4bd"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tickets", sa.Column("initial_latency", sa.Float(), nullable=True))
    op.add_column("tickets", sa.Column("total_latency", sa.Float(), nullable=True))


def downgrade():
    op.drop_column("tickets", "total_latency")
    op.drop_column("tickets", "initial_latency")
