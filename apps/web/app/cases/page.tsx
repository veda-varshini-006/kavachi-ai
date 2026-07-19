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
    <div className="space-y-8">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-accentTeal" />
            Public Safety Incident Cases
          </h1>
          <p className="text-sm text-gray-400">
            Audit public safety cybercrime scam cases, coordinate responses, and review interventions.
          </p>
        </div>
      </div>

      {/* Filter and controls row */}
      <div className="rounded-xl border border-borderBg bg-cardBg p-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Severity Filter</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded bg-slate-800 border border-borderBg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accentTeal"
            >
              <option value="">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded bg-slate-800 border border-borderBg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accentTeal"
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

        <div className="text-xs text-gray-400">
          Showing {cases.length} cases
        </div>
      </div>

      {/* Cases list table */}
      <div className="rounded-xl border border-borderBg bg-cardBg overflow-hidden">
        {loading ? (
          <div className="text-sm text-gray-500 py-12 text-center">Loading incident cases...</div>
        ) : cases.length === 0 ? (
          <div className="text-sm text-gray-500 py-16 text-center">
            No incident cases found matching these filters. Try resetting the DB.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-borderBg bg-background/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned Analyst</th>
                  <th className="px-6 py-4">Opened</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderBg/50">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{c.title}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{c.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded px-2.5 py-0.5 font-bold uppercase text-[10px] border ${
                          c.severity === "CRITICAL"
                            ? "bg-accentRed/10 text-accentRed border-accentRed/30"
                            : c.severity === "HIGH"
                            ? "bg-accentAmber/10 text-accentAmber border-accentAmber/30"
                            : "bg-slate-700/10 text-gray-300 border-slate-700/30"
                        }`}
                      >
                        {c.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-800 border border-borderBg px-2 py-0.5 text-gray-300 font-medium">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-semibold">{c.assigned_to || "Unassigned"}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {formatDistanceToNow(new Date(c.created_at))} ago
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700/80 px-3 py-1.5 text-xs text-white border border-borderBg transition font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                        <ChevronRight className="h-3 w-3 text-gray-500" />
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
  );
}
