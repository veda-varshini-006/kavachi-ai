import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from kavach_domain.models import GeoEvent, GeoRegion

class GeospatialService:
    MINIMUM_COUNT_THRESHOLD = 3

    @staticmethod
    def jitter_coordinates(lat: float, lon: float, amount: float = 0.005) -> tuple[float, float]:
        """
        Adds random noise to coordinates for privacy transformation.
        0.005 degrees is roughly 500 meters at the equator.
        """
        j_lat = lat + random.uniform(-amount, amount)
        j_lon = lon + random.uniform(-amount, amount)
        return j_lat, j_lon
        
    @staticmethod
    def snap_to_grid(lat: float, lon: float, precision: int = 2) -> tuple[float, float]:
        """
        Coarsens coordinates by rounding to specific decimal places.
        2 decimal places is roughly 1km precision.
        """
        return round(lat, precision), round(lon, precision)

    @staticmethod
    def apply_privacy_transformation(event: GeoEvent) -> dict:
        """
        Applies privacy masking to an event based on its transformation rule.
        """
        res = {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "event_type": event.event_type,
            "risk_score": event.risk_score,
            "timestamp": event.timestamp.isoformat(),
            "source_case_id": event.source_case_id,
            "confidence": event.confidence,
            "aggregation_level": event.aggregation_level,
            "privacy_transformation": event.privacy_transformation,
            "provenance": event.provenance,
            "latitude": event.latitude,
            "longitude": event.longitude,
        }

        if event.privacy_transformation == "JITTERED":
            res["latitude"], res["longitude"] = GeospatialService.jitter_coordinates(event.latitude, event.longitude)
        elif event.privacy_transformation == "COARSENED":
            res["latitude"], res["longitude"] = GeospatialService.snap_to_grid(event.latitude, event.longitude)
        # IF NONE, keep raw

        return res

    @staticmethod
    def calculate_hotspots(db: Session, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """
        Aggregates events into spatial grids (hexbin/grid-cell) and applies minimum-count suppression.
        Returns the hotspot density and explainable score.
        """
        events = db.query(GeoEvent).filter(
            GeoEvent.timestamp >= start_time,
            GeoEvent.timestamp <= end_time
        ).all()

        # Grid aggregation (simple precision grouping)
        grid: dict[tuple[float, float], list[GeoEvent]] = {}
        
        for e in events:
            # Snap to 2 decimals for grid cell grouping
            cell = GeospatialService.snap_to_grid(e.latitude, e.longitude, precision=2)
            if cell not in grid:
                grid[cell] = []
            grid[cell].append(e)

        hotspots = []
        for cell, cell_events in grid.items():
            count = len(cell_events)
            
            # Privacy: Minimum-Count Suppression
            if count < GeospatialService.MINIMUM_COUNT_THRESHOLD:
                continue

            avg_score = sum(e.risk_score for e in cell_events) / count
            
            # Simple Explainable components
            types = list(set([e.event_type for e in cell_events]))
            cases = list(set([e.source_case_id for e in cell_events if e.source_case_id]))
            
            explanation = {
                "density_factor": count * 1.5,
                "severity_weight": avg_score,
                "dominant_types": types,
                "linked_cases_count": len(cases)
            }
            
            # Final hotpot risk score
            hotspot_score = min(100.0, (avg_score * 0.7) + (count * 5))

            hotspots.append({
                "latitude": cell[0],
                "longitude": cell[1],
                "event_count": count,
                "hotspot_score": hotspot_score,
                "explanation": explanation
            })
            
        return hotspots
