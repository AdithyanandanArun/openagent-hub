from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.knowledge_source import KnowledgeSource
from app.services.auth_service import get_current_user
from app.services.knowledge_service import create_attachment_source, start_indexing_job, search_knowledge

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
security = HTTPBearer()


class AttachmentSourceCreate(BaseModel):
    attachment_id: UUID
    project_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None


class KnowledgeSearch(BaseModel):
    query: str
    project_id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    limit: int = 6


def _current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    return get_current_user(db, credentials.credentials)


def _serialize(source: KnowledgeSource) -> dict:
    return {"id": str(source.id), "name": source.name, "kind": source.kind, "status": source.status, "error": source.error, "chunk_count": source.chunk_count, "project_id": str(source.project_id) if source.project_id else None, "conversation_id": str(source.conversation_id) if source.conversation_id else None}


@router.get("")
def list_sources(project_id: Optional[UUID] = None, conversation_id: Optional[UUID] = None, user=Depends(_current_user), db: Session = Depends(get_db)):
    query = db.query(KnowledgeSource).filter(KnowledgeSource.user_id == user.id)
    if project_id: query = query.filter(KnowledgeSource.project_id == project_id)
    if conversation_id: query = query.filter(KnowledgeSource.conversation_id == conversation_id)
    return [_serialize(source) for source in query.order_by(KnowledgeSource.created_at.desc()).all()]


@router.post("/attachments", status_code=201)
async def add_attachment_source(data: AttachmentSourceCreate, user=Depends(_current_user), db: Session = Depends(get_db)):
    source = create_attachment_source(db, user.id, data.attachment_id, data.project_id, data.conversation_id)
    try:
        await start_indexing_job(source.id)
    except Exception as exc:
        source.status, source.error = "failed", str(exc)[:500]
        db.commit()
    return _serialize(source)


@router.post("/search")
async def search(data: KnowledgeSearch, user=Depends(_current_user), db: Session = Depends(get_db)):
    return await search_knowledge(db, user.id, data.query.strip(), data.project_id, data.conversation_id, max(1, min(data.limit, 12)))


@router.delete("/{source_id}", status_code=204)
def delete_source(source_id: UUID, user=Depends(_current_user), db: Session = Depends(get_db)):
    source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id, KnowledgeSource.user_id == user.id).first()
    if source:
        db.delete(source); db.commit()
