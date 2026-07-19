"""Initial Kavach Schema

Revision ID: initial_kavach_schema
Revises:
Create Date: 2026-07-19 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'initial_kavach_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. communication_sessions
    op.create_table(
        'communication_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False),
        sa.Column('citizen_identifier', sa.String(length=100), nullable=False),
        sa.Column('suspect_identifier', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. transcript_segments
    op.create_table(
        'transcript_segments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('speaker', sa.String(length=50), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['communication_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. threat_indicators
    op.create_table(
        'threat_indicators',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )

    # 4. threat_verdicts
    op.create_table(
        'threat_verdicts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('verdict', sa.String(length=20), nullable=False),
        sa.Column('scam_type', sa.String(length=100), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('normalized_risk_score', sa.Float(), nullable=False),
        sa.Column('triggered_indicators_json', sa.Text(), nullable=False),
        sa.Column('evidence_snippets_json', sa.Text(), nullable=False),
        sa.Column('recommended_action', sa.String(length=200), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.Column('rule_version', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('limitations', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['communication_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. incident_cases
    op.create_table(
        'incident_cases',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('assigned_to', sa.String(length=100), nullable=True),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['communication_sessions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. analyst_notes
    op.create_table(
        'analyst_notes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('author', sa.String(length=100), nullable=False),
        sa.Column('note_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['incident_cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. intervention_actions
    op.create_table(
        'intervention_actions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('incident_id', sa.String(length=36), nullable=True),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('details_json', sa.Text(), nullable=False),
        sa.Column('triggered_by', sa.String(length=100), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['incident_id'], ['incident_cases.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['session_id'], ['communication_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. entities
    op.create_table(
        'entities',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('value', sa.String(length=200), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. relationships
    op.create_table(
        'relationships',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('source_entity_id', sa.String(length=36), nullable=False),
        sa.Column('target_entity_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False),
        sa.Column('details_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['source_entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_entity_id'], ['entities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. geo_events
    op.create_table(
        'geo_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('risk_score', sa.Float(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 11. note_scans
    op.create_table(
        'note_scans',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('suspect_serial_number', sa.String(length=100), nullable=False),
        sa.Column('denomination', sa.String(length=20), nullable=False),
        sa.Column('scan_result', sa.String(length=20), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('analysis_details_json', sa.Text(), nullable=False),
        sa.Column('examiner_id', sa.String(length=100), nullable=False),
        sa.Column('image_path', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 12. model_runs
    op.create_table(
        'model_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.Column('input_json', sa.Text(), nullable=False),
        sa.Column('output_json', sa.Text(), nullable=False),
        sa.Column('latency_ms', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 13. audit_events
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('actor_id', sa.String(length=100), nullable=False),
        sa.Column('actor_role', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('details_json', sa.Text(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 14. evidence_packages
    op.create_table(
        'evidence_packages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('case_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('file_path', sa.String(length=300), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('synthetic', sa.Boolean(), nullable=False),
        sa.Column('schema_version', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['incident_cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('evidence_packages')
    op.drop_table('audit_events')
    op.drop_table('model_runs')
    op.drop_table('note_scans')
    op.drop_table('geo_events')
    op.drop_table('relationships')
    op.drop_table('entities')
    op.drop_table('intervention_actions')
    op.drop_table('analyst_notes')
    op.drop_table('incident_cases')
    op.drop_table('threat_verdicts')
    op.drop_table('threat_indicators')
    op.drop_table('transcript_segments')
    op.drop_table('communication_sessions')
