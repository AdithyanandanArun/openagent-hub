from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.knowledge_source import KnowledgeSource
from app.services.storage_service import get_attachment


def create_attachment_source(db: Session, user_id: UUID, attachment_id: UUID, project_id: UUID | None = None, conversation_id: UUID | None = None) -> KnowledgeSource:
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.user_id == user_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    source = KnowledgeSource(user_id=user_id, project_id=project_id, conversation_id=conversation_id, attachment_id=attachment.id, kind="attachment", name=attachment.filename, content_type=attachment.content_type, status="queued")
    db.add(source); db.commit(); db.refresh(source)
    return source


def extract_source_text(db: Session, source: KnowledgeSource) -> str:
    if not source.attachment_id:
        raise RuntimeError("Only attachment sources are supported by the first worker")
    attachment = db.get(Attachment, source.attachment_id)
    if not attachment:
        raise RuntimeError("Attachment was removed")
    data = get_attachment(attachment.storage_key or attachment.file_path)
    if attachment.content_type == "application/pdf":
        import fitz
        document = fitz.open(stream=data, filetype="pdf")
        text = "\n".join(page.get_text() for page in document)
        document.close()
        return text
    if attachment.content_type.startswith("text/") or attachment.content_type == "application/json":
        return data.decode("utf-8", errors="replace")
    raise RuntimeError(f"{attachment.content_type} needs the visual worker, which is not enabled yet")


def chunk_text(text: str, size: int = 1400, overlap: int = 200) -> list[str]:
    text = " ".join(text.split())
    chunks, start = [], 0
    while start < len(text):
        end = min(len(text), start + size)
        if end < len(text):
            boundary = text.rfind(" ", start, end)
            if boundary > start + size // 2: end = boundary
        chunk = text[start:end].strip()
        if chunk: chunks.append(chunk)
        start = max(end - overlap, start + 1)
    return chunks
