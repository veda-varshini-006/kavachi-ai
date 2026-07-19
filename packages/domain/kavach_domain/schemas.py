import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    CITIZEN = "CITIZEN"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CaseStatus(str, Enum):
    NEW = "NEW"
    TRIAGE = "TRIAGE"
    MONITORING = "MONITORING"
    ESCALATED = "ESCALATED"
    RESOLVED_SUSPICIOUS = "RESOLVED-SUSPICIOUS"
    RESOLVED_BENIGN = "RESOLVED-BENIGN"
    CLOSED = "CLOSED"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class ThreatVerdictValue(str, Enum):
    SAFE = "SAFE"
    SUSPICIOUS = "SUSPICIOUS"
    CRITICAL = "CRITICAL"


class InterventionStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class EntityType(str, Enum):
    PHONE = "PHONE"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    UPI_ID = "UPI_ID"
    NAME = "NAME"
    IP_ADDRESS = "IP_ADDRESS"
    DEVICE = "DEVICE"
    COMPLAINT = "COMPLAINT"
    COMMUNICATION_SESSION = "COMMUNICATION_SESSION"
    SCRIPT_SIGNATURE = "SCRIPT_SIGNATURE"
    ALIAS = "ALIAS"
    ORGANIZATION_CLAIM = "ORGANIZATION_CLAIM"
    NOTE_SCAN = "NOTE_SCAN"
    COUNTERFEIT_SEIZURE = "COUNTERFEIT_SEIZURE"
    GEO_REGION = "GEO_REGION"
    INCIDENT_CASE = "INCIDENT_CASE"


class RelationshipType(str, Enum):
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    TRANSACTED_WITH = "TRANSACTED_WITH"
    CALLED = "CALLED"
    LOGGED_FROM = "LOGGED_FROM"
    USED_IN = "USED_IN"
    CONTACTED = "CONTACTED"
    TRANSFER_REQUESTED_TO = "TRANSFER_REQUESTED_TO"
    SHARED_DEVICE = "SHARED_DEVICE"
    SHARED_IP = "SHARED_IP"
    REUSED_SCRIPT = "REUSED_SCRIPT"
    CLAIMED_IDENTITY = "CLAIMED_IDENTITY"
    LINKED_TO_CASE = "LINKED_TO_CASE"
    SCANNED_IN = "SCANNED_IN"
    LOCATED_IN = "LOCATED_IN"
    POSSIBLE_SAME_ACTOR = "POSSIBLE_SAME_ACTOR"
    MEMBER_OF_CAMPAIGN = "MEMBER_OF_CAMPAIGN"


class ScanResult(str, Enum):
    GENUINE = "GENUINE"
    COUNTERFEIT = "COUNTERFEIT"
    SUSPICIOUS = "SUSPICIOUS"


# ---------------------------------------------------------------------------
# Base Schema with standard fields
# ---------------------------------------------------------------------------

class KavachBaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    source: str = "system"
    synthetic: bool = True
    schema_version: str = "1.0.0"


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CommunicationSessionCreate(BaseModel):
    channel: str
    citizen_identifier: str
    suspect_identifier: str
    status: str | None = "ACTIVE"
    metadata_json: str | None = "{}"


class CommunicationSessionSchema(KavachBaseSchema):
    channel: str
    citizen_identifier: str
    suspect_identifier: str
    status: str
    metadata_json: str


class TranscriptSegmentCreate(BaseModel):
    speaker: str
    text: str
    confidence: float | None = 1.0
    sequence_number: int | None = 0
    client_timestamp: float | None = None
    ingest_latency_ms: float | None = None
    processing_latency_ms: float | None = None
    render_latency_ms: float | None = None
    idempotency_key: str | None = None


class TranscriptSegmentSchema(KavachBaseSchema):
    session_id: str
    speaker: str
    text: str
    timestamp: datetime
    confidence: float
    sequence_number: int
    client_timestamp: float | None
    ingest_latency_ms: float | None
    processing_latency_ms: float | None
    render_latency_ms: float | None
    idempotency_key: str | None


class ThreatIndicatorCreate(BaseModel):
    code: str
    name: str
    description: str
    category: str
    severity: Severity


