"""add durable attachment storage key

Revision ID: 015
Revises: 014
"""
from alembic import op
import sqlalchemy as sa


revision = "015"
down_revision = "014"


def upgrade():
    op.add_column("attachments", sa.Column("storage_key", sa.String(), nullable=True))
    op.execute("UPDATE attachments SET storage_key = file_path WHERE storage_key IS NULL")
    op.alter_column("attachments", "storage_key", nullable=False)


def downgrade():
    op.drop_column("attachments", "storage_key")
