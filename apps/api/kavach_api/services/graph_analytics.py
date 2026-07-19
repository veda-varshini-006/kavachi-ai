import datetime
import json
from typing import Any

import networkx as nx
from kavach_domain.models import Entity, Relationship
from sqlalchemy.orm import Session


class GraphAnalyticsService:
    @staticmethod
    def build_networkx_graph(db: Session, before_time: datetime.datetime | None = None) -> nx.Graph:
        """
        Builds a NetworkX graph from the Entity and Relationship tables.
        Optionally filters edges seen before a specific time for snapshots.
        """
        G = nx.Graph()
        
        # Load Entities
        entities = db.query(Entity).all()
        for ent in entities:
            G.add_node(
                ent.id, 
                type=ent.type, 
                value=ent.value, 
                risk_score=ent.risk_score
            )
            
        # Load Relationships
        query = db.query(Relationship)
        if before_time:
            query = query.filter(Relationship.first_seen <= before_time)
            
        relationships = query.all()
        for rel in relationships:
            G.add_edge(
                rel.source_entity_id, 
                rel.target_entity_id, 
                id=rel.id,
                type=rel.type,
                risk_score=rel.risk_score,
                evidence_source=rel.evidence_source,
                confidence=rel.confidence,
                method=rel.method,
                first_seen=rel.first_seen,
                last_seen=rel.last_seen,
                explanation=rel.explanation,
                is_reviewed=rel.is_reviewed,
                is_rejected=rel.is_rejected,
                details=json.loads(rel.details_json) if rel.details_json else {}
            )
            
        return G
        
    @staticmethod
    def get_campaign_clusters(G: nx.Graph) -> list[dict[str, Any]]:
        """
        Identify connected components to form campaign clusters and calculate cluster risk scores.
        """
        # Filter out rejected links for component analysis
        valid_edges = [(u, v) for u, v, d in G.edges(data=True) if not d.get("is_rejected", False)]
        G_valid = G.edge_subgraph(valid_edges).copy()
        
        # Add isolated nodes back
        for n in G.nodes():
            if n not in G_valid:
                G_valid.add_node(n, **G.nodes[n])
        
        components = list(nx.connected_components(G_valid))
        
        clusters = []
        for i, comp in enumerate(components):
            if len(comp) < 2:
                continue
                
            cluster_subgraph = G_valid.subgraph(comp)
            
            # Calculate metrics
            total_risk = sum(G_valid.nodes[n].get("risk_score", 0) for n in comp)
            avg_risk = total_risk / len(comp) if comp else 0
            
            has_repeated_script = any(
                d.get("type") == "REUSED_SCRIPT" 
                for u, v, d in cluster_subgraph.edges(data=True)
            )
            
            # Find central nodes
            try:
                centrality = nx.degree_centrality(cluster_subgraph)
                sorted_centrality = sorted(centrality.items(), key=lambda item: item[1], reverse=True)
                top_nodes = sorted_centrality[:3]
            except Exception:
                top_nodes = []
                
            # Cluster Risk Score (based on average risk, size, and repeated scripts)
            cluster_score = avg_risk + (5 if len(comp) > 3 else 0) + (10 if has_repeated_script else 0)
            cluster_score = min(100.0, cluster_score)
            
            clusters.append({
                "cluster_id": f"cluster-{i}",
                "size": len(comp),
                "risk_score": cluster_score,
                "has_repeated_script": has_repeated_script,
                "central_nodes": [{"id": n, "centrality": c, "value": G_valid.nodes[n].get("value")} for n, c in top_nodes],
                "explanation": f"Cluster of {len(comp)} entities with an average base risk of {avg_risk:.1f}. "
                               f"{'Includes highly suspicious repeated scripts.' if has_repeated_script else ''}"
            })
            
        return sorted(clusters, key=lambda c: c["risk_score"], reverse=True)
        
    @staticmethod
    def get_shortest_evidence_path(G: nx.Graph, source_id: str, target_id: str) -> dict[str, Any]:
        try:
            # Filter out rejected links
            valid_edges = [(u, v) for u, v, d in G.edges(data=True) if not d.get("is_rejected", False)]
            G_valid = G.edge_subgraph(valid_edges)
            
            path_nodes = nx.shortest_path(G_valid, source=source_id, target=target_id)
            
            path_edges = []
            for i in range(len(path_nodes) - 1):
                u, v = path_nodes[i], path_nodes[i+1]
                edge_data = G_valid.get_edge_data(u, v)
                path_edges.append({
                    "source": u,
                    "target": v,
                    "edge": edge_data
                })
                
            return {
                "found": True,
                "path_nodes": path_nodes,
                "path_edges": path_edges
            }
        except nx.NetworkXNoPath:
            return {"found": False, "reason": "No path exists between the entities."}
        except nx.NodeNotFound as e:
            return {"found": False, "reason": str(e)}

    @staticmethod
    def expand_neighborhood(G: nx.Graph, entity_id: str, radius: int = 1) -> dict[str, Any]:
        """
        Get the neighborhood of a given node up to a certain radius.
        """
        try:
            nodes_in_radius = set(nx.single_source_shortest_path_length(G, entity_id, cutoff=radius).keys())
            subgraph = G.subgraph(nodes_in_radius)
            
            nodes = []
            for n, d in subgraph.nodes(data=True):
                nodes.append({"id": n, **d})
                
            links = []
            for u, v, d in subgraph.edges(data=True):
                links.append({"source": u, "target": v, **d})
                
            return {
                "nodes": nodes,
                "links": links
            }
        except nx.NodeNotFound:
            return {"nodes": [], "links": []}
