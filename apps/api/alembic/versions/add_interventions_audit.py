"""add interventions policy and audit chain

Revision ID: add_interventions_audit
Revises: add_analyst_feedback
Create Date: 2026-07-19 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_interventions_audit'
down_revision: Union[str, Sequence[str], None] = 'add_analyst_feedback'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update intervention_actions columns
    op.add_column('intervention_actions', sa.Column('requested_by', sa.String(length=100), nullable=True))
    op.add_column('intervention_actions', sa.Column('authorized_by', sa.String(length=100), nullable=True))
    op.add_column('intervention_actions', sa.Column('policy_version', sa.String(length=50), nullable=True))
    op.add_column('intervention_actions', sa.Column('trigger_verdict', sa.String(length=50), nullable=True))
    op.add_column('intervention_actions', sa.Column('idempotency_key', sa.String(length=50), nullable=True))
    op.add_column('intervention_actions', sa.Column('reason', sa.Text(), nullable=True))
    op.add_column('intervention_actions', sa.Column('reversal_link', sa.String(length=250), nullable=True))
    op.add_column('intervention_actions', sa.Column('reversed_at', sa.DateTime(), nullable=True))




def downgrade() -> None:
    pass
    op.drop_column('intervention_actions', 'reversed_at')
    op.drop_column('intervention_actions', 'reversal_link')
    op.drop_column('intervention_actions', 'reason')
    op.drop_column('intervention_actions', 'idempotency_key')
    op.drop_column('intervention_actions', 'trigger_verdict')
    op.drop_column('intervention_actions', 'policy_version')
    op.drop_column('intervention_actions', 'authorized_by')
    op.drop_column('intervention_actions', 'requested_by')
