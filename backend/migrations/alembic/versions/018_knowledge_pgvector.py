"""private knowledge sources and pgvector retrieval

Revision ID: 018
Revises: 017
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "018"
down_revision = "017"


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "knowledge_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("attachment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attachments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", sa.String(), nullable=False), sa.Column("name", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=True), sa.Column("url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="queued"), sa.Column("error", sa.String(), nullable=True),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_knowledge_sources_user_id", "knowledge_sources", ["user_id"])
    op.create_index("ix_knowledge_sources_project_id", "knowledge_sources", ["project_id"])
    op.create_index("ix_knowledge_sources_conversation_id", "knowledge_sources", ["conversation_id"])
    op.create_table(
        "knowledge_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False), sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.execute("ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector USING embedding::vector")
    op.create_index("ix_knowledge_chunks_source_id", "knowledge_chunks", ["source_id"])
    op.create_index("ix_knowledge_chunks_user_id", "knowledge_chunks", ["user_id"])


def downgrade():
    op.drop_index("ix_knowledge_chunks_user_id", table_name="knowledge_chunks")
    op.drop_index("ix_knowledge_chunks_source_id", table_name="knowledge_chunks")
    op.drop_table("knowledge_chunks")
    op.drop_index("ix_knowledge_sources_conversation_id", table_name="knowledge_sources")
    op.drop_index("ix_knowledge_sources_project_id", table_name="knowledge_sources")
    op.drop_index("ix_knowledge_sources_user_id", table_name="knowledge_sources")
    op.drop_table("knowledge_sources")
