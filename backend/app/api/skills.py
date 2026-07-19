from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services import skill_service
from app.schemas.agent import SkillCreate, SkillUpdate, SkillResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/skills", tags=["skills"])
security = HTTPBearer()


class SkillImport(BaseModel):
    skill_md: str = Field(min_length=1, max_length=256 * 1024)


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


@router.get("", response_model=List[SkillResponse])
def list_skills(user=Depends(_current_user), db: Session = Depends(get_db)):
    return skill_service.list_skills(db, user.id)


@router.post("", response_model=SkillResponse, status_code=201)
def create_skill(data: SkillCreate, user=Depends(_current_user), db: Session = Depends(get_db)):
    return skill_service.create_skill(db, user.id, data.model_dump())


@router.patch("/{skill_id}", response_model=SkillResponse)
def update_skill(skill_id: UUID, data: SkillUpdate, user=Depends(_current_user), db: Session = Depends(get_db)):
    return skill_service.update_skill(db, user.id, skill_id, data.model_dump(exclude_none=True))


@router.delete("/{skill_id}", status_code=204)
def delete_skill(skill_id: UUID, user=Depends(_current_user), db: Session = Depends(get_db)):
    skill_service.delete_skill(db, user.id, skill_id)


@router.get("/{skill_id}/export")
def export_skill(skill_id: UUID, user=Depends(_current_user), db: Session = Depends(get_db)):
    skill = skill_service.get_skill(db, user.id, skill_id)
    if skill.is_builtin:
        raise HTTPException(status_code=400, detail="Built-in skills cannot be exported")
    filename = "".join(char if char.isalnum() or char in "-_" else "-" for char in skill.name).strip("-") or "skill"
    return Response(content=skill_service.export_skill_markdown(skill), media_type="text/markdown", headers={"Content-Disposition": f'attachment; filename="{filename}-SKILL.md"'})


@router.post("/import", response_model=SkillResponse, status_code=201)
def import_skill(data: SkillImport, user=Depends(_current_user), db: Session = Depends(get_db)):
    return skill_service.import_skill_markdown(db, user.id, data.skill_md)
