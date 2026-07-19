"""add telemetry fields to transcript segments

Revision ID: add_telemetry_fields
Revises: initial_kavach_schema
Create Date: 2026-07-19 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_telemetry_fields'
down_revision: Union[str, Sequence[str], None] = 'initial_kavach_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transcript_segments', sa.Column('sequence_number', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('transcript_segments', sa.Column('client_timestamp', sa.Float(), nullable=True))
    op.add_column('transcript_segments', sa.Column('ingest_latency_ms', sa.Float(), nullable=True))
    op.add_column('transcript_segments', sa.Column('processing_latency_ms', sa.Float(), nullable=True))
    op.add_column('transcript_segments', sa.Column('render_latency_ms', sa.Float(), nullable=True))
    op.add_column('transcript_segments', sa.Column('idempotency_key', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('transcript_segments', 'idempotency_key')
    op.drop_column('transcript_segments', 'render_latency_ms')
    op.drop_column('transcript_segments', 'processing_latency_ms')
    op.drop_column('transcript_segments', 'ingest_latency_ms')
    op.drop_column('transcript_segments', 'client_timestamp')
    op.drop_column('transcript_segments', 'sequence_number')
