"use client";

import { useEffect, useState } from "react";
import { BookOpen, ShieldAlert, Cpu, EyeOff, Activity } from "lucide-react";

interface LatencyMetrics {
  ingest_p50: number | null;
  ingest_p95: number | null;
  processing_p50: number | null;
  processing_p95: number | null;
  total_count: number;
}

export default function MethodologyPage() {
  const [metrics, setMetrics] = useState<LatencyMetrics | null>(null);

  const fetchLatency = async () => {
    try {
      const res = await fetch("/api/v1/intelligence/latency-diagnostics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLatency();
  }, []);

  const formatLatency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "not measured";
    return `${val.toFixed(1)} ms`;
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accentTeal" />
          System Design & Methodology
        </h1>
        <p className="text-sm text-gray-400">
          Architecture log, technical evaluation parameters, operational limitations, and data privacy policies.
        </p>
      </div>

      <div className="space-y-8">
        {/* Architecture Specs */}
        <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-borderBg/50 pb-3">
            <Cpu className="h-4.5 w-4.5 text-accentTeal" />
            1. Monorepo Technical Architecture
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Kavach AI is structured as a decoupled monorepo maximizing speed, scalability, and type safety:
          </p>
          <ul className="list-disc pl-5 text-xs text-gray-400 space-y-2">
            <li>
              <strong className="text-white">API Backend (FastAPI + Python)</strong>: Utilizes SQLAlchemy 2 and Pydantic v2
              for database schema mapping and incoming request payload validations. Runs on port 8000.
            </li>
            <li>
              <strong className="text-white">WebSocket Stream Handler</strong>: Manages persistent connections to push
              rolling transcript segment strings and real-time threat indicators.
            </li>
            <li>
              <strong className="text-white">Frontend (Next.js 15 App Router)</strong>: Desktop-first SOC dashboard written
              in strict TypeScript mode, utilizing Tailwind CSS for layouts. Runs on port 3000.
            </li>
          </ul>
        </div>

        {/* System Latency Metrics Board */}
        <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-borderBg/50 pb-3">
            <Activity className="h-4.5 w-4.5 text-accentTeal" />
            2. Real-Time Telemetry & Latency Diagnostics
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Automatic measurements logging end-to-end processing speeds across WebSockets events:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/40 border border-borderBg/50 p-4 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Ingestion Latency (Network -&gt; WS)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">p50 Ingest:</span>
                  <span className="font-mono text-white font-bold">{formatLatency(metrics?.ingest_p50)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">p95 Ingest:</span>
                  <span className="font-mono text-white font-bold">{formatLatency(metrics?.ingest_p95)}</span>
                </div>
              </div>
            </div>

            <div className="bg-background/40 border border-borderBg/50 p-4 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Rules Engine Processing</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">p50 Process:</span>
                  <span className="font-mono text-white font-bold">{formatLatency(metrics?.processing_p50)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">p95 Process:</span>
                  <span className="font-mono text-white font-bold">{formatLatency(metrics?.processing_p95)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 uppercase font-bold flex justify-between pt-1">
            <span>Total Telemetry Segments Logged: {metrics?.total_count || 0}</span>
            <span>Policy: Strictly Local Measurements</span>
          </div>
        </div>

        {/* Limitations Alert */}
        <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-borderBg/50 pb-3">
            <ShieldAlert className="h-4.5 w-4.5 text-accentAmber" />
            3. Operational Boundaries & Limitations
          </h2>
          <div className="rounded bg-accentAmber/5 border border-accentAmber/20 p-4">
            <p className="text-xs text-gray-300 leading-relaxed">
              <strong>CRITICAL NOTICE:</strong> Kavach AI is an interactive decision-support prototype demonstration.
            </p>
            <ul className="list-disc pl-5 text-xs text-gray-400 mt-2 space-y-1">
              <li>No actual telecom cellular cell towers are monitored or intercepted.</li>
              <li>No real financial bank accounts, UPI wallets, or UPI transactions are locked or blocked.</li>
              <li>No government files or law enforcement agency command rosters are linked.</li>
              <li>All currency notes scanned are evaluated using fictional classification weights for prototype demonstration only.</li>
            </ul>
          </div>
        </div>

        {/* Privacy policy */}
        <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-borderBg/50 pb-3">
            <EyeOff className="h-4.5 w-4.5 text-accentTeal" />
            4. Demo Data & Privacy Policy
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            All names, addresses, coordinates, cell tower locations, serial numbers, and account credentials used by the
            seeding generator are 100% synthetically mock-generated. No real personally identifiable information (PII) is
            logged. Development resets wipe all sqlite traces immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
