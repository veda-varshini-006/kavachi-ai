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
    <div className="relative min-h-screen pb-12">
      {/* Background Image for Methodology Module with Izanami Blend */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/methodology-bg.jpg"
          alt="Dark abstract methodology"
          className="w-full h-full object-cover opacity-10 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
      </div>

      <div className="space-y-16 max-w-[1200px] mx-auto pt-4 relative z-10">
        {/* Title */}
        <div className="border-b border-white/5 pb-8">
          <h1 className="font-serif text-4xl text-white font-medium mb-3 flex items-center gap-4">
            <BookOpen className="h-6 w-6 text-accentGold" strokeWidth={1.5} />
            System Design & Methodology
          </h1>
          <p className="text-sm text-gray-500 font-light max-w-2xl leading-relaxed tracking-wide">
            Architecture log, technical evaluation parameters, operational limitations, and data privacy policies.
          </p>
        </div>

        <div className="space-y-16">
          {/* Architecture Specs */}
          <div className="space-y-6 border-l border-white/5 pl-8 relative">
            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-accentGold/20 border border-accentGold/50" />
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-medium text-white flex items-center gap-4 mb-8">
              <Cpu className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
              1. Monorepo Technical Architecture
            </h2>
            <p className="font-serif text-lg font-light text-gray-300 leading-relaxed max-w-3xl">
              Kavach AI is structured as a decoupled monorepo maximizing speed, scalability, and type safety:
            </p>
            <div className="space-y-4 max-w-3xl">
              <div className="bg-background/40 border border-white/5 p-6 space-y-2 hover:border-white/10 transition-colors">
                <strong className="text-[10px] uppercase tracking-widest text-accentGold block">API Backend (FastAPI + Python)</strong>
                <p className="text-sm font-light text-gray-400 leading-relaxed">
                  Utilizes SQLAlchemy 2 and Pydantic v2 for database schema mapping and incoming request payload validations. Runs on port 8000.
                </p>
              </div>
              <div className="bg-background/40 border border-white/5 p-6 space-y-2 hover:border-white/10 transition-colors">
                <strong className="text-[10px] uppercase tracking-widest text-accentGold block">WebSocket Stream Handler</strong>
                <p className="text-sm font-light text-gray-400 leading-relaxed">
                  Manages persistent connections to push rolling transcript segment strings and real-time threat indicators.
                </p>
              </div>
              <div className="bg-background/40 border border-white/5 p-6 space-y-2 hover:border-white/10 transition-colors">
                <strong className="text-[10px] uppercase tracking-widest text-accentGold block">Frontend (Next.js 15 App Router)</strong>
                <p className="text-sm font-light text-gray-400 leading-relaxed">
                  Desktop-first SOC dashboard written in strict TypeScript mode, utilizing Tailwind CSS for layouts. Runs on port 3000.
                </p>
              </div>
            </div>
          </div>

          {/* System Latency Metrics Board */}
          <div className="space-y-6 border-l border-white/5 pl-8 relative">
            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-accentGold/20 border border-accentGold/50" />
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-medium text-white flex items-center gap-4 mb-8">
              <Activity className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
              2. Real-Time Telemetry & Latency Diagnostics
            </h2>
            <p className="font-serif text-lg font-light text-gray-300 leading-relaxed max-w-3xl mb-8">
              Automatic measurements logging end-to-end processing speeds across WebSockets events:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
              <div className="bg-background/40 border border-white/5 p-8 space-y-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium block">Ingestion Latency (Network &rarr; WS)</span>
                <div className="flex gap-12">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 block">p50 Ingest</span>
                    <span className="font-mono text-2xl font-light text-white">{formatLatency(metrics?.ingest_p50)}</span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 block">p95 Ingest</span>
                    <span className="font-mono text-2xl font-light text-white">{formatLatency(metrics?.ingest_p95)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-background/40 border border-white/5 p-8 space-y-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium block">Rules Engine Processing</span>
                <div className="flex gap-12">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 block">p50 Process</span>
                    <span className="font-mono text-2xl font-light text-white">{formatLatency(metrics?.processing_p50)}</span>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 block">p95 Process</span>
                    <span className="font-mono text-2xl font-light text-white">{formatLatency(metrics?.processing_p95)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-medium flex justify-between max-w-4xl pt-4">
              <span>Total Telemetry Segments Logged: {metrics?.total_count || 0}</span>
              <span>Policy: Strictly Local Measurements</span>
            </div>
          </div>

          {/* Limitations Alert */}
          <div className="space-y-6 border-l border-red-500/30 pl-8 relative">
            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-medium text-red-500 flex items-center gap-4 mb-8">
              <ShieldAlert className="h-4 w-4 text-red-500" strokeWidth={1.5} />
              3. Operational Boundaries & Limitations
            </h2>
            <div className="border border-red-500/20 bg-background/50 p-8 backdrop-blur-sm max-w-3xl space-y-6">
              <p className="text-[10px] text-red-500 font-medium uppercase tracking-[0.2em]">
                CRITICAL NOTICE: Kavach AI is an interactive decision-support prototype demonstration.
              </p>
              <ul className="space-y-4 text-sm font-light text-gray-400">
                <li className="flex items-start gap-4">
                  <div className="w-1 h-1 rounded-full bg-red-500/50 mt-2 shrink-0" />
                  <span className="leading-relaxed">No actual telecom cellular cell towers are monitored or intercepted.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-1 h-1 rounded-full bg-red-500/50 mt-2 shrink-0" />
                  <span className="leading-relaxed">No real financial bank accounts, UPI wallets, or UPI transactions are locked or blocked.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-1 h-1 rounded-full bg-red-500/50 mt-2 shrink-0" />
                  <span className="leading-relaxed">No government files or law enforcement agency command rosters are linked.</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-1 h-1 rounded-full bg-red-500/50 mt-2 shrink-0" />
                  <span className="leading-relaxed">All currency notes scanned are evaluated using fictional classification weights for prototype demonstration only.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Privacy policy */}
          <div className="space-y-6 border-l border-white/5 pl-8 relative">
            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-accentGold/20 border border-accentGold/50" />
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-medium text-white flex items-center gap-4 mb-8">
              <EyeOff className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
              4. Demo Data & Privacy Policy
            </h2>
            <p className="font-serif text-lg font-light text-gray-300 leading-relaxed max-w-3xl">
              All names, addresses, coordinates, cell tower locations, serial numbers, and account credentials used by the
              seeding generator are 100% synthetically mock-generated. No real personally identifiable information (PII) is
              logged. Development resets wipe all sqlite traces immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
