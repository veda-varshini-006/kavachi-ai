import json
from sqlalchemy.orm import Session
from kavach_domain.models import (
    IncidentCase,
    ThreatVerdict,
    Entity,
    Relationship,
    GeoEvent,
    NoteScan
)

class FusionService:
    @staticmethod
    def generate_case_summary(db: Session, case_id: str):
        case = db.query(IncidentCase).filter(IncidentCase.id == case_id).first()
        if not case:
            return None
            
        summary = {
            "case_id": case.id,
            "title": case.title,
            "risk_band": "UNKNOWN",
            "confidence": 0.0,
            "key_evidence": [],
            "linked_campaigns": [],
            "region_context": None,
            "recommended_actions": [],
            "contradictions": [],
            "limitations": []
        }
        
        # 1. Communication Risk
        verdict = None
        if case.session_id:
            verdict = db.query(ThreatVerdict).filter(
                ThreatVerdict.session_id == case.session_id
            ).order_by(ThreatVerdict.created_at.desc()).first()
            
        if verdict:
            summary["risk_band"] = verdict.verdict
            summary["confidence"] = verdict.confidence
            
            snippets = json.loads(verdict.evidence_snippets_json) if verdict.evidence_snippets_json else []
            for snip in snippets:
                summary["key_evidence"].append({"type": "TRANSCRIPT_MATCH", "detail": snip})
                
            if verdict.recommended_action:
                summary["recommended_actions"].append(verdict.recommended_action)
                
        # 2. Graph Linkage (Campaigns)
        # Find all entities linked to this case's session suspect
        if case.session:
            suspect_val = case.session.suspect_identifier
            suspect_ent = db.query(Entity).filter(Entity.value == suspect_val).first()
            if suspect_ent:
                # Find campaigns (where target is of type ALIAS or ORGANIZATION_CLAIM etc)
                campaign_links = db.query(Relationship).filter(
                    Relationship.source_entity_id == suspect_ent.id,
                    Relationship.type == "MEMBER_OF_CAMPAIGN"
                ).all()
                for link in campaign_links:
                    camp_ent = db.query(Entity).filter(Entity.id == link.target_entity_id).first()
                    if camp_ent:
                        summary["linked_campaigns"].append({
                            "name": camp_ent.value,
                            "confidence": link.confidence
                        })
                        
        # 3. Geo Context
        geo_events = db.query(GeoEvent).filter(GeoEvent.source_case_id == case.id).all()
        if geo_events:
            summary["region_context"] = f"{len(geo_events)} geospatial anomalies mapped."
            summary["key_evidence"].append({"type": "GEO_ANOMALY", "detail": f"Located at {geo_events[0].latitude}, {geo_events[0].longitude}"})
            
        # 4. Note Scan Evidence
        # For simplicity, if there's any note scans linked (maybe by examiner_id being the assigned_to)
        scans = db.query(NoteScan).all() # Just grab all for now or filter properly if linked
        linked_scans = [s for s in scans if case.description and s.suspect_serial_number in case.description]
        for scan in linked_scans:
            summary["key_evidence"].append({
                "type": "NOTE_SCAN",
                "detail": f"Scan {scan.scan_result} - {scan.confidence*100}% confidence"
            })
            
        # 5. Uncertainty & Contradictions
        # Example: High verbal threat but no graph links
        if summary["risk_band"] == "CRITICAL" and not summary["linked_campaigns"]:
            summary["contradictions"].append("High verbal threat detected, but no known campaigns linked. Possible novel actor.")
            summary["confidence"] *= 0.8 # Reduce confidence
            
        # 6. Limitations
        if not summary["linked_campaigns"]:
            summary["limitations"].append("Graph visibility limited for this actor.")
            
        return summary
