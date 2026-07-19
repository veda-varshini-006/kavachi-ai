export type UserRole = 'ADMIN' | 'ANALYST' | 'CITIZEN';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CaseStatus = 'NEW' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'DISMISSED';
export type ThreatVerdictValue = 'SAFE' | 'SUSPICIOUS' | 'CRITICAL';
export type InterventionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type EntityType = 'PHONE' | 'BANK_ACCOUNT' | 'UPI_ID' | 'NAME' | 'IP_ADDRESS' | 'DEVICE';
export type RelationshipType = 'ASSOCIATED_WITH' | 'TRANSACTED_WITH' | 'CALLED' | 'LOGGED_FROM';
export type ScanResult = 'GENUINE' | 'COUNTERFEIT' | 'SUSPICIOUS';

export interface KavachBase {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  synthetic: boolean;
  schema_version: string;
}

export interface CommunicationSession extends KavachBase {
  channel: string;
  citizen_identifier: string;
  suspect_identifier: string;
  status: 'ACTIVE' | 'COMPLETED';
  metadata_json: string;
}

export interface TranscriptSegment extends KavachBase {
  session_id: string;
  speaker: string;
  text: string;
  timestamp: string;
  confidence: number;
  sequence_number: number;
  client_timestamp?: number;
  ingest_latency_ms?: number;
  processing_latency_ms?: number;
  render_latency_ms?: number;
  idempotency_key?: string;
}

export interface ThreatIndicator extends KavachBase {
  code: string;
  name: string;
  description: string;
  category: string;
  severity: Severity;
}

export interface ThreatVerdict extends KavachBase {
  session_id: string;
  verdict: ThreatVerdictValue;
  scam_type: string;
  confidence: number;
  normalized_risk_score: number;
  triggered_indicators_json: string;
  evidence_snippets_json: string;
  recommended_action?: string;
  model_version: string;
  rule_version: string;
  timestamp: string;
  limitations?: string;
}

export interface InterventionAction extends KavachBase {
  session_id?: string;
  incident_id?: string;
  action_type: string;
  status: InterventionStatus;
  details_json: string;
  triggered_by: string;
  timestamp: string;
  requested_by?: string;
  authorized_by?: string;
  policy_version?: string;
  trigger_verdict?: string;
  idempotency_key?: string;
  reason?: string;
  reversal_link?: string;
  reversed_at?: string;
}

export interface AuditEvent extends KavachBase {
  actor_id: string;
  actor_role: string;
  action: string;
  resource: string;
  resource_id?: string;
  status: string;
  details_json: string;
  ip_address: string;
  timestamp: string;
  previous_event_hash?: string;
  canonical_payload_hash?: string;
  event_hash?: string;
  correlation_id?: string;
}

export interface IncidentCase extends KavachBase {
  title: string;
  description: string;
  severity: Severity;
  status: CaseStatus;
  assigned_to?: string;
  session_id?: string;
  analyst_verdict?: string;
  feedback_notes?: string;
}

export interface AnalystNote extends KavachBase {
  case_id: string;
  author: string;
  note_text: string;
}

export interface Entity extends KavachBase {
  type: EntityType;
  value: string;
  risk_score: number;
}

export interface Relationship extends KavachBase {
  source_entity_id: string;
  target_entity_id: string;
  type: RelationshipType;
  risk_score: number;
  details_json: string;
}

export interface GeoEvent extends KavachBase {
  title: string;
  description: string;
  event_type: 'CALL_THREAT' | 'NOTE_SCAN' | 'FRAUD_NODE';
  latitude: number;
  longitude: number;
  risk_score: number;
  timestamp: string;
}

export interface NoteScan extends KavachBase {
  suspect_serial_number: string;
  denomination: string;
  scan_result: ScanResult;
  confidence: number;
  analysis_details_json: string;
  examiner_id: string;
  image_path?: string;
}

export interface AuditEvent extends KavachBase {
  actor_id: string;
  actor_role: UserRole;
  action: string;
  resource: string;
  resource_id?: string;
  status: string;
  details_json: string;
  ip_address: string;
  timestamp: string;
}

export interface EvidencePackage extends KavachBase {
  case_id: string;
  name: string;
  description: string;
  file_path: string;
  file_hash: string;
  created_by: string;
}
