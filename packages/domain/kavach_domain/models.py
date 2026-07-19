import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass

class KavachModelMixin:
    """Common columns shared by all models in Kavach AI."""
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    source = Column(String(100), default="system", nullable=False)
    synthetic = Column(Boolean, default=True, nullable=False)
    schema_version = Column(String(10), default="1.0.0", nullable=False)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class CommunicationSession(Base, KavachModelMixin):
    __tablename__ = "communication_sessions"

    channel = Column(String(50), nullable=False)  # PHONE, UPI, CHAT
    citizen_identifier = Column(String(100), nullable=False)
    suspect_identifier = Column(String(100), nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED
    metadata_json = Column(Text, default="{}", nullable=False)

    segments = relationship("TranscriptSegment", back_populates="session", cascade="all, delete-orphan")
    verdicts = relationship("ThreatVerdict", back_populates="session", cascade="all, delete-orphan")
    interventions = relationship("InterventionAction", back_populates="session", cascade="all, delete-orphan")
    cases = relationship("IncidentCase", back_populates="session")


class TranscriptSegment(Base, KavachModelMixin):
    __tablename__ = "transcript_segments"

    session_id = Column(String(36), ForeignKey("communication_sessions.id", ondelete="CASCADE"), nullable=False)
    speaker = Column(String(50), nullable=False)  # CITIZEN, SUSPECT, IVR
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    sequence_number = Column(Integer, default=0, nullable=False)
    client_timestamp = Column(Float, nullable=True)
    ingest_latency_ms = Column(Float, nullable=True)
    processing_latency_ms = Column(Float, nullable=True)
    render_latency_ms = Column(Float, nullable=True)
    idempotency_key = Column(String(50), nullable=True)

    session = relationship("CommunicationSession", back_populates="segments")


class ThreatIndicator(Base, KavachModelMixin):
    __tablename__ = "threat_indicators"

    code = Column(String(50), unique=True, nullable=False)  # e.g., TI-101
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL


class ThreatVerdict(Base, KavachModelMixin):
    __tablename__ = "threat_verdicts"

    session_id = Column(String(36), ForeignKey("communication_sessions.id", ondelete="CASCADE"), nullable=False)
    verdict = Column(String(20), nullable=False)  # SAFE, SUSPICIOUS, CRITICAL
    scam_type = Column(String(100), default="NONE", nullable=False)  # OTP_FRAUD, INVESTMENT_SCAM, etc.
    confidence = Column(Float, default=0.0, nullable=False)
    normalized_risk_score = Column(Float, default=0.0, nullable=False)
    triggered_indicators_json = Column(Text, default="[]", nullable=False)  # List of codes
    evidence_snippets_json = Column(Text, default="[]", nullable=False)      # List of strings
    recommended_action = Column(String(200), nullable=True)
    model_version = Column(String(50), default="1.0.0", nullable=False)
    rule_version = Column(String(50), default="1.0.0", nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    limitations = Column(Text, nullable=True)

    session = relationship("CommunicationSession", back_populates="verdicts")


class InterventionAction(Base, KavachModelMixin):
    __tablename__ = "intervention_actions"

    session_id = Column(String(36), ForeignKey("communication_sessions.id", ondelete="CASCADE"), nullable=True)
    incident_id = Column(String(36), ForeignKey("incident_cases.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(50), nullable=False)  # BLOCK_UPI, ALERT_CITIZEN, LOCK_ACCOUNT
    status = Column(String(20), nullable=False)       # PENDING, COMPLETED, FAILED
    details_json = Column(Text, default="{}", nullable=False)
    triggered_by = Column(String(100), default="threat_engine", nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("CommunicationSession", back_populates="interventions")
    case = relationship("IncidentCase", back_populates="interventions")
    requested_by = Column(String(100), nullable=True)
    authorized_by = Column(String(100), nullable=True)
    policy_version = Column(String(50), nullable=True)
    trigger_verdict = Column(String(50), nullable=True)
    idempotency_key = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    reversal_link = Column(String(250), nullable=True)
    reversed_at = Column(DateTime, nullable=True)


class IncidentCase(Base, KavachModelMixin):
    __tablename__ = "incident_cases"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(20), nullable=False)    # NEW, INVESTIGATING, ESCALATED, RESOLVED, DISMISSED
    assigned_to = Column(String(100), nullable=True)
    session_id = Column(String(36), ForeignKey("communication_sessions.id", ondelete="SET NULL"), nullable=True)

    session = relationship("CommunicationSession", back_populates="cases")
    notes = relationship("AnalystNote", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("EvidencePackage", back_populates="case", cascade="all, delete-orphan")
    interventions = relationship("InterventionAction", back_populates="case")
    analyst_verdict = Column(String(50), nullable=True)  # FALSE_POSITIVE, CONFIRMED_SUSPICIOUS, UNRESOLVED
    feedback_notes = Column(Text, nullable=True)


class AnalystNote(Base, KavachModelMixin):
    __tablename__ = "analyst_notes"

    case_id = Column(String(36), ForeignKey("incident_cases.id", ondelete="CASCADE"), nullable=False)
    author = Column(String(100), nullable=False)
    note_text = Column(Text, nullable=False)

    case = relationship("IncidentCase", back_populates="notes")


class Entity(Base, KavachModelMixin):
    __tablename__ = "entities"

    type = Column(String(50), nullable=False)  # PHONE, BANK_ACCOUNT, UPI_ID, NAME, IP_ADDRESS, DEVICE
    value = Column(String(200), nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)


class Relationship(Base, KavachModelMixin):
    __tablename__ = "relationships"

    source_entity_id = Column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_entity_id = Column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # USED_IN, CONTACTED, etc.
    risk_score = Column(Float, default=0.0, nullable=False)
    details_json = Column(Text, default="{}", nullable=False)
    
    # Graph specific fields
    evidence_source = Column(String(200), nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    method = Column(String(100), nullable=True)
    first_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    provenance = Column(String(200), nullable=True)
    explanation = Column(Text, nullable=True)
    is_reviewed = Column(Boolean, default=False, nullable=False)
    is_rejected = Column(Boolean, default=False, nullable=False)


class GeoEvent(Base, KavachModelMixin):
    __tablename__ = "geo_events"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    event_type = Column(String(50), nullable=False)  # CALL_THREAT, NOTE_SCAN, FRAUD_NODE
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # New Geospatial Fields
    source_case_id = Column(String(36), ForeignKey("incident_cases.id", ondelete="SET NULL"), nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    aggregation_level = Column(String(50), default="RAW", nullable=False) # RAW, DISTRICT, WARD, HEXBIN
    privacy_transformation = Column(String(50), default="NONE", nullable=False) # NONE, JITTERED, COARSENED
    provenance = Column(String(200), nullable=True)

    case = relationship("IncidentCase")

class GeoRegion(Base, KavachModelMixin):
    __tablename__ = "geo_regions"
    
    name = Column(String(100), nullable=False)
    region_type = Column(String(50), nullable=False) # DISTRICT, WARD, GRID_CELL
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    boundary_geojson = Column(Text, nullable=False) # Store basic GeoJSON string for offline fallback
    population_density = Column(Float, nullable=True)

class HotspotWindow(Base, KavachModelMixin):
    __tablename__ = "hotspot_windows"
    
    region_id = Column(String(36), ForeignKey("geo_regions.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    event_count = Column(Integer, default=0, nullable=False)
    suppressed = Column(Boolean, default=False, nullable=False) # True if count < minimum threshold

    region = relationship("GeoRegion")

class GeoRiskScore(Base, KavachModelMixin):
    __tablename__ = "geo_risk_scores"
    
    hotspot_id = Column(String(36), ForeignKey("hotspot_windows.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    explanation_json = Column(Text, default="{}", nullable=False) # JSON with explainable components
    
    hotspot = relationship("HotspotWindow")

class MapLayer(Base, KavachModelMixin):
    __tablename__ = "map_layers"
    
    name = Column(String(100), nullable=False)
    layer_type = Column(String(50), nullable=False) # HEATMAP, SCATTERPLOT, GEOJSON
    config_json = Column(Text, default="{}", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class NoteScan(Base, KavachModelMixin):
    __tablename__ = "note_scans"

    suspect_serial_number = Column(String(100), nullable=False)
    denomination = Column(String(20), nullable=False)
    scan_result = Column(String(20), nullable=False)  # GENUINE, COUNTERFEIT, SUSPICIOUS
    confidence = Column(Float, default=0.0, nullable=False)
    analysis_details_json = Column(Text, default="{}", nullable=False)
    examiner_id = Column(String(100), nullable=False)
    image_path = Column(String(200), nullable=True)


class ModelRun(Base, KavachModelMixin):
    __tablename__ = "model_runs"

    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    input_json = Column(Text, default="{}", nullable=False)
    output_json = Column(Text, default="{}", nullable=False)
    latency_ms = Column(Float, nullable=False)
    status = Column(String(50), nullable=False)


class AuditEvent(Base, KavachModelMixin):
    __tablename__ = "audit_events"

    actor_id = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False)  # SUCCESS, FAILURE
    details_json = Column(Text, default="{}", nullable=False)
    ip_address = Column(String(45), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    previous_event_hash = Column(String(64), nullable=True)
    canonical_payload_hash = Column(String(64), nullable=True)
    event_hash = Column(String(64), nullable=True)
    correlation_id = Column(String(100), nullable=True)


class PrivacyAudit(Base, KavachModelMixin):
    __tablename__ = "privacy_audits"

    actor_id = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    pii_fields_accessed = Column(String(200), nullable=False)
    justification = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class ConsentRecord(Base, KavachModelMixin):
    __tablename__ = "consent_records"

    citizen_identifier = Column(String(100), nullable=False)
    consent_type = Column(String(50), nullable=False) # MICROPHONE, IMAGE_CAPTURE
    granted = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

class EvidencePackage(Base, KavachModelMixin):
    __tablename__ = "evidence_packages"

    case_id = Column(String(36), ForeignKey("incident_cases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    file_path = Column(String(300), nullable=False)
    file_hash = Column(String(64), nullable=False)
    created_by = Column(String(100), nullable=False)

    case = relationship("IncidentCase", back_populates="evidence")


class EventOutbox(Base, KavachModelMixin):
    __tablename__ = "event_outbox"

    event_type = Column(String(100), nullable=False)
    payload_json = Column(Text, nullable=False)
    correlation_id = Column(String(100), nullable=True)
    causation_id = Column(String(100), nullable=True)
    published = Column(Boolean, default=False, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)


class DeadLetter(Base, KavachModelMixin):
    __tablename__ = "dead_letters"

    event_type = Column(String(100), nullable=False)
    payload_json = Column(Text, nullable=False)
    correlation_id = Column(String(100), nullable=True)
    causation_id = Column(String(100), nullable=True)
    error_reason = Column(Text, nullable=False)
    failed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
