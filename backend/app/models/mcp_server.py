import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class MCPServer(Base):
    """A registered MCP (Model Context Protocol) server providing tools to agents."""

    __tablename__ = "mcp_servers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    transport = Column(String, default="streamable_http")  # legacy stdio | streamable_http
    command = Column(String, nullable=True)       # stdio: executable (e.g. "python", "npx")
    args = Column(JSON, nullable=True)             # stdio: list[str] of arguments
    url = Column(String, nullable=True)            # http: base URL of the server
    env = Column(JSON, nullable=True)              # extra environment variables (dict)
    auth_type = Column(String, nullable=False, default="none")  # none | bearer | header | oauth
    # Encrypted JSON. It contains a bearer token, header name/value, or OAuth
    # token set, and is never returned by the API.
    auth_secret = Column(String, nullable=True)
    read_only_tools = Column(JSON, nullable=True)  # explicitly allowlisted tool names
    catalog_id = Column(String, nullable=True)
    requires_confirmation = Column(Boolean, default=True)
    enabled = Column(Boolean, default=True)
    auto_approve = Column(Boolean, default=True)   # if false, tool calls require explicit approval
    status = Column(String, default="unknown")     # unknown | healthy | error
    tools_cache = Column(JSON, nullable=True)      # cached list of discovered tools
    last_checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
