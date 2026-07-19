import pytest
import datetime
from kavach_api.services.graph_analytics import GraphAnalyticsService
from kavach_domain.models import Entity, Relationship

def test_graph_building(db_session):
    e1 = Entity(id="e1", type="PHONE", value="123", risk_score=10.0)
    e2 = Entity(id="e2", type="UPI_ID", value="abc@ybl", risk_score=90.0)
    db_session.add_all([e1, e2])
    db_session.commit()
    
    r1 = Relationship(
        source_entity_id="e1",
        target_entity_id="e2",
        type="TRANSACTED_WITH",
        risk_score=50.0,
        evidence_source="Test",
        confidence=1.0,
        method="TEST",
        first_seen=datetime.datetime.utcnow(),
        last_seen=datetime.datetime.utcnow(),
    )
    db_session.add(r1)
    db_session.commit()
    
    G = GraphAnalyticsService.build_networkx_graph(db_session)
    assert len(G.nodes) == 2
    assert len(G.edges) == 1
    
    clusters = GraphAnalyticsService.get_campaign_clusters(G)
    assert len(clusters) == 1
    assert clusters[0]["size"] == 2
    
def test_shortest_path(db_session):
    G = GraphAnalyticsService.build_networkx_graph(db_session)
    # The previous test might have leaked if not isolated, but in a properly configured pytest env db is flushed.
    # We will assume db is empty or just create a new structure
    db_session.query(Relationship).delete()
    db_session.query(Entity).delete()
    
    e1 = Entity(id="e1", type="A", value="1")
    e2 = Entity(id="e2", type="B", value="2")
    e3 = Entity(id="e3", type="C", value="3")
    db_session.add_all([e1, e2, e3])
    db_session.commit()
    
    r1 = Relationship(source_entity_id="e1", target_entity_id="e2", type="R1")
    r2 = Relationship(source_entity_id="e2", target_entity_id="e3", type="R2")
    db_session.add_all([r1, r2])
    db_session.commit()
    
    G2 = GraphAnalyticsService.build_networkx_graph(db_session)
    path_info = GraphAnalyticsService.get_shortest_evidence_path(G2, "e1", "e3")
    
    assert path_info["found"] is True
    assert len(path_info["path_nodes"]) == 3
    assert path_info["path_nodes"][0] == "e1"
    assert path_info["path_nodes"][2] == "e3"
