"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Plus, Eye, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CaseItem {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "NEW" | "INVESTIGATING" | "ESCALATED" | "RESOLVED" | "DISMISSED";
  assigned_to?: string;
  created_at: string;
}

export default function CasesIndex() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const fetchCases = async () => {
    setLoading(true);
    try {
      let query = "/api/v1/cases?page_size=20";
      if (filterSeverity) query += `&severity=${filterSeverity}`;
      if (filterStatus) query += `&status=${filterStatus}`;

      const res = await fetch(query);
      const data = await res.json();
      setCases(data.items || []);
    } catch (e) {
      console.error("Failed to load cases list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filterSeverity, filterStatus]);

  return (
    <div className="relative min-h-screen pb-12">
      {/* Background Image for Cases Module with Izanami Blend */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/city-bg.jpg"
          alt="Minimalist City Grid Aerial"
          className="w-full h-full object-cover opacity-15 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/95 to-background" />
      </div>

      <div className="space-y-10 max-w-[1600px] mx-auto pt-4 relative z-10">
        {/* Title block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="font-serif text-4xl text-white font-medium mb-3 flex items-center gap-4">
              <AlertCircle className="h-6 w-6 text-accentGold" strokeWidth={1.5} />
              Public Safety Incident Cases
            </h1>
            <p className="text-sm text-gray-500 font-light max-w-2xl leading-relaxed tracking-wide">
              Audit public safety cybercrime scam cases, coordinate responses, and review interventions.
            </p>
          </div>
        </div>

        {/* Filter and controls row */}
        <div className="border-b border-white/5 pb-8 flex flex-wrap gap-8 items-center justify-between">
          <div className="flex gap-8">
            <div className="space-y-3">
              <label htmlFor="severityFilter" className="text-[9px] uppercase tracking-[0.2em] font-medium text-gray-500 block">Severity Filter</label>
              <select
                id="severityFilter"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-transparent border-b border-white/20 pb-2 text-sm text-white font-light focus:outline-none focus:border-accentGold transition-colors [&>option]:bg-background [&>option]:text-white min-w-[160px]"
              >
                <option value="">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="space-y-3">
              <label htmlFor="statusFilter" className="text-[9px] uppercase tracking-[0.2em] font-medium text-gray-500 block">Status Filter</label>
              <select
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border-b border-white/20 pb-2 text-sm text-white font-light focus:outline-none focus:border-accentGold transition-colors [&>option]:bg-background [&>option]:text-white min-w-[160px]"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
            Showing {cases.length} cases
          </div>
        </div>

        {/* Cases list table */}
        <div>
          {loading ? (
            <div className="text-sm font-light text-gray-500 py-20 text-center uppercase tracking-widest">Loading incident cases...</div>
          ) : cases.length === 0 ? (
            <div className="text-sm font-light text-gray-500 py-20 text-center uppercase tracking-widest">
              No incident cases found matching these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-medium uppercase tracking-[0.2em] text-[9px]">
                    <th className="px-6 py-6">Title</th>
                    <th className="px-6 py-6">Severity</th>
                    <th className="px-6 py-6">Status</th>
                    <th className="px-6 py-6">Assigned Analyst</th>
                    <th className="px-6 py-6">Opened</th>
                    <th className="px-6 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cases.map((c) => (
                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-6">
                        <div className="font-serif text-lg text-white font-light">{c.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-2 opacity-50">{c.id}</div>
                      </td>
                      <td className="px-6 py-6">
                        <span
                          className={`inline-block px-2 py-1 font-medium uppercase text-[9px] tracking-widest border ${
                            c.severity === "CRITICAL"
                              ? "text-red-500 border-red-500/30"
                              : c.severity === "HIGH"
                              ? "text-accentGold border-accentGold/30"
                              : "text-gray-400 border-gray-400/30"
                          }`}
                        >
                          {c.severity}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-gray-400 font-light text-sm uppercase tracking-wider">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-gray-400 font-light text-sm flex items-center gap-3">
                        {c.assigned_to || "Unassigned"}
                      </td>
                      <td className="px-6 py-6 text-gray-500 text-[10px] uppercase tracking-widest font-medium">
                        {formatDistanceToNow(new Date(c.created_at))} ago
                      </td>
                      <td className="px-6 py-6 text-right">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-accentGold transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Details
                          <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
