"""Hosted-safe remote MCP connector management.

Only public HTTPS Streamable HTTP endpoints are accepted. The old stdio model
is deliberately unsupported here: a shared Cloud Run backend must never run a
command supplied by one browser user.
"""
from __future__ import annotations

import ipaddress
import json
import socket
from datetime import datetime
from urllib.parse import urlparse
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core import crypto
from app.core.mcp_client import MCPError, mcp_list_http_tools
from app.models.mcp_server import MCPServer

ALLOWED_AUTH_TYPES = {"none", "bearer", "header", "oauth"}


def _validate_remote_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="MCP connectors must use a public HTTPS URL")
    if parsed.port not in (None, 443):
        raise HTTPException(status_code=400, detail="MCP connectors may only use HTTPS port 443")
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail="MCP host could not be resolved") from exc
    if not addresses:
        raise HTTPException(status_code=400, detail="MCP host did not resolve to a public address")
    for address in addresses:
        try:
            if not ipaddress.ip_address(address).is_global:
                raise HTTPException(status_code=400, detail="MCP host must resolve only to public addresses")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="MCP host resolved to an invalid address") from exc
    return parsed.geturl()


def _credential_payload(data: dict, existing: MCPServer | None = None) -> str | None:
    auth_type = data.get("auth_type", existing.auth_type if existing else "none")
    if auth_type not in ALLOWED_AUTH_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported connector authentication type")
    supplied_value = data.get("auth_value")
    if supplied_value is None:
        return existing.auth_secret if existing else None
    value = str(supplied_value).strip()
    if auth_type != "none" and not value:
        raise HTTPException(status_code=400, detail="Authentication value is required for this connector")
    if auth_type == "header":
        header_name = str(data.get("auth_header_name") or "").strip()
        if not header_name or any(char in header_name for char in "\r\n:"):
            raise HTTPException(status_code=400, detail="A valid header name is required")
        payload = {"header_name": header_name, "value": value}
    else:
        payload = {"value": value}
    return crypto.encrypt(json.dumps(payload)) if value else None


def connector_headers(server: MCPServer) -> dict[str, str]:
    """Resolve encrypted credentials just before a remote request."""
    # Revalidate at call time as well as creation time, mitigating DNS rebinding.
    _validate_remote_url(server.url or "")
    if server.auth_type == "none" or not server.auth_secret:
        return {}
    try:
        secret = json.loads(crypto.decrypt(server.auth_secret))
    except Exception as exc:  # noqa: BLE001
        raise MCPError("Stored connector credentials are invalid") from exc
    value = str(secret.get("value", ""))
    if not value:
        return {}
    if server.auth_type in {"bearer", "oauth"}:
        return {"authorization": f"Bearer {value}"}
    if server.auth_type == "header":
        header_name = str(secret.get("header_name", ""))
        if not header_name:
            raise MCPError("Stored connector header is invalid")
        return {header_name: value}
    return {}


def list_servers(db: Session, user_id: UUID) -> list[MCPServer]:
    return (
        db.query(MCPServer)
        .filter(MCPServer.user_id == user_id, MCPServer.transport == "streamable_http")
        .order_by(MCPServer.created_at)
        .all()
    )


def get_server(db: Session, user_id: UUID, server_id: UUID) -> MCPServer:
    server = db.query(MCPServer).filter(
        MCPServer.id == server_id,
        MCPServer.user_id == user_id,
        MCPServer.transport == "streamable_http",
    ).first()
    if not server:
        raise HTTPException(status_code=404, detail="Remote MCP connector not found")
    return server


def create_server(db: Session, user_id: UUID, data: dict) -> MCPServer:
    auth_type = data.get("auth_type", "none")
    if auth_type not in ALLOWED_AUTH_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported connector authentication type")
    url = _validate_remote_url(data.get("url", ""))
    name = str(data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Connector name is required")
    server = MCPServer(
        user_id=user_id,
        name=name[:120],
        transport="streamable_http",
        url=url,
        auth_type=auth_type,
        auth_secret=_credential_payload(data),
        read_only_tools=list(dict.fromkeys(data.get("read_only_tools") or [])),
        enabled=bool(data.get("enabled", True)),
        auto_approve=False,
        requires_confirmation=True,
    )
    db.add(server)
    db.commit()
    db.refresh(server)
    return server


def update_server(db: Session, user_id: UUID, server_id: UUID, updates: dict) -> MCPServer:
    server = get_server(db, user_id, server_id)
    if "name" in updates and updates["name"] is not None:
        name = str(updates["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="Connector name is required")
        server.name = name[:120]
    if "url" in updates and updates["url"] is not None:
        server.url = _validate_remote_url(updates["url"])
    if "auth_type" in updates and updates["auth_type"] is not None:
        if updates["auth_type"] not in ALLOWED_AUTH_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported connector authentication type")
        server.auth_type = updates["auth_type"]
    if "auth_value" in updates:
        server.auth_secret = _credential_payload(updates, server)
    if "read_only_tools" in updates and updates["read_only_tools"] is not None:
        server.read_only_tools = list(dict.fromkeys(updates["read_only_tools"]))
    if "enabled" in updates and updates["enabled"] is not None:
        server.enabled = updates["enabled"]
    server.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(server)
    return server


def delete_server(db: Session, user_id: UUID, server_id: UUID) -> None:
    db.delete(get_server(db, user_id, server_id))
    db.commit()


async def sync_server(db: Session, user_id: UUID, server_id: UUID) -> MCPServer:
    server = get_server(db, user_id, server_id)
    try:
        server.url = _validate_remote_url(server.url or "")
        tools = await mcp_list_http_tools(server.url, connector_headers(server))
        # Treat the server's description as untrusted metadata. Store enough for
        # the UI/tool schema, but keep bounded payloads to protect the database.
        server.tools_cache = [{
            "name": str(tool.get("name", ""))[:160],
            "description": str(tool.get("description", ""))[:2000],
            "inputSchema": tool.get("inputSchema") or {"type": "object", "properties": {}},
        } for tool in tools[:100] if tool.get("name")]
        server.status = "healthy"
        server.last_checked_at = datetime.utcnow()
        db.commit()
        db.refresh(server)
        return server
    except (MCPError, HTTPException) as exc:
        server.status = "error"
        server.last_checked_at = datetime.utcnow()
        db.commit()
        detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
        raise HTTPException(status_code=502, detail=f"MCP connection failed: {detail}") from exc
