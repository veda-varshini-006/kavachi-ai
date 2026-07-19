import json

import structlog
from fastapi import APIRouter, Depends
from kavach_api.database import get_db
from kavach_domain.models import Entity, GeoEvent, NoteScan, Relationship
from kavach_domain.schemas import (
    GeoEventSchema,
    NoteScanCreate,
    NoteScanSchema,
)
from kavach_api.services.graph_analytics import GraphAnalyticsService
from sqlalchemy.orm import Session
from datetime import datetime
from kavach_api.auth import require_role

logger = structlog.get_logger()
router = APIRouter(
    prefix="/intelligence",
    dependencies=[Depends(require_role(["Analyst", "Supervisor", "Admin"]))]
)


@router.get("/graph", response_model=dict)
def get_fraud_graph(db: Session = Depends(get_db)):
    """Retrieve the entire synthetic entities network graph (nodes and links)."""
    G = GraphAnalyticsService.build_networkx_graph(db)
    
    nodes = []
    for n, d in G.nodes(data=True):
        nodes.append({"id": n, **d})
        
    links = []
    for u, v, d in G.edges(data=True):
        links.append({"source": u, "target": v, **d})

    return {
        "nodes": nodes,
        "links": links
    }

@router.get("/graph/clusters", response_model=list[dict])
def get_graph_clusters(db: Session = Depends(get_db)):
    """Retrieve campaign clusters identified by connected components."""
    G = GraphAnalyticsService.build_networkx_graph(db)
    return GraphAnalyticsService.get_campaign_clusters(G)

@router.get("/graph/neighborhood/{entity_id}", response_model=dict)
def get_graph_neighborhood(entity_id: str, radius: int = 1, db: Session = Depends(get_db)):
    """Retrieve the neighborhood of a specific entity."""
    G = GraphAnalyticsService.build_networkx_graph(db)
    return GraphAnalyticsService.expand_neighborhood(G, entity_id, radius)

@router.get("/graph/shortest-path", response_model=dict)
def get_shortest_path(source_id: str, target_id: str, db: Session = Depends(get_db)):
    """Find the shortest evidence path between two entities."""
    G = GraphAnalyticsService.build_networkx_graph(db)
    return GraphAnalyticsService.get_shortest_evidence_path(G, source_id, target_id)
    
@router.get("/graph/snapshot", response_model=dict)
def get_graph_snapshot(timestamp: float, db: Session = Depends(get_db)):
    """Retrieve the graph state as it was at a specific timestamp."""
    dt = datetime.fromtimestamp(timestamp)
    G = GraphAnalyticsService.build_networkx_graph(db, before_time=dt)
    
    nodes = []
    for n, d in G.nodes(data=True):
        nodes.append({"id": n, **d})
        
    links = []
    for u, v, d in G.edges(data=True):
        links.append({"source": u, "target": v, **d})

    return {
        "nodes": nodes,
        "links": links
    }
    
@router.post("/graph/review-link/{relationship_id}", response_model=dict)
def review_link(relationship_id: str, action: str, db: Session = Depends(get_db)):
    """Analyst confirms or rejects a weak (POSSIBLE_SAME_ACTOR) link."""
    rel = db.query(Relationship).filter(Relationship.id == relationship_id).first()
    if not rel:
        return {"error": "Relationship not found"}
        
    if action == "CONFIRM":
        rel.is_reviewed = True
        rel.is_rejected = False
    elif action == "REJECT":
        rel.is_reviewed = True
        rel.is_rejected = True
    else:
        return {"error": "Invalid action"}
        
    db.commit()
    return {"status": "success", "relationship_id": rel.id, "is_reviewed": rel.is_reviewed, "is_rejected": rel.is_rejected}



@router.get("/map", response_model=list[dict])
def get_geospatial_events(
    event_type: str | None = None,
    start_time: float | None = None,
    end_time: float | None = None,
    db: Session = Depends(get_db)
):
    """Retrieve geospatial location markers of public safety incidents with privacy transforms."""
    from kavach_api.services.geospatial import GeospatialService
    
    query = db.query(GeoEvent)
    if event_type:
        query = query.filter(GeoEvent.event_type == event_type)
        
    if start_time:
        query = query.filter(GeoEvent.timestamp >= datetime.fromtimestamp(start_time))
        
    if end_time:
        query = query.filter(GeoEvent.timestamp <= datetime.fromtimestamp(end_time))
        
    events = query.all()
    
    # Apply privacy transformations
    return [GeospatialService.apply_privacy_transformation(e) for e in events]


@router.get("/map/hotspots", response_model=list[dict])
def get_map_hotspots(
    start_time: float,
    end_time: float,
    db: Session = Depends(get_db)
):
    """Retrieve aggregated hotspot grids with explainable scores and min-count suppression."""
    from kavach_api.services.geospatial import GeospatialService
    
    dt_start = datetime.fromtimestamp(start_time)
    dt_end = datetime.fromtimestamp(end_time)
    
    return GeospatialService.calculate_hotspots(db, dt_start, dt_end)
    
    
@router.get("/map/regions", response_model=list[dict])
def get_map_regions(db: Session = Depends(get_db)):
    """Retrieve predefined geographic regions (offline-fallback boundaries)."""
    from kavach_domain.models import GeoRegion
    regions = db.query(GeoRegion).all()
    
    return [
        {
            "id": r.id,
            "name": r.name,
            "region_type": r.region_type,
            "boundary_geojson": json.loads(r.boundary_geojson),
            "center_latitude": r.center_latitude,
            "center_longitude": r.center_longitude,
            "population_density": r.population_density
        }
        for r in regions
    ]


@router.post("/note-scans", response_model=NoteScanSchema)
def create_note_scan(data: NoteScanCreate, db: Session = Depends(get_db)):
    """Create a new suspect counterfeit note scan record."""
    scan = NoteScan(
        suspect_serial_number=data.suspect_serial_number,
        denomination=data.denomination,
        scan_result=data.scan_result.value,
        confidence=data.confidence or 0.0,
        analysis_details_json=data.analysis_details_json or "{}",
        examiner_id=data.examiner_id,
        image_path=data.image_path
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return NoteScanSchema.model_validate(scan)


@router.get("/latency-diagnostics", response_model=dict)
def get_latency_diagnostics(db: Session = Depends(get_db)):
    """Retrieve p50/p95 latency metrics from processed transcript segments."""
    import math

    from kavach_domain.models import TranscriptSegment

    segments = db.query(TranscriptSegment).all()

    ingest_latencies = [s.ingest_latency_ms for s in segments if s.ingest_latency_ms is not None]
    processing_latencies = [s.processing_latency_ms for s in segments if s.processing_latency_ms is not None]

    def percentile(data, percent):
        if not data:
            return None
        data = sorted(data)
        k = (len(data) - 1) * percent
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return data[int(k)]
        d0 = data[int(f)] * (c - k)
        d1 = data[int(c)] * (k - f)
        return d0 + d1

    return {
        "ingest_p50": percentile(ingest_latencies, 0.50),
        "ingest_p95": percentile(ingest_latencies, 0.95),
        "processing_p50": percentile(processing_latencies, 0.50),
        "processing_p95": percentile(processing_latencies, 0.95),
        "total_count": len(segments)
    }
