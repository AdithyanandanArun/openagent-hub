from fastapi import APIRouter, Depends

from app.core.security import get_current_user_id
from app.schemas.chat import ModelsResponse
from app.services.llm_service import AVAILABLE_MODELS

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("", response_model=ModelsResponse)
async def list_models(user_id: str = Depends(get_current_user_id)):
    return ModelsResponse(models=AVAILABLE_MODELS)
