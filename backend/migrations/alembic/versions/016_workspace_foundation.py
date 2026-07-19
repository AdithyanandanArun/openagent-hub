"""workspace preferences and beta feedback

Revision ID: 016
Revises: 015
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "016"
down_revision = "015"


def upgrade():
    op.create_table(
        "user_preferences",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("embedding_provider_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("providers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("embedding_model", sa.String(), nullable=True),
        sa.Column("onboarding_completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_table(
        "feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(), nullable=False, server_default="feedback"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("include_diagnostics", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("app_version", sa.String(), nullable=True),
        sa.Column("screen", sa.String(), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_feedback_user_id", "feedback", ["user_id"])
    op.create_index("ix_feedback_created_at", "feedback", ["created_at"])


def downgrade():
    op.drop_index("ix_feedback_created_at", table_name="feedback")
    op.drop_index("ix_feedback_user_id", table_name="feedback")
    op.drop_table("feedback")
    op.drop_table("user_preferences")
