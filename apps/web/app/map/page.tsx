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
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 relative">
      {/* Background Image for Map Module with Izanami Blend */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/map-bg.jpg"
          alt="Topographic Map Background"
          className="w-full h-full object-cover opacity-10 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
      </div>

      <div className="flex flex-col space-y-4 h-full relative z-10 max-w-[1600px] mx-auto w-full pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 shrink-0">
          <div>
            <h1 className="font-serif text-3xl text-white font-medium mb-3 flex items-center gap-3">
              <Compass className="h-6 w-6 text-accentGold" strokeWidth={1.5} />
              Geospatial Intelligence Layer
            </h1>
            <p className="text-sm text-gray-500 font-light max-w-2xl leading-relaxed tracking-wide">
              Privacy-preserving spatial aggregation and hotspot analysis for cybercrime nodes.
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex gap-4 items-center pt-4 md:pt-0">
            <div className="border-b border-white/20 pb-2 flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs text-gray-400 font-light tracking-widest uppercase">
                <Clock className="w-3.5 h-3.5 text-accentGold" strokeWidth={1.5} />
                <span>Time: Last {timeWindow}h</span>
                <input 
                  type="range" 
                  min="1" 
                  max="72" 
                  value={timeWindow} 
                  onChange={e => setTimeWindow(parseInt(e.target.value))}
                  className="ml-2 accent-accentGold w-24"
                />
              </div>
              <div className="w-px h-4 bg-white/10"></div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-xs text-gray-300 font-light uppercase tracking-widest focus:outline-none focus:text-white [&>option]:bg-background [&>option]:text-white"
              >
                <option value="">All Events</option>
                <option value="CALL_THREAT">Scam Calls</option>
                <option value="NOTE_SCAN">Note Scans</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-8 min-h-0 pt-4">
          {/* Map Container */}
          <div className="flex-1 relative border border-white/5 bg-background/50 backdrop-blur-sm">
            {/* Layer Toggles Floating over map */}
            <div className="absolute top-6 left-6 z-10 bg-background/80 backdrop-blur-md border border-white/10 p-4 flex flex-col gap-4">
              <label className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-300 cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="accent-accentGold" />
                Hotspot Density
              </label>
              <label className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-300 cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" checked={showScatter} onChange={e => setShowScatter(e.target.checked)} className="accent-accentGold" />
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
          <div className="w-96 shrink-0 border-l border-white/5 pl-8 overflow-y-auto hidden lg:block">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 mb-8 flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-accentGold" strokeWidth={1.5} />
              Intelligence Detail
            </h2>

            {selectedEvent ? (
              <div className="space-y-8">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500">Node Identified</span>
                  <p className="font-serif text-xl font-light text-white mt-2">{selectedEvent.title}</p>
                </div>

                {/* Privacy Transformation Display */}
                <div className="border-t border-b border-white/5 py-6 space-y-4">
                  <span className="text-[9px] uppercase tracking-widest font-medium text-accentGold block">Privacy Masking Active</span>
                  <div className="flex justify-between items-center text-xs text-gray-400 font-light">
                    <span>Method:</span>
                    <span className="font-mono text-white/70">{selectedEvent.privacy_transformation}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400 font-light">
                    <span>Precision:</span>
                    <span className="font-mono text-white/70">{selectedEvent.aggregation_level}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500">Geospatial Coordinates</span>
                  <p className="text-xs font-mono text-gray-400 font-light">
                    LAT: {selectedEvent.latitude.toFixed(4)} <br />
                    LON: {selectedEvent.longitude.toFixed(4)}
                  </p>
                </div>

                <div className="space-y-3">
                  <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block">Threat Indicators</span>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-[9px] font-medium tracking-widest px-2 py-1 uppercase border ${
                        selectedEvent.risk_score >= 80
                          ? "text-red-500 border-red-500/30"
                          : "text-accentGold border-accentGold/30"
                      }`}
                    >
                      {selectedEvent.risk_score >= 80 ? "Critical" : "Warning"}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">Score: {selectedEvent.risk_score}%</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 space-y-3">
                  <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block">Metadata</span>
                  <p className="text-xs text-gray-400 font-light leading-relaxed">{selectedEvent.description}</p>
                  <div className="text-[9px] uppercase tracking-widest text-gray-600 mt-4 space-y-1">
                    <p>Source: {selectedEvent.provenance || "Internal"}</p>
                    <p>Recorded: {formatDistanceToNow(new Date(selectedEvent.timestamp))} ago</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center text-gray-500">
                <MapPin className="h-6 w-6 text-accentGold mb-4 opacity-50" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-widest font-light">Select a node to inspect logs.</p>
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
    </div>
  );
}
