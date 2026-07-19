"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Users, MapPin, Scan, ArrowRight, Activity, AlertTriangle } from "lucide-react";

export default function OverviewPage() {
  const [stats, setStats] = useState({
    activeSessions: 0,
    blockedAccounts: 0,
    activeCases: 0,
    currencyScans: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [sessRes, caseRes, graphRes, mapRes] = await Promise.all([
        fetch("/api/v1/sessions?page_size=1"),
        fetch("/api/v1/cases?page_size=1"),
        fetch("/api/v1/intelligence/graph"),
        fetch("/api/v1/intelligence/map")
      ]);

      const sessData = await sessRes.json();
      const caseData = await caseRes.json();
      const graphData = await graphRes.json();
      const mapData = await mapRes.json();

      setStats({
        activeSessions: sessData.total || 0,
        blockedAccounts: graphData.links?.filter((l: any) => l.type === "TRANSACTED_WITH").length || 0,
        activeCases: caseData.total || 0,
        currencyScans: mapData?.filter((m: any) => m.event_type === "NOTE_SCAN").length || 0
      });
    } catch (e) {
      console.error("Failed to load dashboard statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-borderBg bg-gradient-to-r from-cardBg to-background p-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Digital Public Safety Intelligence Hub</h1>
        <p className="mt-2 text-sm text-gray-400 max-w-2xl">
          Multi-source digital public-safety intelligence for detecting scam coercion, screening suspect currency, 
          linking fraud networks, and coordinating geospatial response.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric Card */}
        <div className="rounded-xl border border-borderBg bg-cardBg p-6">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-accentTeal" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Threat Intercepts</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            {loading ? "..." : stats.activeSessions}
          </p>
        </div>

        <div className="rounded-xl border border-borderBg bg-cardBg p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-accentAmber" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">UPI/Accounts Blocked</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            {loading ? "..." : stats.blockedAccounts}
          </p>
        </div>

        <div className="rounded-xl border border-borderBg bg-cardBg p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-accentRed" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Open Scams Cases</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            {loading ? "..." : stats.activeCases}
          </p>
        </div>

        <div className="rounded-xl border border-borderBg bg-cardBg p-6">
          <div className="flex items-center gap-3">
            <Scan className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Note Screenings</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-white">
            {loading ? "..." : stats.currencyScans}
          </p>
        </div>
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Quick Simulator Launch */}
        <div className="rounded-xl border border-borderBg bg-cardBg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-accentTeal" />
              Pre-Transaction Coercion Engine
            </h2>
            <p className="mt-3 text-sm text-gray-400">
              Run real-time call interception test scripts. The call simulator streams audio text transcripts,
              extracts NLP threat indicators, flags coercion severity, and triggers transaction lock alerts.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/call-simulator"
              className="inline-flex items-center gap-2 rounded-md bg-accentTeal hover:bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition"
            >
              Launch Call Simulator
              <ArrowRight className="h-4 w-4 text-black" />
            </Link>
          </div>
        </div>

        {/* Intelligence Quick Links */}
        <div className="rounded-xl border border-borderBg bg-cardBg p-6">
          <h2 className="text-lg font-bold text-white">Intelligence Map & Network</h2>
          <p className="mt-2 text-sm text-gray-400">
            Access spatial response overlays and cybercrime link graphs to evaluate scam coercion vectors.
          </p>
          <div className="mt-6 space-y-3">
            <Link
              href="/graph"
              className="flex items-center justify-between rounded-lg border border-borderBg/50 hover:border-accentTeal/40 bg-background/50 hover:bg-background px-4 py-3 text-sm transition"
            >
              <span className="flex items-center gap-3 text-gray-300">
                <Users className="h-4 w-4 text-accentTeal" />
                Inspect Cybercrime Fraud Network Link Graph
              </span>
              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>
            <Link
              href="/map"
              className="flex items-center justify-between rounded-lg border border-borderBg/50 hover:border-accentTeal/40 bg-background/50 hover:bg-background px-4 py-3 text-sm transition"
            >
              <span className="flex items-center gap-3 text-gray-300">
                <MapPin className="h-4 w-4 text-accentAmber" />
                View Regional Response Deployment Maps
              </span>
              <ArrowRight className="h-4 w-4 text-gray-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
