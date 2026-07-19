"""Cloud Run Job entrypoint for private knowledge indexing."""
import os
from uuid import UUID

from app.core.database import SessionLocal
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_source import KnowledgeSource
from app.services.knowledge_service import chunk_text, extract_source_text


def main() -> None:
    source_id = os.environ.get("KNOWLEDGE_SOURCE_ID")
    if not source_id:
        raise RuntimeError("KNOWLEDGE_SOURCE_ID is required")
    with SessionLocal() as db:
        source = db.get(KnowledgeSource, UUID(source_id))
        if not source or source.status == "cancelled": return
        source.status = "indexing"; db.commit()
        try:
            text = extract_source_text(db, source)
            chunks = chunk_text(text)
            db.query(KnowledgeChunk).filter(KnowledgeChunk.source_id == source.id).delete()
            for ordinal, content in enumerate(chunks):
                db.add(KnowledgeChunk(source_id=source.id, user_id=source.user_id, ordinal=ordinal, content=content))
            source.chunk_count, source.status, source.error = len(chunks), "ready", None
            db.commit()
        except Exception as exc:
            source.status, source.error = "failed", str(exc)[:500]; db.commit(); raise


if __name__ == "__main__": main()
