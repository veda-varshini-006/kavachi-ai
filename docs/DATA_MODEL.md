# Kavach AI Database Schema & Data Models

This document specifies the database schemas used to enforce constraints on the Kavach AI platform.

## Common Metadata Mixin
All database records extend `KavachModelMixin` which contains:
- `id`: String(36), Primary Key (UUIDv4)
- `created_at`: DateTime (UTC)
- `updated_at`: DateTime (UTC)
- `source`: String(100), default "system"
- `synthetic`: Boolean, default True
- `schema_version`: String(10), default "1.0.0"

## Primary Entity Schemas

### 1. `CommunicationSession`
Stores active phone call sessions.
- `channel`: String(50) (e.g. PHONE, UPI, CHAT)
- `citizen_identifier`: String(100) (Target citizen identifier)
- `suspect_identifier`: String(100) (Scammer caller identifier)
- `status`: String(50) (ACTIVE, COMPLETED)
- `metadata_json`: Text (JSON string)

### 2. `TranscriptSegment`
Stores incremental rolling transcript text segments.
- `session_id`: String(36) (FK → `communication_sessions.id` ON DELETE CASCADE)
- `speaker`: String(50) (CITIZEN, SUSPECT, IVR)
- `text`: Text
- `timestamp`: DateTime
- `confidence`: Float

### 3. `ThreatIndicator`
Stores threat signature registry definitions.
- `code`: String(50), Unique Index (e.g. TI-101)
- `name`: String(150)
- `description`: Text
- `category`: String(100)
- `severity`: String(20) (LOW, MEDIUM, HIGH, CRITICAL)

### 4. `ThreatVerdict`
Stores automated real-time threat verdicts.
- `session_id`: String(36) (FK → `communication_sessions.id`)
- `verdict`: String(20) (SAFE, SUSPICIOUS, CRITICAL)
- `scam_type`: String(100) (IMPERSONATION, OTP_FRAUD, etc.)
- `confidence`: Float
- `normalized_risk_score`: Float (0.0 to 1.0)
- `triggered_indicators_json`: Text (JSON list)
- `evidence_snippets_json`: Text (JSON list)
- `recommended_action`: String(200)
- `model_version`: String(50)
- `rule_version`: String(50)
- `timestamp`: DateTime
- `limitations`: Text

### 5. `IncidentCase`
Stores auditable public safety incident cases.
- `title`: String(200)
- `description`: Text
- `severity`: String(20) (LOW, MEDIUM, HIGH, CRITICAL)
- `status`: String(20) (NEW, INVESTIGATING, ESCALATED, RESOLVED, DISMISSED)
- `assigned_to`: String(100)
- `session_id`: String(36) (FK → `communication_sessions.id`)

### 6. `AnalystNote`
Stores audit notes posted by analysts.
- `case_id`: String(36) (FK → `incident_cases.id` ON DELETE CASCADE)
- `author`: String(100)
- `note_text`: Text

### 7. `InterventionAction`
Logs automated locks or warning triggers.
- `session_id`: String(36) (FK → `communication_sessions.id` ON DELETE CASCADE)
- `incident_id`: String(36) (FK → `incident_cases.id`)
- `action_type`: String(50) (BLOCK_UPI, WARNING_ALERT, etc.)
- `status`: String(20) (PENDING, COMPLETED, FAILED)
- `details_json`: Text (JSON details)
- `triggered_by`: String(100)
- `timestamp`: DateTime

### 8. `Entity`
Graph nodes representing fraud-related identifiers.
- `type`: String(50) (PHONE, BANK_ACCOUNT, UPI_ID, NAME, IP_ADDRESS, DEVICE)
- `value`: String(200)
- `risk_score`: Float (0.0 to 100.0)

### 9. `Relationship`
Graph edges linking network entities.
- `source_entity_id`: String(36) (FK → `entities.id` ON DELETE CASCADE)
- `target_entity_id`: String(36) (FK → `entities.id` ON DELETE CASCADE)
- `type`: String(50) (ASSOCIATED_WITH, TRANSACTED_WITH, CALLED, LOGGED_FROM)
- `risk_score`: Float
- `details_json`: Text

### 10. `GeoEvent`
Geospatial coordinate points for map plotting.
- `title`: String(200)
- `description`: Text
- `event_type`: String(50) (CALL_THREAT, NOTE_SCAN, FRAUD_NODE)
- `latitude`: Float
- `longitude`: Float
- `risk_score`: Float
- `timestamp`: DateTime

### 11. `NoteScan`
Banknote counterfeit screening checks.
- `suspect_serial_number`: String(100)
- `denomination`: String(20)
- `scan_result`: String(20) (GENUINE, COUNTERFEIT, SUSPICIOUS)
- `confidence`: Float
- `analysis_details_json`: Text
- `examiner_id`: String(100)
- `image_path`: String(200)
