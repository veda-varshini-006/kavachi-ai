from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from kavach_api.database import get_db
from kavach_api.services.replay import ScenarioReplayService
from kavach_domain.models import DeadLetter
from kavach_api.events.bus import bus, EventEnvelope
import json
from kavach_api.auth import require_role

router = APIRouter(
    prefix="",
    dependencies=[Depends(require_role(["Admin", "Supervisor"]))]
)

@router.post("/demo/replay/{scenario_id}/start")
async def start_scenario_replay(scenario_id: str, db: Session = Depends(get_db)):
    if scenario_id == "campaign":
        res = await ScenarioReplayService.run_campaign_scenario(db)
        return {"status": "started", "details": res}
        
    try:
        session_id = await ScenarioReplayService.run_scenario(scenario_id, db)
        return {"status": "started", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ops/reconcile")
def reconcile_dead_letters(db: Session = Depends(get_db)):
    """Requeue all dead letters into the outbox for reconciliation."""
    dead_letters = db.query(DeadLetter).all()
    count = len(dead_letters)
    for dl in dead_letters:
        # Publish back to outbox
        bus.publish_sync(db, EventEnvelope(
            event_type=dl.event_type,
            payload=json.loads(dl.payload_json),
            correlation_id=dl.correlation_id,
            causation_id=dl.causation_id,
            retry_count=0 # Reset retry
        ))
        db.delete(dl)
    db.commit()
    return {"status": "success", "reconciled_count": count}
