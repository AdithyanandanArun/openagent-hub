import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True, index=True)
    attachment_id = Column(UUID(as_uuid=True), ForeignKey("attachments.id", ondelete="SET NULL"), nullable=True)
    kind = Column(String, nullable=False)  # attachment | web_snapshot
    name = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    url = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="queued")  # queued | indexing | ready | failed | cancelled
    error = Column(String, nullable=True)
    chunk_count = Column(Integer, nullable=False, default=0)
    # Store the embedding space used for this source. Automatic routing can
    # legitimately pick different models over time; pgvector comparisons must
    # always use a query vector produced by the same embedding model.
    embedding_provider_id = Column(UUID(as_uuid=True), ForeignKey("providers.id", ondelete="SET NULL"), nullable=True)
    embedding_model = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
