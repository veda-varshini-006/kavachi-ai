"""add analyst feedback to cases

Revision ID: add_analyst_feedback
Revises: add_telemetry_fields
Create Date: 2026-07-19 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_analyst_feedback'
down_revision: Union[str, Sequence[str], None] = 'add_telemetry_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('incident_cases', sa.Column('analyst_verdict', sa.String(length=50), nullable=True))
    op.add_column('incident_cases', sa.Column('feedback_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('incident_cases', 'feedback_notes')
    op.drop_column('incident_cases', 'analyst_verdict')
