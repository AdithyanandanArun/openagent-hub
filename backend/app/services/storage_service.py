"""Attachment storage with local-development and Google Cloud Storage backends.

The API owns all reads and writes. Objects are never public; database ownership
checks remain the authorization boundary before a key reaches this service.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import HTTPException

from app.core.config import settings

LOCAL_UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))


def _key(filename: str) -> str:
    suffix = Path(filename or "").suffix[:16]
    return f"attachments/{uuid.uuid4()}{suffix}"


def _local_path(key: str) -> Path:
    # Legacy rows contain an absolute path. New local rows contain a relative
    # object key. Both must remain rooted inside the configured upload directory.
    root = LOCAL_UPLOAD_DIR.resolve()
    path = Path(key) if os.path.isabs(key) else root / key
    resolved = path.resolve()
    if os.path.commonpath((str(root), str(resolved))) != str(root):
        raise ValueError("Attachment key escapes local storage root")
    return resolved


def _gcs_bucket():
    if not settings.GCS_BUCKET:
        raise RuntimeError("GCS_BUCKET is required when STORAGE_BACKEND is gcs")
    try:
        from google.cloud import storage
    except ImportError as exc:  # clearer than a generic server error on a bad image
        raise RuntimeError("google-cloud-storage is not installed") from exc
    return storage.Client(project=settings.GOOGLE_CLOUD_PROJECT or None).bucket(settings.GCS_BUCKET)


def put_attachment(content: bytes, filename: str, content_type: str) -> str:
    key = _key(filename)
    if settings.STORAGE_BACKEND == "local":
        path = _local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return key
    if settings.STORAGE_BACKEND == "gcs":
        blob = _gcs_bucket().blob(key)
        blob.upload_from_string(content, content_type=content_type)
        return key
    raise RuntimeError(f"Unsupported STORAGE_BACKEND: {settings.STORAGE_BACKEND}")


def get_attachment(key: str) -> bytes:
    if settings.STORAGE_BACKEND == "local":
        return _local_path(key).read_bytes()
    if settings.STORAGE_BACKEND == "gcs":
        return _gcs_bucket().blob(key).download_as_bytes()
    raise RuntimeError(f"Unsupported STORAGE_BACKEND: {settings.STORAGE_BACKEND}")


def delete_attachment(key: str | None) -> None:
    if not key:
        return
    try:
        if settings.STORAGE_BACKEND == "local":
            _local_path(key).unlink(missing_ok=True)
        elif settings.STORAGE_BACKEND == "gcs":
            _gcs_bucket().blob(key).delete()
        else:
            raise RuntimeError(f"Unsupported STORAGE_BACKEND: {settings.STORAGE_BACKEND}")
    except Exception as exc:  # noqa: BLE001
        # Deletion must be best-effort so a stale object cannot block account
        # deletion. Object lifecycle rules provide the final cleanup guarantee.
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Unable to remove stored attachment") from exc
