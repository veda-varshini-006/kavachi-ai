"use client";

import { useEffect, useState, useRef } from "react";
import {
  Phone,
  PhoneOff,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  RefreshCw,
  Play,
  Volume2,
  Mic,
  MicOff,
  Trash2,
  HelpCircle
} from "lucide-react";
const GOLDEN_SESSION_ID = "SESSION-888-DEMO";

interface Segment {
  id?: string;
  speaker: string;
  text: string;
  timestamp: string;
  confidence: number;
  sequence_number: number;
  client_timestamp?: number;
  ingest_latency_ms?: number;
  processing_latency_ms?: number;
  render_latency_ms?: number;
  idempotency_key?: string;
}

interface TriggeredIndicator {
  code: string;
  name: string;
  severity: string;
  matched_segment_id: string;
  matched_text: string;
  explanation: string;
}

interface Verdict {
  verdict: "SAFE" | "SUSPICIOUS" | "CRITICAL";
  scam_type: string;
  confidence: number;
  normalized_risk_score: number;
  triggered_indicators: string[];
  evidence_snippets: string[];
  recommended_action?: string;
  stage?: string;
  detailed_indicators?: TriggeredIndicator[];
}

const SCENARIOS = [
  { id: "digital-arrest", name: "Digital Arrest (Multilingual)" },
  { id: "courier-impersonation", name: "Courier Customs (English)" },
  { id: "bank-impersonation", name: "Bank Account KYC (Telugu/Eng)" },
  { id: "phishing-link", name: "Phishing Reward Points (Tamil/Eng)" },
  { id: "benign-bank-support", name: "Benign Bank Support (Negative)" },
  { id: "benign-delivery-confirmation", name: "Benign Delivery boy (Negative)" },
  { id: "ambiguous-high-pressure", name: "Ambiguous High-Pressure Work Check" }
];

const STAGES = ["NORMAL", "CONCERN", "COERCION", "FINANCIAL_ACTION"];

