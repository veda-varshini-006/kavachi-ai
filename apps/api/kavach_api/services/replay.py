import asyncio
import time
from sqlalchemy.orm import Session
from kavach_api.database import get_session_factory
from kavach_api.stt import ScriptedSTTProvider
from kavach_domain.models import CommunicationSession
from kavach_domain.schemas import CommunicationSessionCreate, TranscriptSegmentCreate
from kavach_api.routes.sessions import create_session, add_transcript_segment
from kavach_domain.schemas import GeoEventCreate, NoteScanCreate
from kavach_api.routes.intelligence import create_note_scan

stt_provider = ScriptedSTTProvider()

class ScenarioReplayService:
    @staticmethod
    async def run_scenario(scenario_id: str, db: Session):
        """Run a standard golden scenario"""
        # Note: in a real implementation this might use a background task and wait between steps.
        # For determinism and testing, we execute them rapidly.
        
        session_create = CommunicationSessionCreate(
            channel="PHONE",
            citizen_identifier=f"citizen-{scenario_id}",
            suspect_identifier=f"suspect-{scenario_id}",
            status="ACTIVE"
        )
        session = create_session(session_create, db)
        
        segments = stt_provider.scenarios.get(scenario_id, [])
        for i, seg in enumerate(segments):
            add_transcript_segment(
                session.id,
                TranscriptSegmentCreate(
                    speaker=seg["speaker"],
                    text=seg["text"],
                    confidence=1.0,
                    sequence_number=i,
                    client_timestamp=time.time()
                ),
                db
            )
            # await asyncio.sleep(0.1) # Simulate real time?
            
        return session.id

    @staticmethod
    async def run_campaign_scenario(db: Session):
        """Run the complex combined campaign scenario."""
        # 1. First victim
        session_create1 = CommunicationSessionCreate(
            channel="PHONE",
            citizen_identifier="citizen-victim-1",
            suspect_identifier="suspect-campaign-actor",
            status="ACTIVE"
        )
        session1 = create_session(session_create1, db)
        # Use digital-arrest script
        segments = stt_provider.scenarios.get("digital-arrest", [])
        for i, seg in enumerate(segments):
            add_transcript_segment(session1.id, TranscriptSegmentCreate(
                speaker=seg["speaker"], text=seg["text"], sequence_number=i
            ), db)
            
        # 2. Second victim, same suspect identifier
        session_create2 = CommunicationSessionCreate(
            channel="PHONE",
            citizen_identifier="citizen-victim-2",
            suspect_identifier="suspect-campaign-actor",
            status="ACTIVE"
        )
        session2 = create_session(session_create2, db)
        for i, seg in enumerate(segments):
            # Same script reused
            add_transcript_segment(session2.id, TranscriptSegmentCreate(
                speaker=seg["speaker"], text=seg["text"], sequence_number=i
            ), db)
            
        # 3. Counterfeit scan weakly linked
        scan_create = NoteScanCreate(
            suspect_serial_number="FAKE12345",
            denomination="500",
            scan_result="COUNTERFEIT",
            confidence=0.9,
            analysis_details_json='{"reason": "watermark missing"}',
            examiner_id="analyst"
        )
        scan = create_note_scan(scan_create, db)
        
        # Link it manually for the demo
        from kavach_domain.models import Entity, Relationship
        suspect_ent = db.query(Entity).filter(Entity.value == "suspect-campaign-actor").first()
        if suspect_ent:
            scan_ent = Entity(type="NOTE_SCAN", value=scan.id, risk_score=90.0)
            db.add(scan_ent)
            db.flush()
            
            rel = Relationship(
                source_entity_id=suspect_ent.id,
                target_entity_id=scan_ent.id,
                type="MEMBER_OF_CAMPAIGN",
                confidence=0.3,
                explanation="Weak contextual edge based on location proximity"
            )
            db.add(rel)
            db.commit()
            
        return {"session1": session1.id, "session2": session2.id, "scan": scan.id}
