import json
from datetime import datetime, timedelta

from kavach_config.settings import get_settings
from kavach_domain.models import (
    AnalystNote,
    AuditEvent,
    Base,
    CommunicationSession,
    Entity,
    GeoEvent,
    GeoRegion,
    IncidentCase,
    InterventionAction,
    NoteScan,
    Relationship,
    ThreatIndicator,
    ThreatVerdict,
    TranscriptSegment,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Predefined stable UUIDs for the Golden Case
GOLDEN_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000"
GOLDEN_CASE_ID = "330e8400-e29b-41d4-a716-446655440000"
GOLDEN_CITIZEN_PHONE_ID = "e11e8400-e29b-41d4-a716-446655440001"
GOLDEN_SUSPECT_PHONE_ID = "e11e8400-e29b-41d4-a716-446655440002"
GOLDEN_UPI_ID = "e11e8400-e29b-41d4-a716-446655440003"
GOLDEN_ACCOUNT_ID = "e11e8400-e29b-41d4-a716-446655440004"
GOLDEN_CITIZEN_NAME_ID = "e11e8400-e29b-41d4-a716-446655440005"


def get_golden_case_data():
    """Returns the stable dictionary representation of the golden case details."""
    return {
        "session_id": GOLDEN_SESSION_ID,
        "case_id": GOLDEN_CASE_ID,
        "channel": "PHONE",
        "citizen_identifier": "+91-98765-43210",
        "suspect_identifier": "+91-91234-56789",
        "upi_id": "secure-safety@ybl",
        "bank_account": "999888777123",
        "citizen_name": "Rajesh Kumar",
        "scam_type": "IMPERSONATION",
        "risk_score": 0.92,
        "severity": "CRITICAL",
        "status": "INVESTIGATING",
    }


def seed_db(db_url: str = None):
    """Seed the database with the golden public safety case and related entities."""
    settings = get_settings()
    url = db_url or settings.effective_database_url

    # Create engine and recreate tables
    engine = create_engine(url, connect_args={"check_same_thread": False} if "sqlite" in url else {})
    Base.metadata.create_all(bind=engine)

    session_cls = sessionmaker(bind=engine)
    session = session_cls()

    try:
        # Clear existing tables (order matters for FKs)
        session.query(AuditEvent).delete()
        session.query(NoteScan).delete()
        session.query(GeoEvent).delete()
        session.query(Relationship).delete()
        session.query(Entity).delete()
        session.query(AnalystNote).delete()
        session.query(InterventionAction).delete()
        session.query(IncidentCase).delete()
        session.query(ThreatVerdict).delete()
        session.query(ThreatIndicator).delete()
        session.query(TranscriptSegment).delete()
        session.query(CommunicationSession).delete()
        session.commit()

        # 1. Threat Indicators
        indicators = [
            ThreatIndicator(
                code="TI-101",
                name="Impersonation Pattern",
                description="Caller claims to represent a financial/legal institution without verification.",
                category="Identity Theft",
                severity="HIGH",
            ),
            ThreatIndicator(
                code="TI-102",
                name="Urgency Coercion",
                description="Use of psychological pressure, threatening instant losses or police action.",
                category="Social Engineering",
                severity="CRITICAL",
            ),
            ThreatIndicator(
                code="TI-103",
                name="Counterfeit Serial Alert",
                description="Scanned currency matching serial sequences of known counterfeit rings.",
                category="Financial Counterfeit",
                severity="HIGH",
            ),
        ]
        session.add_all(indicators)

        # 2. Communication Session (The Active Scam Call)
        comm_session = CommunicationSession(
            id=GOLDEN_SESSION_ID,
            channel="PHONE",
            citizen_identifier="+91-98765-43210",
            suspect_identifier="+91-91234-56789",
            status="ACTIVE",
            metadata_json=json.dumps({"call_origin": "Noida", "device_type": "VoIP"}),
        )
        session.add(comm_session)

        # 3. Transcript Segments (rolling conversation)
        segments = [
            TranscriptSegment(
                session_id=GOLDEN_SESSION_ID,
                speaker="CITIZEN",
                text="Hello, who is this?",
                timestamp=datetime.utcnow() - timedelta(minutes=5),
                confidence=0.98,
            ),
            TranscriptSegment(
                session_id=GOLDEN_SESSION_ID,
                speaker="SUSPECT",
                text="Hello, I am calling from the bank. Your account has been compromised. You need to transfer funds immediately to secure your money.",
                timestamp=datetime.utcnow() - timedelta(minutes=4),
                confidence=0.95,
            ),
            TranscriptSegment(
                session_id=GOLDEN_SESSION_ID,
                speaker="CITIZEN",
                text="Oh no, really? What should I do?",
                timestamp=datetime.utcnow() - timedelta(minutes=3),
                confidence=0.99,
            ),
            TranscriptSegment(
                session_id=GOLDEN_SESSION_ID,
                speaker="SUSPECT",
                text="Please make a transfer of ₹50,000 to our safety UPI ID: secure-safety@ybl.",
                timestamp=datetime.utcnow() - timedelta(minutes=2),
                confidence=0.96,
            ),
        ]
        session.add_all(segments)

        # 4. Threat Verdict
        verdict = ThreatVerdict(
            session_id=GOLDEN_SESSION_ID,
            verdict="CRITICAL",
            scam_type="IMPERSONATION",
            confidence=0.95,
            normalized_risk_score=0.92,
            triggered_indicators_json=json.dumps(["TI-101", "TI-102"]),
            evidence_snippets_json=json.dumps(
                ["calling from the bank", "transfer funds immediately", "safety UPI ID: secure-safety@ybl"]
            ),
            recommended_action="BLOCK_UPI_TRANSACTION",
            model_version="kavach-nlp-v1",
            rule_version="kavach-rules-1.2",
            timestamp=datetime.utcnow(),
            limitations="Based on NLP transcription parsing of VoIP phone calls.",
        )
        session.add(verdict)

        # 5. Incident Case
        case = IncidentCase(
            id=GOLDEN_CASE_ID,
            title="Active Bank Impersonation Scam Case",
            description="VoIP call originating from Noida sector targeting Rajesh Kumar (+91-98765-43210). Scammer attempting to redirect funds to secure-safety@ybl.",
            severity="CRITICAL",
            status="INVESTIGATING",
            assigned_to="Analyst-01",
            session_id=GOLDEN_SESSION_ID,
        )
        session.add(case)

        # 6. Analyst Note
        note = AnalystNote(
            case_id=GOLDEN_CASE_ID,
            author="Analyst-01",
            note_text="Initial verification complete. Scammer matches profile of Noida Cyber-Thief ring. Interventions (UPI Block) successfully triggered automatically.",
        )
        session.add(note)

        # 7. Intervention Action
        intervention = InterventionAction(
            session_id=GOLDEN_SESSION_ID,
            incident_id=GOLDEN_CASE_ID,
            action_type="BLOCK_UPI",
            status="COMPLETED",
            details_json=json.dumps(
                {
                    "upi_id": "secure-safety@ybl",
                    "reason": "Associated with active impersonation scam call",
                    "block_duration": "permanent",
                }
            ),
            triggered_by="threat_engine",
            timestamp=datetime.utcnow(),
        )
        session.add(intervention)

        # 8. Entities (Network Graph)
        # We add fraud ring entities: script signatures, devices, extra suspects, note scan seizures
        SCRIPT_SIG_ID = "e11e8400-e29b-41d4-a716-446655440006"
        SUSPECT_2_PHONE_ID = "e11e8400-e29b-41d4-a716-446655440007"
        DEVICE_ID = "e11e8400-e29b-41d4-a716-446655440008"
        NOTE_SCAN_ENT_ID = "e11e8400-e29b-41d4-a716-446655440009"
        
        entities = [
            Entity(id=GOLDEN_CITIZEN_PHONE_ID, type="PHONE", value="+91-98765-43210", risk_score=5.0),
            Entity(id=GOLDEN_SUSPECT_PHONE_ID, type="PHONE", value="+91-91234-56789", risk_score=95.0),
            Entity(id=GOLDEN_UPI_ID, type="UPI_ID", value="secure-safety@ybl", risk_score=98.0),
            Entity(id=GOLDEN_ACCOUNT_ID, type="BANK_ACCOUNT", value="999888777123", risk_score=90.0),
            Entity(id=GOLDEN_CITIZEN_NAME_ID, type="NAME", value="Rajesh Kumar", risk_score=0.0),
            Entity(id=SCRIPT_SIG_ID, type="SCRIPT_SIGNATURE", value="SIG-IMPERSONATION-01", risk_score=100.0),
            Entity(id=SUSPECT_2_PHONE_ID, type="PHONE", value="+91-91234-99999", risk_score=85.0),
            Entity(id=DEVICE_ID, type="DEVICE", value="IMEI:3555333444555", risk_score=90.0),
            Entity(id=NOTE_SCAN_ENT_ID, type="COUNTERFEIT_SEIZURE", value="SEIZURE-5EF678901", risk_score=100.0),
        ]
        session.add_all(entities)

        # 9. Entity Relationships (Network Graph Links)
        now = datetime.utcnow()
        relationships = [
            Relationship(
                source_entity_id=GOLDEN_CITIZEN_NAME_ID,
                target_entity_id=GOLDEN_CITIZEN_PHONE_ID,
                type="ASSOCIATED_WITH",
                risk_score=5.0,
                evidence_source="KYC Records",
                confidence=0.99,
                method="EXACT_MATCH",
                first_seen=now - timedelta(days=365),
                last_seen=now,
                provenance="Telecom Registry",
                explanation="Verified phone number for citizen.",
                details_json=json.dumps({"description": "Primary owner phone number"}),
            ),
            Relationship(
                source_entity_id=GOLDEN_SUSPECT_PHONE_ID,
                target_entity_id=GOLDEN_CITIZEN_PHONE_ID,
                type="CONTACTED",
                risk_score=95.0,
                evidence_source="Telecom Intercept",
                confidence=1.0,
                method="EXACT_MATCH",
                first_seen=now - timedelta(minutes=5),
                last_seen=now,
                provenance="Kavach Ingestion",
                explanation="Suspect initiated VoIP call to citizen.",
                details_json=json.dumps({"call_duration_sec": 180}),
            ),
            Relationship(
                source_entity_id=GOLDEN_SUSPECT_PHONE_ID,
                target_entity_id=GOLDEN_UPI_ID,
                type="TRANSFER_REQUESTED_TO",
                risk_score=98.0,
                evidence_source="Transcript Parsing",
                confidence=0.96,
                method="NLP_EXTRACTION",
                first_seen=now - timedelta(minutes=2),
                last_seen=now,
                provenance="Threat Engine",
                explanation="Suspect verbalized UPI handle for fund transfer.",
                details_json=json.dumps({"attempted_transfer_amount": 50000}),
            ),
            Relationship(
                source_entity_id=GOLDEN_UPI_ID,
                target_entity_id=GOLDEN_ACCOUNT_ID,
                type="ASSOCIATED_WITH",
                risk_score=90.0,
                evidence_source="Bank API",
                confidence=1.0,
                method="EXACT_MATCH",
                first_seen=now - timedelta(days=30),
                last_seen=now,
                provenance="NPCI Network",
                explanation="UPI handle mapped to State Bank of India account.",
                details_json=json.dumps({"bank": "State Bank of India"}),
            ),
            # Fraud Ring connections
            Relationship(
                source_entity_id=GOLDEN_SUSPECT_PHONE_ID,
                target_entity_id=SCRIPT_SIG_ID,
                type="REUSED_SCRIPT",
                risk_score=100.0,
                evidence_source="NLP Clustering",
                confidence=0.92,
                method="FUZZY_MATCH",
                first_seen=now - timedelta(days=10),
                last_seen=now,
                provenance="Kavach Analytics",
                explanation="Suspect used known impersonation script.",
                details_json="{}",
            ),
            Relationship(
                source_entity_id=SUSPECT_2_PHONE_ID,
                target_entity_id=SCRIPT_SIG_ID,
                type="REUSED_SCRIPT",
                risk_score=100.0,
                evidence_source="NLP Clustering",
                confidence=0.88,
                method="FUZZY_MATCH",
                first_seen=now - timedelta(days=5),
                last_seen=now,
                provenance="Kavach Analytics",
                explanation="Another suspect used the same impersonation script.",
                details_json="{}",
            ),
            Relationship(
                source_entity_id=SUSPECT_2_PHONE_ID,
                target_entity_id=GOLDEN_UPI_ID,
                type="TRANSFER_REQUESTED_TO",
                risk_score=98.0,
                evidence_source="Transcript Parsing",
                confidence=0.95,
                method="NLP_EXTRACTION",
                first_seen=now - timedelta(days=2),
                last_seen=now,
                provenance="Threat Engine",
                explanation="Second suspect also requested funds to this UPI handle.",
                details_json="{}",
            ),
            Relationship(
                source_entity_id=GOLDEN_SUSPECT_PHONE_ID,
                target_entity_id=DEVICE_ID,
                type="SHARED_DEVICE",
                risk_score=90.0,
                evidence_source="App Telemetry",
                confidence=1.0,
                method="EXACT_MATCH",
                first_seen=now - timedelta(days=10),
                last_seen=now,
                provenance="Device Fingerprinting",
                explanation="VoIP client running on IMEI:3555333444555.",
                details_json="{}",
            ),
            Relationship(
                source_entity_id=NOTE_SCAN_ENT_ID,
                target_entity_id=SUSPECT_2_PHONE_ID,
                type="LINKED_TO_CASE",
                risk_score=95.0,
                evidence_source="Police Investigation",
                confidence=0.8,
                method="MANUAL_ENTRY",
                first_seen=now - timedelta(days=1),
                last_seen=now,
                provenance="Field Operations",
                explanation="Suspect 2 phone seized along with counterfeit notes.",
                details_json="{}",
            ),
            Relationship(
                source_entity_id=GOLDEN_SUSPECT_PHONE_ID,
                target_entity_id=SUSPECT_2_PHONE_ID,
                type="POSSIBLE_SAME_ACTOR",
                risk_score=50.0,
                evidence_source="Voice Biometrics",
                confidence=0.55,
                method="WEAK_FUZZY_MATCH",
                first_seen=now - timedelta(days=1),
                last_seen=now,
                provenance="Kavach Intelligence",
                explanation="Voice frequency match suggests possible same actor.",
                details_json="{}",
            ),
        ]
        session.add_all(relationships)

        # 10. GeoRegion & GeoEvents (Map Markers)
        # Create Synthetic Demo City Regions (Neo-Delhi)
        geo_regions = [
            GeoRegion(
                name="Noida Cyber Zone",
                region_type="DISTRICT",
                center_latitude=28.6273,
                center_longitude=77.3725,
                boundary_geojson=json.dumps({"type":"Polygon","coordinates":[[[77.36,28.61],[77.38,28.61],[77.38,28.64],[77.36,28.64],[77.36,28.61]]]}),
                population_density=12000.0
            ),
            GeoRegion(
                name="Connaught Place Commercial",
                region_type="DISTRICT",
                center_latitude=28.6304,
                center_longitude=77.2177,
                boundary_geojson=json.dumps({"type":"Polygon","coordinates":[[[77.20,28.62],[77.23,28.62],[77.23,28.64],[77.20,28.64],[77.20,28.62]]]}),
                population_density=25000.0
            )
        ]
        session.add_all(geo_regions)
        session.commit() # Commit to get IDs if needed
        
        geo_events = [
            GeoEvent(
                title="Active Scam Call Origin (Noida Sector 62)",
                description="Cell tower VoIP gateway ping routing scam call",
                event_type="CALL_THREAT",
                latitude=28.6273,
                longitude=77.3725,
                risk_score=95.0,
                timestamp=now,
                source_case_id=GOLDEN_CASE_ID,
                confidence=0.9,
                aggregation_level="WARD",
                privacy_transformation="JITTERED",
                provenance="Telecom Operator"
            ),
            GeoEvent(
                title="Target Citizen Location (Connaught Place)",
                description="Delhi base station receiving scam VoIP call",
                event_type="CALL_THREAT",
                latitude=28.6304,
                longitude=77.2177,
                risk_score=5.0,
                timestamp=now,
                source_case_id=GOLDEN_CASE_ID,
                confidence=0.95,
                aggregation_level="WARD",
                privacy_transformation="COARSENED",
                provenance="Telecom Operator"
            ),
            GeoEvent(
                title="Counterfeit Seizure Node (New Delhi Rly Station)",
                description="Seized batch of ₹500 counterfeit serial 5EF678901",
                event_type="NOTE_SCAN",
                latitude=28.6415,
                longitude=77.2209,
                risk_score=80.0,
                timestamp=now - timedelta(hours=2),
                source_case_id=None,
                confidence=1.0,
                aggregation_level="EXACT",
                privacy_transformation="NONE",
                provenance="Police Scan"
            ),
        ]
        
        # Add historical events for temporal replay (scam campaign buildup)
        for i in range(1, 10):
            geo_events.append(GeoEvent(
                title=f"Historical Scam Ping {i}",
                description="Prior VoIP ping from this cluster",
                event_type="CALL_THREAT",
                latitude=28.6200 + (i * 0.001),
                longitude=77.3700 + (i * 0.001),
                risk_score=75.0 + i,
                timestamp=now - timedelta(hours=i*4),
                source_case_id=None,
                confidence=0.8,
                aggregation_level="GRID_CELL",
                privacy_transformation="JITTERED",
                provenance="Threat Engine Analytics"
            ))
            
        session.add_all(geo_events)

        # 11. Counterfeit scans
        scan = NoteScan(
            suspect_serial_number="5EF678901",
            denomination="₹500",
            scan_result="COUNTERFEIT",
            confidence=0.89,
            analysis_details_json=json.dumps({"watermark_missing": True, "paper_weight_deviation": "15%"}),
            examiner_id="Officer Sharma",
            image_path="/scans/5ef678901.jpg",
        )
        session.add(scan)

        # 12. Audit Events
        audit = AuditEvent(
            actor_id="threat_engine",
            actor_role="ADMIN",
            action="AUTO_INTERVENTION",
            resource="UPI_ID",
            resource_id="secure-safety@ybl",
            status="SUCCESS",
            details_json=json.dumps({"action": "BLOCK_UPI", "blocked": True}),
            ip_address="127.0.0.1",
            timestamp=datetime.utcnow(),
        )
        session.add(audit)

        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
