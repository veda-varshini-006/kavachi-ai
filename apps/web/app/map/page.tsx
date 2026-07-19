"use client";

import { useEffect, useState, useMemo } from "react";
import { MapPin, Radio, Compass, ShieldAlert, Layers, Clock, Settings, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Map dependencies
import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import "maplibre-gl/dist/maplibre-gl.css";

interface GeoEvent {
  id: string;
  title: string;
  description: string;
  event_type: "CALL_THREAT" | "NOTE_SCAN" | "FRAUD_NODE";
  latitude: number;
  longitude: number;
  risk_score: number;
  timestamp: string;
  source_case_id?: string;
  confidence: number;
  aggregation_level: string;
  privacy_transformation: string;
  provenance?: string;
}

interface GeoRegion {
  id: string;
  name: string;
  region_type: string;
  boundary_geojson: any;
  center_latitude: number;
  center_longitude: number;
}

interface Hotspot {
  latitude: number;
  longitude: number;
  event_count: number;
  hotspot_score: number;
  explanation: any;
}

const INITIAL_VIEW_STATE = {
  longitude: 77.2177,
  latitude: 28.6304,
  zoom: 10,
  pitch: 45,
  bearing: 0,
};

export default function GeospatialMap() {
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GeoEvent | null>(null);
  
  const [filterType, setFilterType] = useState<string>("");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showScatter, setShowScatter] = useState(true);
  
  // Temporal replay filter (in hours ago, 0 = now, 24 = 24h ago)
  const [timeWindow, setTimeWindow] = useState<number>(24);
  
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const now = Math.floor(Date.now() / 1000);
      const start = now - (timeWindow * 3600);
      
      // Events
      let evQuery = `/api/v1/intelligence/map?start_time=${start}&end_time=${now}`;
      if (filterType) evQuery += `&event_type=${filterType}`;
      const evRes = await fetch(evQuery);
      const evData = await evRes.json();
      setEvents(evData || []);

      // Hotspots
      const hsRes = await fetch(`/api/v1/intelligence/map/hotspots?start_time=${start}&end_time=${now}`);
      const hsData = await hsRes.json();
      setHotspots(hsData || []);
      
      // Regions (only once ideally, but here for simplicity)
      if (regions.length === 0) {
        const regRes = await fetch("/api/v1/intelligence/map/regions");
        const regData = await regRes.json();
        setRegions(regData || []);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, timeWindow]);

  const layers = [
    showHeatmap && new HeatmapLayer({
      id: 'heatmap-layer',
      data: hotspots,
      getPosition: d => [d.longitude, d.latitude],
      getWeight: d => d.hotspot_score,
      radiusPixels: 60,
      intensity: 1,
      threshold: 0.1
    }),
    showScatter && new ScatterplotLayer({
      id: 'scatter-layer',
      data: events,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 10,
      radiusMinPixels: 5,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 2,
      getPosition: d => [d.longitude, d.latitude],
      getFillColor: d => d.event_type === 'CALL_THREAT' ? [239, 68, 68] : [245, 158, 11],
      getLineColor: d => [255, 255, 255],
      onClick: ({object}) => {
        if (object) {
          setSelectedEvent(object as GeoEvent);
        }
      }
    })
  ].filter(Boolean);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="h-6 w-6 text-accentTeal" />
            Geospatial Intelligence Layer
          </h1>
          <p className="text-sm text-gray-400">
            Privacy-preserving spatial aggregation and hotspot analysis for cybercrime nodes.
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex gap-4 items-center">
          <div className="bg-cardBg border border-borderBg rounded-lg p-2 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Time Window: Last {timeWindow} hours</span>
              <input 
                type="range" 
                min="1" 
                max="72" 
                value={timeWindow} 
                onChange={e => setTimeWindow(parseInt(e.target.value))}
                className="ml-2 accent-accentTeal"
              />
            </div>
            <div className="w-px h-4 bg-borderBg"></div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-sm text-gray-300 focus:outline-none"
            >
              <option value="">All Event Types</option>
              <option value="CALL_THREAT">Scam Calls</option>
              <option value="NOTE_SCAN">Note Scans</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Map Container */}
        <div className="flex-1 relative rounded-xl overflow-hidden border border-borderBg bg-cardBg">
          {/* Layer Toggles Floating over map */}
          <div className="absolute top-4 left-4 z-10 bg-cardBg/90 backdrop-blur border border-borderBg rounded-lg p-2 flex flex-col gap-2 shadow-xl">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="accent-accentTeal" />
              Hotspot Density
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={showScatter} onChange={e => setShowScatter(e.target.checked)} className="accent-accentTeal" />
              Discrete Nodes
            </label>
          </div>

          <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={true}
            layers={layers}
            getTooltip={({object}) => object && (object.title || `Hotspot Score: ${object.hotspot_score}`)}
          >
            <Map
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            />
          </DeckGL>
        </div>

        {/* Intelligence Side Drawer */}
        <div className="w-96 shrink-0 rounded-xl border border-borderBg bg-cardBg p-5 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-6 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Intelligence Detail
          </h2>

          {selectedEvent ? (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Node Identified</span>
                <p className="text-sm font-bold text-white mt-1">{selectedEvent.title}</p>
              </div>

              {/* Privacy Transformation Display */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-borderBg/50">
                <span className="text-[10px] uppercase font-bold text-accentAmber block mb-1">Privacy Masking Active</span>
                <div className="flex justify-between items-center text-xs text-gray-300">
                  <span>Method:</span>
                  <span className="font-mono">{selectedEvent.privacy_transformation}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-300 mt-1">
                  <span>Precision:</span>
                  <span className="font-mono">{selectedEvent.aggregation_level}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Geospatial Coordinates</span>
                <p className="text-xs font-mono text-gray-300 mt-1">
                  LAT: {selectedEvent.latitude.toFixed(4)} <br />
                  LON: {selectedEvent.longitude.toFixed(4)}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Threat Indicators</span>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                      selectedEvent.risk_score >= 80
                        ? "bg-accentRed/10 text-accentRed border border-accentRed/20"
                        : "bg-accentAmber/10 text-accentAmber border border-accentAmber/20"
                    }`}
                  >
                    {selectedEvent.risk_score >= 80 ? "Critical" : "Warning"}
                  </span>
                  <span className="text-xs text-gray-400">Score: {selectedEvent.risk_score}%</span>
                </div>
              </div>

              <div className="border-t border-borderBg pt-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-500">Metadata</span>
                <p className="text-xs text-gray-300 leading-relaxed">{selectedEvent.description}</p>
                <div className="text-[10px] text-gray-500 mt-2">
                  Source: {selectedEvent.provenance || "Internal"} <br />
                  Recorded: {formatDistanceToNow(new Date(selectedEvent.timestamp))} ago
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-gray-600">
              <MapPin className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">Select a discrete node or hotspot on the map to inspect intelligence logs.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Table Fallback for Accessibility */}
      <div className="sr-only">
        <h2>Accessible Region Data</h2>
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Center Latitude</th>
              <th>Center Longitude</th>
            </tr>
          </thead>
          <tbody>
            {regions.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.center_latitude}</td>
                <td>{r.center_longitude}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
