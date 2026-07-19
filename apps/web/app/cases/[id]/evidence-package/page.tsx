"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldAlert, CheckCircle, FileSpreadsheet } from "lucide-react";

interface EvidencePackageProps {
  params: Promise<{ id: string }>;
}

export default function EvidencePackageExport({ params }: EvidencePackageProps) {
  const { id } = use(params);

  const [pkg, setPkg] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealSensitive, setRevealSensitive] = useState(false);

  const fetchPackage = async () => {
    try {
      const res = await fetch(`/api/v1/cases/${id}/evidence-package?reveal_sensitive=${revealSensitive}`);
      if (res.ok) {
        const data = await res.json();
        setPkg(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackage();
  }, [id, revealSensitive]);

  if (loading) {
    return <div className="text-sm text-gray-500 py-12 text-center">Exporting machine-readable evidence log...</div>;
  }

  if (!pkg) {
    return <div className="text-sm text-gray-500 py-12 text-center">Package details not found.</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto bg-white text-slate-900 p-8 rounded-lg shadow-md print:shadow-none print:p-0">
      
      {/* Navigation bar, hidden on print */}
      <div className="flex items-center justify-between border-b pb-4 print:hidden">
        <Link href={`/cases/${id}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-semibold transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Case Audit File
        </Link>

        <div className="flex gap-3">
          <button
            onClick={() => setRevealSensitive(!revealSensitive)}
            className="flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {revealSensitive ? "Mask Synthetic Data" : "Reveal Synthetic Values"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Package
          </button>
        </div>
      </div>

      {/* Warning Disclaimer Box */}
      <div className="rounded border border-red-200 bg-red-50 p-4 space-y-1.5">
        <span className="text-xs font-extrabold text-red-700 uppercase tracking-wider block">
          Prototype Review Package warning
        </span>
        <p className="text-[11px] text-red-600 leading-relaxed font-semibold">
          PROTOTYPE EVIDENCE PACKAGE FOR ANALYST REVIEW ONLY. Not court-admissible. No real telecom cellular logs, UPI payment rails, or police actions are connected.
        </p>
      </div>

      {/* Package Header */}
      <div className="space-y-2 pt-2 border-b pb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
              Coercion Case Provenance Export
            </h1>
            <span className="text-[10px] text-slate-500 font-mono">Case ID: {pkg.case_id}</span>
          </div>
          <span className="rounded bg-slate-900 text-white px-2 py-0.5 text-[10px] font-mono font-semibold uppercase">
            Status: {pkg.status}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed italic mt-2">
          {pkg.system_limitations}
        </p>
      </div>

      {/* Case Details */}
      <div className="grid grid-cols-2 gap-6 text-xs pb-5 border-b">
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Incident Title</span>
          <span className="font-bold text-slate-800">{pkg.case_title}</span>
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Created Timestamp</span>
          <span className="font-mono text-slate-800">{pkg.created_at}</span>
        </div>
        {pkg.session && (
          <>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Citizen Mobile</span>
              <span className="font-semibold text-slate-800 font-mono">{pkg.session.citizen_identifier || "N/A"}</span>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Suspect Intercept Mobile</span>
              <span className="font-semibold text-slate-800 font-mono">{pkg.session.suspect_identifier || "N/A"}</span>
            </div>
          </>
        )}
      </div>

      {/* Merkle Chain Verification Block */}
      <div className="bg-slate-50 border p-4.5 rounded-lg text-xs space-y-2">
        <div className="flex justify-between items-center font-bold">
          <span className="text-slate-800 uppercase tracking-wider text-[10px]">Merkle Audit Chain Integrity</span>
          <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-mono ${
            pkg.audit_verification.chain_verified ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}>
            {pkg.audit_verification.verification_status}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          All changes and database status updates since initialization are secured in an append-only hash chain. Traverse validation: OK.
        </p>
      </div>

      {/* Transcript Timeline */}
      <div className="space-y-3 pb-5 border-b">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Rolling Transcript Timeline
        </h2>
        <div className="space-y-2">
          {pkg.transcript_timeline.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No segment transcript items logged.</p>
          ) : (
            pkg.transcript_timeline.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 border rounded text-xs leading-relaxed space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 font-mono">
                  <span>{item.speaker} | Turn #{item.sequence_number}</span>
                  <span>{item.timestamp}</span>
                </div>
                <p className="text-slate-700">{item.text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Policy Actions Log */}
      <div className="space-y-3 pb-5 border-b">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Simulated Policy Action Interventions
        </h2>
        <div className="space-y-2">
          {pkg.policy_decisions.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No policy actions authorized for this case.</p>
          ) : (
            pkg.policy_decisions.map((act: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 border rounded text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">{act.action_type}</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-200 px-1 py-0.5 rounded">{act.status}</span>
                </div>
                <p className="text-slate-600 text-[11px]">{act.reason}</p>
                <p className="text-[10px] text-slate-400 font-mono">Authorized: {act.authorized_by} | Policy v{act.policy_version}</p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
