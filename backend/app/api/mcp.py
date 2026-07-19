"""Remote MCP connector API for the hosted beta."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.agent import MCPServerCreate, MCPServerResponse, MCPServerUpdate
from app.services import mcp_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/mcp", tags=["mcp"])
security = HTTPBearer()


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    return get_current_user(db, credentials.credentials)


def _require_remote_mcp_enabled() -> None:
    if not settings.ENABLE_REMOTE_MCP_CONNECTORS:
        raise HTTPException(status_code=403, detail="Remote MCP connectors are not enabled in this deployment")


@router.get("/servers", response_model=List[MCPServerResponse])
def list_servers(user=Depends(_current_user), db: Session = Depends(get_db)):
    if not settings.ENABLE_REMOTE_MCP_CONNECTORS:
        return []
    return mcp_service.list_servers(db, user.id)


@router.get("/catalog")
def get_catalog(user=Depends(_current_user)):
    """Only owner-reviewed catalogue entries will be listed here.

    The first remote release intentionally starts empty rather than preserving
    the old catalogue of locally executable stdio packages.
    """
    return [] if settings.ENABLE_REMOTE_MCP_CONNECTORS else []


@router.post("/servers", response_model=MCPServerResponse, status_code=201)
def create_server(data: MCPServerCreate, user=Depends(_current_user), db: Session = Depends(get_db)):
    _require_remote_mcp_enabled()
    return mcp_service.create_server(db, user.id, data.model_dump())


@router.patch("/servers/{server_id}", response_model=MCPServerResponse)
def update_server(server_id: UUID, data: MCPServerUpdate, user=Depends(_current_user), db: Session = Depends(get_db)):
    _require_remote_mcp_enabled()
    return mcp_service.update_server(db, user.id, server_id, data.model_dump(exclude_unset=True))


@router.delete("/servers/{server_id}", status_code=204)
def delete_server(server_id: UUID, user=Depends(_current_user), db: Session = Depends(get_db)):
    _require_remote_mcp_enabled()
    mcp_service.delete_server(db, user.id, server_id)


@router.post("/servers/{server_id}/sync", response_model=MCPServerResponse)
async def sync_server(server_id: UUID, user=Depends(_current_user), db: Session = Depends(get_db)):
    _require_remote_mcp_enabled()
    return await mcp_service.sync_server(db, user.id, server_id)
