from __future__ import annotations

from uuid import UUID
import asyncio

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.knowledge_source import KnowledgeSource
from app.services.storage_service import get_attachment
from app.core.config import settings
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_source import KnowledgeSource
from app.models.user_preference import UserPreference
from app.services.openai_proxy import embeddings


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


async def start_indexing_job(source_id: UUID) -> None:
    """Ask Cloud Run to execute the zero-idle worker with one source id."""
    if not settings.is_production:
        return
    if not settings.GOOGLE_CLOUD_PROJECT:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is required for knowledge indexing")
    import google.auth
    from google.auth.transport.requests import Request
    import httpx
    credentials, _ = await asyncio.to_thread(google.auth.default, scopes=["https://www.googleapis.com/auth/cloud-platform"])
    await asyncio.to_thread(credentials.refresh, Request())
    endpoint = f"https://run.googleapis.com/v2/projects/{settings.GOOGLE_CLOUD_PROJECT}/locations/{settings.GOOGLE_CLOUD_REGION}/jobs/{settings.KNOWLEDGE_WORKER_JOB}:run"
    payload = {"overrides": {"containerOverrides": [{"env": [{"name": "KNOWLEDGE_SOURCE_ID", "value": str(source_id)}]}]}}
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(endpoint, headers={"Authorization": f"Bearer {credentials.token}"}, json=payload)
    if response.status_code >= 300:
        raise RuntimeError(f"Could not start knowledge worker: HTTP {response.status_code}")


async def search_knowledge(db: Session, user_id: UUID, query: str, project_id: UUID | None = None, conversation_id: UUID | None = None, limit: int = 6) -> list[dict]:
    preference = db.get(UserPreference, user_id)
    if not preference or not preference.embedding_provider_id or not preference.embedding_model:
        raise HTTPException(status_code=400, detail="Choose an embedding provider and model in Settings → Knowledge")
    response = await embeddings(db, user_id, {"model": preference.embedding_model, "input": query}, preferred_provider_id=str(preference.embedding_provider_id))
    vector = (response.get("data") or [{}])[0].get("embedding")
    if not isinstance(vector, list): raise HTTPException(status_code=502, detail="Embedding provider returned an invalid vector")
    query_rows = db.query(KnowledgeChunk, KnowledgeSource, KnowledgeChunk.embedding.cosine_distance(vector).label("distance")).join(KnowledgeSource, KnowledgeChunk.source_id == KnowledgeSource.id).filter(KnowledgeChunk.user_id == user_id, KnowledgeSource.status == "ready")
    if project_id: query_rows = query_rows.filter(KnowledgeSource.project_id == project_id)
    if conversation_id: query_rows = query_rows.filter(KnowledgeSource.conversation_id == conversation_id)
    return [{"source_id": str(source.id), "source_name": source.name, "content": chunk.content, "score": round(1 - float(distance), 4)} for chunk, source, distance in query_rows.order_by("distance").limit(limit).all()]