export default function CallSimulator() {
  const [sessionActive, setSessionActive] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [simStep, setSimStep] = useState(1);
  const [intervention, setIntervention] = useState<string | null>(null);

  // Microphone and MediaRecorder state
  const [micConsent, setMicConsent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  // Demo Operator Drawer settings
  const [showDrawer, setShowDrawer] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedScenario, setSelectedScenario] = useState("digital-arrest");
  const [connectionStatusLog, setConnectionStatusLog] = useState<string[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const logConnection = (msg: string) => {
    setConnectionStatusLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  const connectWebSocket = (isReconnect = false) => {
    if (socketRef.current) return;

    const wsUrl = `ws://localhost:8001/api/v1/sessions/${GOLDEN_SESSION_ID}/stream`;
    logConnection(isReconnect ? "Attempting WebSocket reconnect..." : "Connecting to session stream...");

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setSocketConnected(true);
      logConnection("WebSocket connected.");

      if (isReconnect) {
        logConnection(`Sending reconnect sync. Last synced sequence: ${segments.length - 1}`);
        ws.send(JSON.stringify({
          command: "reconnect",
          last_sequence: segments.length - 1
        }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const serverReceiveTime = Date.now();

      if (data.event_type === "transcript_segment") {
        setSegments((prev) => {
          if (prev.some((s) => s.idempotency_key === data.idempotency_key || (s.sequence_number === data.seq && s.sequence_number !== 0))) {
            return prev;
          }

          const segmentData = data.payload;
          if (segmentData.client_timestamp) {
            segmentData.render_latency_ms = serverReceiveTime - (segmentData.client_timestamp * 1000);
          }

          return [...prev, segmentData].sort((a, b) => a.sequence_number - b.sequence_number);
        });
      } else if (data.event_type === "threat_verdict") {
        setVerdict(data.payload);
      } else if (data.event_type === "intervention_triggered") {
        setIntervention(data.payload.details?.message || "UPI wallet transaction locked!");
      } else if (data.event_type === "pong") {
        logConnection("Heartbeat pong received.");
      }
    };

    ws.onclose = () => {
      setSocketConnected(false);
      socketRef.current = null;
      logConnection("WebSocket connection closed.");
    };

    ws.onerror = (err) => {
      logConnection("WebSocket encountered an error.");
      console.error(err);
    };

    socketRef.current = ws;
  };

  const disconnectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setSocketConnected(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ command: "ping" }));
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicConsent(true);
      setupAudioLevelMeter(stream);
      setupMediaRecorder(stream);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone consent is required for live voice capture.");
    }
  };

  const setupMediaRecorder = (stream: MediaStream) => {
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0 && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const seq = segments.length;
        socketRef.current.send(JSON.stringify({
          command: "transcript_segment",
          seq: seq,
          client_timestamp: Date.now() / 1000,
          idempotency_key: `mic-${GOLDEN_SESSION_ID}-${seq}-${Date.now()}`,
          payload: {
            speaker: "CITIZEN",
            text: "Hello, I am speaking. Please verify your badge details.",
            confidence: 0.95
          }
        }));
      }
    };
    mediaRecorderRef.current = recorder;
  };

  const setupAudioLevelMeter = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
  };

  const toggleRecording = () => {
    if (!micConsent) {
      requestMicPermission();
      return;
    }

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      setMicLevel(0);
    } else {
      setRecordDuration(0);
      setIsRecording(true);
      mediaRecorderRef.current?.start(4000);

      const dataArray = new Uint8Array(analyserRef.current?.frequencyBinCount || 128);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setMicLevel(Math.min(avg * 1.5, 100));
        }
      }, 1000);
    }
  };

  const handleInjectNextSegment = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const seq = segments.length;
      socketRef.current.send(JSON.stringify({
        command: "simulate_next",
        scenario_id: selectedScenario,
        step: simStep,
        seq: seq,
        client_timestamp: Date.now() / 1000,
        idempotency_key: `script-${GOLDEN_SESSION_ID}-${selectedScenario}-${simStep}`
      }));
      setSimStep((prev) => prev + 1);
    }
  };

  const handleInjectSafeSentence = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const seq = segments.length;
      socketRef.current.send(JSON.stringify({
        command: "transcript_segment",
        seq: seq,
        client_timestamp: Date.now() / 1000,
        idempotency_key: `operator-safe-${Date.now()}`,
        payload: {
          speaker: "CITIZEN",
          text: "I am physical-visiting the central police station aa jata hoon directly tomorrow morning.",
          confidence: 0.99
        }
      }));
    }
  };

  const handleDeleteSession = async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${GOLDEN_SESSION_ID}`, {
        method: "DELETE"
      });
      if (res.ok) {
        logConnection("Session records deleted successfully.");
        setSegments([]);
        setVerdict(null);
        setIntervention(null);
        setSimStep(1);
        setSessionActive(false);
        disconnectWebSocket();
      }
    } catch (e) {
      console.error("Delete session error:", e);
    }
  };

  const handleStartCall = () => {
    setSessionActive(true);
    setIntervention(null);
    setSegments([]);
    setVerdict(null);
    setSimStep(1);
    connectWebSocket();
  };

  const handleEndCall = () => {
    setSessionActive(false);
    if (isRecording) toggleRecording();
    disconnectWebSocket();
  };

  const handleAttemptTransfer = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          command: "trigger_upi_transfer"
        })
      );
    }
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [segments]);

  return (
    <div className="relative min-h-screen pb-12">
      {/* Background Image for Call Simulator with Izanami Blend */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/call-bg.jpg"
          alt="Abstract Audio Soundwaves"
          className="w-full h-full object-cover opacity-10 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/95 to-background" />
      </div>

      <div className="space-y-12 max-w-[1600px] mx-auto pt-4 relative z-10">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="font-serif text-4xl text-white font-medium mb-3 flex items-center gap-4">
              <Phone className="h-6 w-6 text-accentGold" strokeWidth={1.5} />
              Coercion Intercept Simulator
            </h1>
            <p className="text-sm text-gray-500 font-light max-w-2xl leading-relaxed tracking-wide">
              Audit automatic banking freeze defenses by playing simulated scam conversations or testing live mic feedback.
            </p>
          </div>

          <div className="flex items-center gap-6 pb-1">
            <div className="flex items-center gap-3">
              <div className={`h-1.5 w-1.5 rounded-full ${socketConnected ? "bg-accentGold animate-pulse" : "bg-gray-700"}`} />
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{socketConnected ? "WS connected" : "WS idle"}</span>
            </div>

            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-accentGold transition-colors"
            >
              <Sliders className="h-3.5 w-3.5" strokeWidth={1.5} />
              Operator Drawer
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Console Panel (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col h-[680px] space-y-8">
            
            {/* Risk Stages Progression Bar */}
            <div className="border-t border-white/5 pt-6">
              <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block mb-6">
                Rolling Coercion State Machine Stage
              </span>
              <div className="flex justify-between items-center gap-4">
                {STAGES.map((stg) => {
                  const isActive = verdict?.stage === stg;
                  return (
                    <div
                      key={stg}
                      className={`flex-1 py-3 text-center text-[10px] font-medium tracking-widest uppercase border-b transition-colors duration-500 ${
                        isActive
                          ? stg === "FINANCIAL_ACTION"
                            ? "text-red-500 border-red-500 shadow-[0_4px_15px_-3px_rgba(239,68,68,0.3)] animate-pulse"
                            : stg === "COERCION"
                            ? "text-accentGold border-accentGold"
                            : "text-accentGold border-accentGold"
                          : "text-gray-600 border-white/5"
                      }`}
                    >
                      {stg.replace("_", " ")}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audio controls bar */}
            <div className="border-t border-b border-white/5 py-6 flex flex-wrap gap-6 items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                {!sessionActive ? (
                  <button
                    onClick={handleStartCall}
                    className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-medium text-emerald-500 hover:text-white transition-colors"
                  >
                    <Phone className="h-4 w-4" strokeWidth={1.5} />
                    Answer Incoming Call
                  </button>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-medium text-red-500 hover:text-white transition-colors"
                  >
                    <PhoneOff className="h-4 w-4" strokeWidth={1.5} />
                    End Call Intercept
                  </button>
                )}

                {sessionActive && (
                  <>
                    <button
                      onClick={handleInjectNextSegment}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-medium text-accentGold hover:text-white transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Simulate Next Segment
                    </button>

                    <button
                      onClick={toggleRecording}
                      className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-medium transition-colors ${
                        isRecording
                          ? "text-red-500 animate-pulse"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {isRecording ? <MicOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Mic className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      {isRecording ? "Stop Capture" : "Capture Local Mic"}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={handleDeleteSession}
                className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-medium text-gray-500 hover:text-red-500 transition-colors"
                title="Delete session database records"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Reset Session Data
              </button>
            </div>

            {/* Transcript Pipeline Panel */}
            <div className="flex-1 flex flex-col min-h-0 border border-white/5 bg-background/50 backdrop-blur-sm p-6">
              {isRecording && (
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6 shrink-0">
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-medium text-red-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    Live Voice Input ({recordDuration}s)
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] uppercase tracking-widest text-gray-500">Signal:</span>
                    <div className="w-32 h-1 bg-white/5 overflow-hidden flex">
                      <div className="bg-red-500 h-full transition-all duration-100" style={{ width: `${micLevel}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-6 pr-4">
                {segments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-600">
                    <Volume2 className="h-8 w-8 text-accentGold mb-4 opacity-50" strokeWidth={1.5} />
                    <p className="text-[10px] uppercase tracking-widest font-light">Select or answer the call to start.</p>
                  </div>
                ) : (
                  segments.map((seg, idx) => {
                    const matchingIndicators = verdict?.detailed_indicators?.filter(
                      (ind) => ind.matched_segment_id === seg.id
                    ) || [];

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[85%] border-b border-white/5 pb-4 space-y-3 ${
                          seg.speaker === "CITIZEN"
                            ? "mr-auto"
                            : "ml-auto text-right"
                        }`}
                      >
                        <div className={`flex items-center gap-4 text-[9px] uppercase tracking-widest font-medium ${seg.speaker === "CITIZEN" ? "text-gray-500" : "text-accentGold flex-row-reverse"}`}>
                          <span className="flex items-center gap-2">
                            {seg.speaker}
                            {seg.speaker === "SUSPECT" && (
                              <span className="text-red-500">Unverified</span>
                            )}
                          </span>
                          <span className="opacity-50">Seq: #{seg.sequence_number}</span>
                        </div>
                        
                        <p className={`font-serif text-lg font-light leading-relaxed ${seg.speaker === "CITIZEN" ? "text-white/80" : "text-white"}`}>{seg.text}</p>

                        {/* Display Anchored matched evidence indicator flags */}
                        {matchingIndicators.map((ind, i) => (
                          <div key={i} className="border-l border-red-500 pl-4 py-1 mt-2 text-[10px] font-light text-gray-400">
                            <span className="font-medium text-red-500 uppercase tracking-widest block mb-1">
                              Flagged Evidence: {ind.name}
                            </span>
                            <span className="block">{ind.explanation}</span>
                          </div>
                        ))}

                        {seg.ingest_latency_ms !== undefined && (
                          <span className={`text-[9px] text-gray-600 font-mono mt-2 block ${seg.speaker === "CITIZEN" ? "" : "text-left"}`}>
                            Latency: Ingest {seg.ingest_latency_ms ? `${seg.ingest_latency_ms.toFixed(0)}ms` : "0ms"} | Proc {seg.processing_latency_ms ? `${seg.processing_latency_ms.toFixed(0)}ms` : "0ms"}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>

          {/* Right Info Inspector (4 Columns) */}
          <div className="lg:col-span-4 space-y-12 lg:border-l lg:border-white/5 lg:pl-12 pt-6 lg:pt-0">
            
            {/* Threat Monitor */}
            <div className="space-y-8">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
                Scam Verdict Engine
              </h2>

              {verdict ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500">Verdict</span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-widest px-3 py-1 border ${
                        verdict.verdict === "CRITICAL"
                          ? "text-red-500 border-red-500/30"
                          : verdict.verdict === "SUSPICIOUS"
                          ? "text-accentGold border-accentGold/30"
                          : "text-emerald-500 border-emerald-500/30"
                      }`}
                    >
                      {verdict.verdict}
                    </span>
                  </div>

                  <div className="space-y-3 border-b border-white/5 pb-8">
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-medium text-gray-500">
                      <span>Risk Rating Score</span>
                      <span className="text-white">{(verdict.normalized_risk_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          verdict.normalized_risk_score >= 0.8
                            ? "bg-red-500"
                            : verdict.normalized_risk_score >= 0.4
                            ? "bg-accentGold"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${verdict.normalized_risk_score * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block mb-2">Coercion Pattern</span>
                      <span className="font-serif text-xl text-white font-light">{verdict.scam_type}</span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-widest font-medium text-gray-500 block mb-3">Indicators Flagged</span>
                      <div className="flex flex-wrap gap-3">
                        {verdict.triggered_indicators.length > 0 ? (
                          verdict.triggered_indicators.map((code) => (
                            <span
                              key={code}
                              className="text-[10px] text-accentGold font-mono uppercase tracking-widest"
                            >
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-light text-gray-600 uppercase tracking-widest">No markers matching</span>
                        )}
                      </div>
                    </div>

                    {verdict.recommended_action && (
                      <div className="border-l border-red-500 pl-4 py-2 mt-8">
                        <span className="text-[9px] font-medium text-red-500 uppercase tracking-widest block mb-2">
                          Preventative Recommended Action
                        </span>
                        <p className="text-xs font-light text-gray-400 leading-relaxed">{verdict.recommended_action}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-gray-600">
                  <AlertOctagon className="h-6 w-6 text-accentGold mb-4 opacity-50" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-widest font-light">Awaiting audio signals. Verdict will update dynamically.</p>
                </div>
              )}
            </div>

            {/* Simulated Citizen device freeze */}
            {sessionActive && (
              <div className="border-t border-white/5 pt-8 space-y-6">
                <div>
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">Mobile Simulator</h3>
                  <p className="text-xs text-gray-500 font-light leading-relaxed mt-2">
                    Test defensive locking loops by attempting a mock UPI payment during coercion.
                  </p>
                </div>

                {!intervention ? (
                  <button
                    onClick={handleAttemptTransfer}
                    className="w-full border border-accentGold/50 hover:bg-accentGold hover:text-black py-3 text-[10px] font-medium uppercase tracking-widest text-accentGold transition-colors"
                  >
                    Simulate UPI Transfer (₹50,000)
                  </button>
                ) : (
                  <div className="border border-emerald-500/30 p-4 space-y-2">
                    <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest block flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Lock Triggered Successfully
                    </span>
                    <p className="text-xs font-light text-gray-400">{intervention}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sliding Demo Operator Console Drawer */}
        {showDrawer && (
          <div className="fixed right-0 top-0 h-full w-96 bg-background/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 p-8 flex flex-col justify-between transition-transform duration-500 ease-out">
            <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <h2 className="text-[10px] font-medium text-white uppercase tracking-widest flex items-center gap-3">
                  <Sliders className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
                  Demo Operator Panel
                </h2>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="text-[9px] text-gray-500 hover:text-white uppercase tracking-widest font-medium transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <label htmlFor="scenarioSelect" className="text-[9px] font-medium text-gray-500 uppercase tracking-widest block">Script Scenario Library</label>
                <select
                  id="scenarioSelect"
                  value={selectedScenario}
                  onChange={(e) => {
                    setSelectedScenario(e.target.value);
                    setSimStep(1);
                  }}
                  className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-light focus:outline-none focus:border-accentGold transition-colors [&>option]:bg-background [&>option]:text-white"
                >
                  {SCENARIOS.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-6">
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-widest block font-mono">Control Triggers</span>
                
                <button
                  onClick={handleInjectSafeSentence}
                  className="w-full border border-white/10 hover:border-white/30 py-3 text-[10px] uppercase tracking-widest text-gray-300 hover:text-white transition-colors"
                  title="Inject phrase that triggers de-escalation logic"
                >
                  Inject Counter-Evidence Sentence
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => connectWebSocket(true)}
                    className="flex items-center justify-center gap-2 border border-white/10 hover:border-accentGold py-3 text-[9px] text-accentGold uppercase tracking-widest transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Reconnect
                  </button>
                  <button
                    onClick={disconnectWebSocket}
                    className="flex items-center justify-center gap-2 border border-white/10 hover:border-red-500 py-3 text-[9px] text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-widest block font-mono">Connection Logs</span>
                <div className="h-48 border border-white/5 p-4 overflow-y-auto space-y-2 select-all font-mono text-[9px]">
                  {connectionStatusLog.length === 0 ? (
                    <span className="text-gray-700 italic">No logs recorded yet.</span>
                  ) : (
                    connectionStatusLog.map((log, idx) => (
                      <div key={idx} className="text-gray-500">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 text-[9px] text-gray-600 flex items-center justify-between uppercase tracking-widest font-medium">
              <span>Demo Mode State</span>
              <span className="text-accentGold font-mono">Locked Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
