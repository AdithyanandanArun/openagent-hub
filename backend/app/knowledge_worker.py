"""Cloud Run Job entrypoint for private knowledge indexing."""
import os
import asyncio
from uuid import UUID

from app.core.database import SessionLocal
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_source import KnowledgeSource
from app.models.user_preference import UserPreference
from app.services.knowledge_service import chunk_text, extract_source_text
from app.services.openai_proxy import embeddings


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
            preference = db.get(UserPreference, source.user_id)
            if not preference or not preference.embedding_provider_id:
                raise RuntimeError("Choose an embedding provider in Settings → Knowledge before indexing")
            response = asyncio.run(embeddings(
                db, source.user_id,
                {"model": preference.embedding_model or "auto", "input": chunks},
                preferred_provider_id=str(preference.embedding_provider_id),
            ))
            vectors = [item.get("embedding") for item in response.get("data", [])]
            if len(vectors) != len(chunks) or any(not isinstance(vector, list) for vector in vectors):
                raise RuntimeError("Embedding provider returned an invalid vector response")
            resolved_model = response.get("model")
            resolved_provider_id = response.get("_openagent_provider_id")
            if not isinstance(resolved_model, str) or not resolved_model:
                raise RuntimeError("Embedding router did not return the selected model")
            db.query(KnowledgeChunk).filter(KnowledgeChunk.source_id == source.id).delete()
            for ordinal, (content, vector) in enumerate(zip(chunks, vectors)):
                db.add(KnowledgeChunk(source_id=source.id, user_id=source.user_id, ordinal=ordinal, content=content, embedding=vector))
            source.embedding_model = resolved_model
            source.embedding_provider_id = UUID(resolved_provider_id) if resolved_provider_id else None
            source.chunk_count, source.status, source.error = len(chunks), "ready", None
            db.commit()
        except Exception as exc:
            source.status, source.error = "failed", str(exc)[:500]; db.commit(); raise


if __name__ == "__main__": main()
