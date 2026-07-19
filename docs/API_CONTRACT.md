# Kavach AI REST & WebSocket API Contract

This document lists the REST endpoints and WebSocket payloads exposed by the `kavach-api` service.

## API Paths & Methods

## Operations & Demo API (`/api/v1`)
Manage synthetic testing data and system reconciliations.

### POST /ops/reconcile
Requeue all failed event dispatches from the dead-letter queue back to the transactional outbox.
- **Request**: Empty body
- **Response**: `{"status": "success", "reconciled_count": <int>}`

### POST /demo/replay/{scenario_id}/start
Trigger an automated synthetic scenario replay.
- **Parameters**: `scenario_id` (string)
- **Response**: `{"status": "started", "session_id": "<uuid>"}`

## Case Intelligence Fusion API (`/api/v1/cases/{case_id}/fusion-summary`)
Generate a summarized report linking risks, events, graphs, and geospatial anomalies.
- **Method**: GET
- **Response Model**: `dict` (Includes `risk_band`, `confidence`, `key_evidence`, `linked_campaigns`, `region_context`, `contradictions`)

### 1. Health Checks
- **`GET /api/v1/health`**
  - Description: Returns API server operational status.
- **`GET /api/v1/system/status`**
  - Description: Validates database connectivity.

### 2. Developer Utility
- **`POST /api/v1/dev/seed`**
  - Description: Seeds database with the golden incident case.
- **`POST /api/v1/dev/reset`**
  - Description: Wipes all tables and reseeds clean synthetic variables.

### 3. Sessions CRUD
- **`GET /api/v1/sessions`**
  - Description: Retrieve a paginated list of sessions.
- **`POST /api/v1/sessions`**
  - Description: Register a new telecom intercept session.
- **`GET /api/v1/sessions/{id}`**
  - Description: Retrieve details for a single session.
- **`DELETE /api/v1/sessions/{id}`**
  - Description: Hard deletes a session and cascade-deletes all associated segments and verdicts (complying with mic privacy controls).
- **`POST /api/v1/sessions/{id}/transcript`**
  - Description: Ingest rolling transcript lines. Recalculates threat risk score.
- **`GET /api/v1/sessions/{id}/verdict`**
  - Description: Retrieve current NLP threat verdict.

### 4. Incident Cases
- **`GET /api/v1/cases`**
  - Description: Paginated list of incident alerts.
- **`GET /api/v1/cases/{id}`**
  - Description: Detailed incident page, returns case, analyst notes, evidence files, and linked session details.
- **`POST /api/v1/cases/{id}/notes`**
  - Description: Post a new analyst action log notes.
- **`POST /api/v1/cases/{id}/evidence`**
  - Description: Upload and link evidence package attachments.
- **`POST /api/v1/cases/{id}/feedback`**
  - Description: Post analyst review feedback (verdict, audit notes).
  - Request body: `{"analyst_verdict": "FALSE_POSITIVE" | "CONFIRMED_SUSPICIOUS" | "UNRESOLVED", "feedback_notes": "..."}`
- **`PATCH /api/v1/cases/{id}/status`**
  - Description: Transition case status, validating allowed transition states.
  - Query parameters: `?new_status=NEW | TRIAGE | MONITORING | ESCALATED | RESOLVED-SUSPICIOUS | RESOLVED-BENIGN | CLOSED`
- **`GET /api/v1/cases/{id}/evidence-package`**
  - Description: Retrieve print-friendly JSON evidence package including audit verification chain states.
  - Query parameters: `?reveal_sensitive=true | false`

### 5. Intelligence & Diagnostics APIs
- **`GET /api/v1/intelligence/graph`**
  - Description: Returns fraud link network graph nodes and link edges.
- **`GET /api/v1/intelligence/map`**
  - Description: Mapped coordinates for geospatial response overlays, applying privacy transformation rules (jittering/coarsening). Accepts `?start_time`, `?end_time`, `?event_type`.
- **`GET /api/v1/intelligence/map/hotspots`**
  - Description: Retrieve aggregated hotspot density grids with explainable scores and minimum-count suppression to prevent individual re-identification.
- **`GET /api/v1/intelligence/map/regions`**
  - Description: Retrieve predefined geographic regions and offline-fallback boundary GeoJSONs.
- **`POST /api/v1/intelligence/note-scans`**
  - Description: Log suspect counterfeit bill screenings.
- **`GET /api/v1/intelligence/latency-diagnostics`**
  - Description: Returns p50/p95 calculations for ingest and rules processing delays.

### 6. Counterfeit Currency Screening
- **`POST /api/v1/counterfeit/scan`**
  - Description: Upload a suspect banknote image for classical CV quality assessment, layout consistency, and serial checking.
  - Multi-part form: `file` (UploadFile), `case_id` (Form, optional), `create_case_if_needed` (Form, optional)
- **`DELETE /api/v1/counterfeit/scan/{scan_id}/original`**
  - Description: Hard-deletes the original suspect image file from disk storage to comply with data privacy policies.
- **`GET /api/v1/counterfeit/evaluation`**
  - Description: Executes split-aware validation metrics on synthetic perturbations config manifest.

## WebSocket Streams

### Connection Path
- **`WS /api/v1/sessions/{id}/stream`**

### Bidirectional Envelope

#### Client Ingestion Envelope
```json
{
  "command": "simulate_next" | "transcript_segment",
  "seq": 0,
  "client_timestamp": 1721389027.980,
  "idempotency_key": "unique-uuid-key",
  "scenario_id": "digital-arrest",
  "step": 1,
  "payload": {
    "speaker": "CITIZEN",
    "text": "...",
    "confidence": 0.98
  }
}
```

#### Reconnect Sync Envelope
```json
{
  "command": "reconnect",
  "last_sequence": 14
}
```

#### Server Broadcast Envelope
```json
{
  "event_type": "transcript_segment" | "threat_verdict",
  "seq": 0,
  "idempotency_key": "unique-uuid-key",
  "payload": {
    "verdict": "CRITICAL" | "SUSPICIOUS" | "SAFE",
    "scam_type": "DIGITAL_ARREST" | "KYC_FRAUD" | "COURIER_SCAM" | "PHISHING" | "NONE",
    "confidence": 0.9,
    "normalized_risk_score": 0.8,
    "stage": "NORMAL" | "CONCERN" | "COERCION" | "FINANCIAL_ACTION",
    "triggered_indicators": ["authority_claim", "threat_of_arrest"],
    "evidence_snippets": ["...", "..."],
    "recommended_action": "BLOCK_UPI_TRANSACTION",
    "detailed_indicators": [
      {
        "code": "authority_claim",
        "name": "CBI claim",
        "severity": "HIGH",
        "matched_segment_id": "seg-123",
        "matched_text": "I am CBI officer",
        "explanation": "..."
      }
    ]
  }
}
```
