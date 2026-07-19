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
import { GOLDEN_SESSION_ID } from "@/lib/constants";

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

    const wsUrl = `ws://localhost:8000/api/v1/sessions/${GOLDEN_SESSION_ID}/stream`;
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
    <div className="space-y-8 relative">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Phone className="h-6 w-6 text-accentTeal" />
            Coercion Intercept Simulator
          </h1>
          <p className="text-sm text-gray-400">
            Audit automatic banking freeze defenses by playing simulated scam conversations or testing live mic feedback.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${socketConnected ? "bg-accentTeal animate-pulse" : "bg-gray-600"}`} />
            <span className="text-xs text-gray-400 font-mono">{socketConnected ? "WS connected" : "WS idle"}</span>
          </div>

          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="flex items-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-white border border-borderBg transition"
          >
            <Sliders className="h-3.5 w-3.5" />
            Operator Drawer
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Console Panel (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col h-[680px] space-y-6">
          
          {/* Risk Stages Progression Bar */}
          <div className="rounded-xl border border-borderBg bg-cardBg p-4.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-3 tracking-wider">
              Rolling Coercion State Machine Stage
            </span>
            <div className="flex justify-between items-center gap-2">
              {STAGES.map((stg) => {
                const isActive = verdict?.stage === stg;
                return (
                  <div
                    key={stg}
                    className={`flex-1 rounded py-2 px-3 text-center text-xs font-bold border transition duration-300 ${
                      isActive
                        ? stg === "FINANCIAL_ACTION"
                          ? "bg-accentRed/10 text-accentRed border-accentRed/40 shadow-lg animate-pulse"
                          : stg === "COERCION"
                          ? "bg-accentAmber/10 text-accentAmber border-accentAmber/40"
                          : "bg-accentTeal/10 text-accentTeal border-accentTeal/40"
                        : "bg-slate-800/20 text-gray-500 border-borderBg/40"
                    }`}
                  >
                    {stg.replace("_", " ")}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audio controls bar */}
          <div className="rounded-xl border border-borderBg bg-cardBg p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              {!sessionActive ? (
                <button
                  onClick={handleStartCall}
                  className="flex items-center gap-2 rounded bg-emerald-600 hover:bg-emerald-500 px-4.5 py-2 text-xs font-bold text-white transition"
                >
                  <Phone className="h-4 w-4" />
                  Answer Incoming Call
                </button>
              ) : (
                <button
                  onClick={handleEndCall}
                  className="flex items-center gap-2 rounded bg-accentRed hover:bg-red-500 px-4.5 py-2 text-xs font-bold text-white transition"
                >
                  <PhoneOff className="h-4 w-4" />
                  End Call Intercept
                </button>
              )}

              {sessionActive && (
                <>
                  <button
                    onClick={handleInjectNextSegment}
                    className="flex items-center gap-1.5 rounded bg-accentTeal hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-black transition"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Simulate Next Segment
                  </button>

                  <button
                    onClick={toggleRecording}
                    className={`flex items-center gap-1.5 rounded px-4 py-2 text-xs font-bold transition ${
                      isRecording
                        ? "bg-accentRed text-white animate-pulse"
                        : "bg-slate-800 hover:bg-slate-700 text-gray-300 border border-borderBg"
                    }`}
                  >
                    {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {isRecording ? "Stop Capture" : "Capture Local Mic"}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleDeleteSession}
              className="flex items-center gap-1 text-gray-500 hover:text-accentRed transition text-xs font-bold"
              title="Delete session database records"
            >
              <Trash2 className="h-4 w-4" />
              Reset Session Data
            </button>
          </div>

          {/* Transcript Pipeline Panel */}
          <div className="flex-1 rounded-xl border border-borderBg bg-cardBg p-6 flex flex-col min-h-0">
            {isRecording && (
              <div className="flex items-center justify-between border-b border-borderBg/50 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-2 text-xs text-accentRed font-bold uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-accentRed animate-ping" />
                  Live Voice Input ({recordDuration}s)
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mr-1">Signal Level:</span>
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-borderBg/50 flex">
                    <div className="bg-accentRed h-full" style={{ width: `${micLevel}%` }} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {segments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-600">
                  <Volume2 className="h-10 w-10 text-gray-700 mb-2 animate-bounce" />
                  <p className="text-xs">Select or answer the call connection above to start testing.</p>
                </div>
              ) : (
                segments.map((seg, idx) => {
                  // Find anchored matching indicators for this segment ID
                  const matchingIndicators = verdict?.detailed_indicators?.filter(
                    (ind) => ind.matched_segment_id === seg.id
                  ) || [];

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[85%] rounded-lg p-3.5 text-sm space-y-1.5 ${
                        seg.speaker === "CITIZEN"
                          ? "bg-slate-800/80 text-gray-200 mr-auto border border-borderBg/50"
                          : "bg-accentTeal/10 text-white ml-auto border border-accentTeal/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-6 mb-1 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                        <span className="flex items-center gap-1">
                          {seg.speaker}
                          {seg.speaker === "SUSPECT" && (
                            <span className="text-[9px] px-1 bg-accentRed/10 text-accentRed rounded">Unverified</span>
                          )}
                        </span>
                        <span>Seq: #{seg.sequence_number}</span>
                      </div>
                      
                      <p className="leading-relaxed">{seg.text}</p>

                      {/* Display Anchored matched evidence indicator flags */}
                      {matchingIndicators.map((ind, i) => (
                        <div key={i} className="rounded bg-accentRed/10 border border-accentRed/25 p-2 mt-1.5 text-[10px] text-gray-300">
                          <span className="font-bold text-accentRed uppercase tracking-wider block">
                            Flagged Evidence: {ind.name}
                          </span>
                          <span className="block mt-0.5 text-gray-400">{ind.explanation}</span>
                        </div>
                      ))}

                      {seg.ingest_latency_ms !== undefined && (
                        <span className="text-[9px] text-gray-600 mt-2 block font-mono text-right">
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
        <div className="lg:col-span-4 space-y-6">
          
          {/* Threat Monitor */}
          <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Scam Verdict Engine
            </h2>

            {verdict ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-borderBg/30 pb-3">
                  <span className="text-xs text-gray-400 font-bold uppercase">Verdict</span>
                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      verdict.verdict === "CRITICAL"
                        ? "bg-accentRed/10 text-accentRed border border-accentRed/30"
                        : verdict.verdict === "SUSPICIOUS"
                        ? "bg-accentAmber/10 text-accentAmber border-accentAmber/30"
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                    }`}
                  >
                    {verdict.verdict}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                    <span>Risk Rating Score</span>
                    <span>{(verdict.normalized_risk_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-background overflow-hidden border border-borderBg/50">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        verdict.normalized_risk_score >= 0.8
                          ? "bg-accentRed"
                          : verdict.normalized_risk_score >= 0.4
                          ? "bg-accentAmber"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${verdict.normalized_risk_score * 100}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Coercion Pattern</span>
                    <span className="text-xs font-semibold text-white mt-0.5 inline-block">{verdict.scam_type}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Indicators Flagged</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {verdict.triggered_indicators.length > 0 ? (
                        verdict.triggered_indicators.map((code) => (
                          <span
                            key={code}
                            className="rounded bg-slate-800 border border-borderBg px-2 py-0.5 text-xs text-accentTeal font-mono font-bold"
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-600">No markers matching</span>
                      )}
                    </div>
                  </div>

                  {verdict.recommended_action && (
                    <div className="rounded-lg bg-accentRed/5 border border-accentRed/20 p-3.5 flex gap-3 items-start">
                      <ShieldAlert className="h-5 w-5 text-accentRed shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-accentRed uppercase tracking-wider block">
                          Preventative Recommended Action
                        </span>
                        <p className="text-xs text-gray-300 mt-1">{verdict.recommended_action}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-gray-600">
                <AlertOctagon className="h-8 w-8 text-gray-700 mb-2 animate-pulse" />
                <p className="text-xs">Awaiting audio signals. Verdict will update dynamically.</p>
              </div>
            )}
          </div>

          {/* Simulated Citizen device freeze */}
          {sessionActive && (
            <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Mobile Simulator</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Test defensive locking loops by attempting a mock UPI payment during coercion.
                </p>
              </div>

              {!intervention ? (
                <button
                  onClick={handleAttemptTransfer}
                  className="w-full flex items-center justify-center gap-2 rounded bg-accentAmber hover:bg-yellow-500 px-4 py-2 text-xs font-bold text-black transition"
                >
                  Simulate UPI Transfer (₹50,000)
                </button>
              ) : (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 flex gap-3 items-start">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block">
                      Lock Triggered Successfully
                    </span>
                    <p className="text-xs text-gray-300 mt-1">{intervention}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sliding Demo Operator Console Drawer */}
      {showDrawer && (
        <div className="fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-borderBg shadow-2xl z-50 p-6 flex flex-col justify-between transition-all duration-300 animate-slide-in">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-borderBg pb-3">
              <h2 className="text-sm font-bold text-white uppercase flex items-center gap-1.5">
                <Sliders className="h-4.5 w-4.5 text-accentTeal" />
                Demo Operator Panel
              </h2>
              <button
                onClick={() => setShowDrawer(false)}
                className="text-xs text-gray-500 hover:text-white uppercase font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase block">Script Scenario Library</label>
              <select
                value={selectedScenario}
                onChange={(e) => {
                  setSelectedScenario(e.target.value);
                  setSimStep(1);
                }}
                className="w-full rounded bg-slate-800 border border-borderBg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accentTeal"
              >
                {SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase block font-mono">Control Triggers</label>
              
              <button
                onClick={handleInjectSafeSentence}
                className="w-full flex items-center justify-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 py-2 text-xs text-white border border-borderBg font-semibold transition"
                title="Inject phrase that triggers de-escalation logic"
              >
                Inject Counter-Evidence Sentence
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => connectWebSocket(true)}
                  className="flex items-center justify-center gap-1 rounded bg-slate-800 hover:bg-slate-700 py-1.5 text-xs text-accentTeal border border-borderBg font-semibold transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reconnect WS
                </button>
                <button
                  onClick={disconnectWebSocket}
                  className="flex items-center justify-center gap-1 rounded bg-slate-800 hover:bg-slate-700 py-1.5 text-xs text-accentRed border border-borderBg font-semibold transition"
                >
                  Disconnect WS
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase block font-mono">Connection Logs</label>
              <div className="h-36 bg-background rounded border border-borderBg p-3 overflow-y-auto space-y-1.5 select-all">
                {connectionStatusLog.length === 0 ? (
                  <span className="text-[10px] text-gray-700 italic">No logs recorded yet.</span>
                ) : (
                  connectionStatusLog.map((log, idx) => (
                    <div key={idx} className="text-[10px] font-mono text-gray-500 leading-normal">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-borderBg/50 pt-4 text-[10px] text-gray-600 flex items-center justify-between uppercase font-bold tracking-wider">
            <span>Demo Mode State</span>
            <span className="text-accentTeal font-mono">Locked Active</span>
          </div>
        </div>
      )}
    </div>
  );
}