class ThreatIndicatorSchema(KavachBaseSchema):
    code: str
    name: str
    description: str
    category: str
    severity: Severity


class ThreatVerdictSchema(KavachBaseSchema):
    session_id: str
    verdict: ThreatVerdictValue
    scam_type: str
    confidence: float
    normalized_risk_score: float
    triggered_indicators_json: str  # JSON list
    evidence_snippets_json: str    # JSON list
    recommended_action: str | None = None
    model_version: str = "1.0.0"
    rule_version: str = "1.0.0"
    timestamp: datetime
    limitations: str | None = None

    @field_validator("normalized_risk_score")
    @classmethod
    def validate_risk_score(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("risk score must be between 0.0 and 1.0")
        return v


class InterventionActionCreate(BaseModel):
    session_id: str | None = None
    incident_id: str | None = None
    action_type: str
    status: InterventionStatus
    details_json: str | None = "{}"
    triggered_by: str | None = "threat_engine"
    requested_by: str | None = None
    authorized_by: str | None = None
    policy_version: str | None = None
    trigger_verdict: str | None = None
    idempotency_key: str | None = None
    reason: str | None = None
    reversal_link: str | None = None
    reversed_at: datetime | None = None


class InterventionActionSchema(KavachBaseSchema):
    session_id: str | None = None
    incident_id: str | None = None
    action_type: str
    status: InterventionStatus
    details_json: str
    triggered_by: str
    timestamp: datetime
    requested_by: str | None = None
    authorized_by: str | None = None
    policy_version: str | None = None
    trigger_verdict: str | None = None
    idempotency_key: str | None = None
    reason: str | None = None
    reversal_link: str | None = None
    reversed_at: datetime | None = None


class IncidentCaseCreate(BaseModel):
    title: str
    description: str
    severity: Severity
    status: CaseStatus | None = CaseStatus.NEW
    assigned_to: str | None = None
    session_id: str | None = None


class IncidentCaseSchema(KavachBaseSchema):
    title: str
    description: str
    severity: Severity
    status: CaseStatus
    assigned_to: str | None = None
    session_id: str | None = None
    analyst_verdict: str | None = None
    feedback_notes: str | None = None


class IncidentCaseFeedbackSubmit(BaseModel):
    analyst_verdict: str  # FALSE_POSITIVE, CONFIRMED_SUSPICIOUS, UNRESOLVED
    feedback_notes: str | None = None


class AnalystNoteCreate(BaseModel):
    author: str
    note_text: str


class AnalystNoteSchema(KavachBaseSchema):
    case_id: str
    author: str
    note_text: str


class EntityCreate(BaseModel):
    type: EntityType
    value: str
    risk_score: float | None = 0.0


class EntitySchema(KavachBaseSchema):
    type: EntityType
    value: str
    risk_score: float

    @field_validator("risk_score")
    @classmethod
    def validate_risk(cls, v: float) -> float:
        if not (0.0 <= v <= 100.0):
            raise ValueError("risk score must be between 0.0 and 100.0")
        return v


class RelationshipCreate(BaseModel):
    source_entity_id: str
    target_entity_id: str
    type: RelationshipType
    risk_score: float | None = 0.0
    details_json: str | None = "{}"
    evidence_source: str | None = None
    confidence: float | None = 1.0
    method: str | None = None
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    provenance: str | None = None
    explanation: str | None = None
    is_reviewed: bool | None = False
    is_rejected: bool | None = False


class RelationshipSchema(KavachBaseSchema):
    source_entity_id: str
    target_entity_id: str
    type: RelationshipType
    risk_score: float
    details_json: str
    evidence_source: str | None = None
    confidence: float = 1.0
    method: str | None = None
    first_seen: datetime
    last_seen: datetime
    provenance: str | None = None
    explanation: str | None = None
    is_reviewed: bool = False
    is_rejected: bool = False


class GeoEventCreate(BaseModel):
    title: str
    description: str
    event_type: str
    latitude: float
    longitude: float
    risk_score: float | None = 0.0
    source_case_id: str | None = None
    confidence: float | None = 1.0
    aggregation_level: str | None = "RAW"
    privacy_transformation: str | None = "NONE"
    provenance: str | None = None


class GeoEventSchema(KavachBaseSchema):
    title: str
    description: str
    event_type: str
    latitude: float
    longitude: float
    risk_score: float
    timestamp: datetime
    source_case_id: str | None = None
    confidence: float
    aggregation_level: str
    privacy_transformation: str
    provenance: str | None = None


class GeoRegionCreate(BaseModel):
    name: str
    region_type: str
    center_latitude: float
    center_longitude: float
    boundary_geojson: str
    population_density: float | None = None


class GeoRegionSchema(KavachBaseSchema):
    name: str
    region_type: str
    center_latitude: float
    center_longitude: float
    boundary_geojson: str
    population_density: float | None = None


class HotspotWindowCreate(BaseModel):
    region_id: str
    start_time: datetime
    end_time: datetime
    event_count: int | None = 0
    suppressed: bool | None = False


class HotspotWindowSchema(KavachBaseSchema):
    region_id: str
    start_time: datetime
    end_time: datetime
    event_count: int
    suppressed: bool


class GeoRiskScoreCreate(BaseModel):
    hotspot_id: str
    score: float | None = 0.0
    explanation_json: str | None = "{}"


class GeoRiskScoreSchema(KavachBaseSchema):
    hotspot_id: str
    score: float
    explanation_json: str


class MapLayerCreate(BaseModel):
    name: str
    layer_type: str
    config_json: str | None = "{}"
    is_active: bool | None = True


class MapLayerSchema(KavachBaseSchema):
    name: str
    layer_type: str
    config_json: str
    is_active: bool


class NoteScanCreate(BaseModel):
    suspect_serial_number: str
    denomination: str
    scan_result: ScanResult
    confidence: float | None = 0.0
    analysis_details_json: str | None = "{}"
    examiner_id: str
    image_path: str | None = None


class NoteScanSchema(KavachBaseSchema):
    suspect_serial_number: str
    denomination: str
    scan_result: ScanResult
    confidence: float
    analysis_details_json: str
    examiner_id: str
    image_path: str | None = None


class ModelRunCreate(BaseModel):
    model_name: str
    model_version: str
    input_json: str | None = "{}"
    output_json: str | None = "{}"
    latency_ms: float
    status: str


class ModelRunSchema(KavachBaseSchema):
    model_name: str
    model_version: str
    input_json: str
    output_json: str
    latency_ms: float
    status: str


class AuditEventCreate(BaseModel):
    actor_id: str
    actor_role: UserRole
    action: str
    resource: str
    resource_id: str | None = None
    status: str
    details_json: str | None = "{}"
    ip_address: str


class AuditEventSchema(KavachBaseSchema):
    actor_id: str
    actor_role: UserRole
    action: str
    resource: str
    resource_id: str | None = None
    status: str
    details_json: str
    ip_address: str
    timestamp: datetime
    previous_event_hash: str | None = None
    canonical_payload_hash: str | None = None
    event_hash: str | None = None
    correlation_id: str | None = None


class EvidencePackageCreate(BaseModel):
    name: str
    description: str
    file_path: str
    file_hash: str
    created_by: str


class EvidencePackageSchema(KavachBaseSchema):
    case_id: str
    name: str
    description: str
    file_path: str
    file_hash: str
    created_by: str


# ---------------------------------------------------------------------------
# API Responses wrapper
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    error: str
    message: str
    request_id: str | None = None


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int
    has_next: bool

# ---------------------------------------------------------------------------
# Event Bus Schemas
# ---------------------------------------------------------------------------

class EventEnvelope(BaseModel):
    event_type: str
    payload: dict
    correlation_id: str | None = None
    causation_id: str | None = None
    retry_count: int = 0


class EventOutboxSchema(KavachBaseSchema):
    event_type: str
    payload_json: str
    correlation_id: str | None = None
    causation_id: str | None = None
    published: bool
    retry_count: int
    last_error: str | None = None


class DeadLetterSchema(KavachBaseSchema):
    event_type: str
    payload_json: str
    correlation_id: str | None = None
    causation_id: str | None = None
    error_reason: str
    failed_at: datetime
