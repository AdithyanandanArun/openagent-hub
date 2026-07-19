"""retain embedding model candidates for automatic knowledge routing

Revision ID: 020
Revises: 019
"""
from alembic import op
import sqlalchemy as sa


revision = "020"
down_revision = "019"


def upgrade():
    op.add_column("model_catalog", sa.Column("is_embedding", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_model_catalog_embedding", "model_catalog", ["user_id", "is_embedding", "is_enabled"])


def downgrade():
    op.drop_index("ix_model_catalog_embedding", table_name="model_catalog")
    op.drop_column("model_catalog", "is_embedding")
