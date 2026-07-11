from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.models.attachment import Attachment
from app.services.storage_service import put_attachment, get_attachment, delete_attachment

router = APIRouter(prefix="/attachments", tags=["attachments"])
security = HTTPBearer()
ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "text/plain", "text/markdown", "text/csv",
    "application/json",
}
MAX_SIZE = 20 * 1024 * 1024  # 20 MB


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


@router.post("")
async def upload(
    file: UploadFile = File(...),
    user=Depends(_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20 MB)")

    try:
        key = put_attachment(content, file.filename or "attachment", file.content_type)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail="Unable to store attachment") from exc

    try:
        attachment = Attachment(
            user_id=user.id,
            filename=file.filename or "attachment",
            content_type=file.content_type,
            storage_key=key,
            # Keep a non-null legacy field until it can be removed in a later
            # backwards-incompatible schema cleanup.
            file_path=key,
            size=len(content),
        )
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
    except Exception:
        db.rollback()
        delete_attachment(key)
        raise

    return {
        "id": str(attachment.id),
        "filename": attachment.filename,
        "content_type": attachment.content_type,
        "size": attachment.size,
    }


@router.get("/{attachment_id}")
def download(attachment_id: str, user=Depends(_current_user), db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.user_id == user.id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        content = get_attachment(att.storage_key or att.file_path)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=404, detail="Attachment content is unavailable") from exc
    return Response(
        content=content,
        media_type=att.content_type,
        headers={"Content-Disposition": f'attachment; filename="{att.filename.replace(chr(34), "")}"'},
    )
