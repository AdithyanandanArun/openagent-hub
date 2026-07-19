"""remember the embedding space used by each knowledge source

Revision ID: 021
Revises: 020
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "021"
down_revision = "020"


def upgrade():
    op.add_column(
        "knowledge_sources",
        sa.Column("embedding_provider_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("providers.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("knowledge_sources", sa.Column("embedding_model", sa.String(), nullable=True))
    op.create_index("ix_knowledge_sources_embedding_model", "knowledge_sources", ["user_id", "embedding_model"])


def downgrade():
    op.drop_index("ix_knowledge_sources_embedding_model", table_name="knowledge_sources")
    op.drop_column("knowledge_sources", "embedding_model")
    op.drop_column("knowledge_sources", "embedding_provider_id")
