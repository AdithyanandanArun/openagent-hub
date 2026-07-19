from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.feedback import Feedback
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/feedback", tags=["feedback"])
security = HTTPBearer()


class FeedbackCreate(BaseModel):
    category: Literal["feedback", "bug", "connector"] = "feedback"
    message: str = Field(min_length=3, max_length=4000)
    include_diagnostics: bool = False
    app_version: Optional[str] = Field(default=None, max_length=100)
    screen: Optional[str] = Field(default=None, max_length=100)
    status_code: Optional[int] = None


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


@router.post("", status_code=201)
def create_feedback(data: FeedbackCreate, user=Depends(_current_user), db: Session = Depends(get_db)):
    message = data.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Feedback cannot be empty")
    feedback = Feedback(
        user_id=user.id,
        category=data.category,
        message=message,
        include_diagnostics=data.include_diagnostics,
        app_version=data.app_version,
        screen=data.screen,
        status_code=data.status_code,
    )
    db.add(feedback)
    db.commit()
    return {"id": str(feedback.id), "message": "Thanks for helping improve OpenAgent Hub."}
