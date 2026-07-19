"""remote-only MCP connector metadata

Revision ID: 017
Revises: 016
"""

from alembic import op
import sqlalchemy as sa


revision = "017"
down_revision = "016"


def upgrade():
    op.add_column("mcp_servers", sa.Column("auth_type", sa.String(), nullable=False, server_default="none"))
    op.add_column("mcp_servers", sa.Column("auth_secret", sa.String(), nullable=True))
    op.add_column("mcp_servers", sa.Column("read_only_tools", sa.JSON(), nullable=True))
    op.add_column("mcp_servers", sa.Column("catalog_id", sa.String(), nullable=True))
    op.add_column("mcp_servers", sa.Column("requires_confirmation", sa.Boolean(), nullable=False, server_default=sa.true()))
    # A public Cloud Run deployment must never revive legacy local commands.
    op.execute("UPDATE mcp_servers SET enabled = false, status = 'legacy_disabled' WHERE transport = 'stdio'")


def downgrade():
    op.drop_column("mcp_servers", "requires_confirmation")
    op.drop_column("mcp_servers", "catalog_id")
    op.drop_column("mcp_servers", "read_only_tools")
    op.drop_column("mcp_servers", "auth_secret")
    op.drop_column("mcp_servers", "auth_type")
