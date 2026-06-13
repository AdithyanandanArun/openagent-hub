from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.provider import ProviderSettings, get_provider_settings
from app.core.security import get_current_user_id
from app.schemas.chat import ModelsResponse
from app.services.llm_service import LLMService

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("", response_model=ModelsResponse)
async def list_models(
    user_id: str = Depends(get_current_user_id),
    provider: ProviderSettings = Depends(get_provider_settings),
    db: AsyncSession = Depends(get_db),
):
    service = LLMService(db, provider)
    return ModelsResponse(models=await service.get_models())
