"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Send, FileCode, CheckCircle, ShieldAlert, Sparkles, UserCheck, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CaseDetailsProps {
  params: Promise<{ id: string }>;
}

interface Case {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  session_id?: string;
  analyst_verdict?: string;
  feedback_notes?: string;
}

interface Note {
  id: string;
  author: string;
  note_text: string;
  created_at: string;
}

interface Evidence {
  id: string;
  name: string;
  description: string;
  file_path: string;
  file_hash: string;
  created_by: string;
  created_at: string;
}

interface Session {
  id: string;
  channel: string;
  citizen_identifier: string;
  suspect_identifier: string;
}

export default function CaseDetails({ params }: CaseDetailsProps) {
  const { id } = use(params);

  const [caseObj, setCaseObj] = useState<Case | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newNote, setNewNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [evName, setEvName] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [uploadingEv, setUploadingEv] = useState(false);

  // Feedback states
  const [analystVerdict, setAnalystVerdict] = useState("UNRESOLVED");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/v1/cases/${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCaseObj(data.case);
      setNotes(data.notes || []);
      setEvidenceList(data.evidence || []);
      setSession(data.session);
      setSegments(data.segments || []);
      
      if (data.case.analyst_verdict) {
        setAnalystVerdict(data.case.analyst_verdict);
      }
      if (data.case.feedback_notes) {
        setFeedbackNotes(data.case.feedback_notes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setPostingNote(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "Analyst-01", note_text: newNote })
      });
      if (res.ok) {
        setNewNote("");
        fetchDetails();
      }
    } catch (err) {
      console.error("Failed to post note:", err);
    } finally {
      setPostingNote(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evName.trim() || !evDesc.trim()) return;
    setUploadingEv(true);

    try {
      const formData = new FormData();
      formData.append("name", evName);
      formData.append("description", evDesc);
      formData.append("created_by", "Analyst-01");
      const dummyFile = new Blob(["Synthetic case evidence logs"], { type: "text/plain" });
      formData.append("file", dummyFile, `${evName.toLowerCase().replace(/\s+/g, "_")}.txt`);

      const res = await fetch(`/api/v1/cases/${id}/evidence`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        setEvName("");
        setEvDesc("");
        fetchDetails();
      }
    } catch (err) {
      console.error("Failed to add evidence:", err);
    } finally {
      setUploadingEv(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyst_verdict: analystVerdict,
          feedback_notes: feedbackNotes
        })
      });
      if (res.ok) {
        alert("Analyst review verdict saved to audit trail successfully!");
        fetchDetails();
      }
    } catch (err) {
      console.error("Failed to save feedback:", err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading) {
    return <div className="text-sm text-gray-500 py-12 text-center">Loading case file details...</div>;
  }

  if (!caseObj) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-sm text-gray-500">Case file not found.</p>
        <Link href="/cases" className="text-xs text-accentTeal hover:underline">
          Return to cases index
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back button and title */}
      <div className="space-y-4">
        <Link href="/cases" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Incident Cases
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{caseObj.title}</h1>
            <p className="text-xs font-mono text-gray-500 mt-1">Case ID: {caseObj.id}</p>
          </div>
          <div className="flex gap-2">
            {caseObj.analyst_verdict && (
              <span className={`rounded border px-3 py-1 text-xs font-bold uppercase ${
                caseObj.analyst_verdict === "FALSE_POSITIVE"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : caseObj.analyst_verdict === "CONFIRMED_SUSPICIOUS"
                  ? "bg-accentRed/10 text-accentRed border-accentRed/30"
                  : "bg-accentAmber/10 text-accentAmber border-accentAmber/30"
              }`}>
                Audit: {caseObj.analyst_verdict.replace("_", " ")}
              </span>
            )}
            <span className="rounded bg-slate-800 border border-borderBg px-3 py-1 text-xs text-gray-300 font-bold uppercase">
              Status: {caseObj.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Details & Feedback (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Metadata Card */}
          <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Case Metadata</h2>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Severity</span>
                <span className="font-semibold text-white uppercase">{caseObj.severity}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Assigned To</span>
                <span className="font-semibold text-white">{caseObj.assigned_to || "Unassigned"}</span>
              </div>
              {session && (
                <>
                  <div>
                    <span className="text-gray-500 block">Citizen Target</span>
                    <span className="font-semibold text-white">{session.citizen_identifier}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Suspect Phone</span>
                    <span className="font-semibold text-white">{session.suspect_identifier}</span>
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-borderBg/50 pt-4">
              <span className="text-[10px] text-gray-500 uppercase block font-bold mb-1">Incident Profile Summary</span>
              <p className="text-xs text-gray-300 leading-relaxed">{caseObj.description}</p>
            </div>
          </div>

          {/* Analyst Review Feedback Form */}
          <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <UserCheck className="h-4.5 w-4.5 text-accentTeal" />
              Post-Audit Verdict Review
            </h2>
            <p className="text-[11px] text-gray-400">
              Audit the auto-verdict for reporting accuracy (does not retrain downstream rules).
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1.5">Resolution Verdict</label>
                <select
                  value={analystVerdict}
                  onChange={(e) => setAnalystVerdict(e.target.value)}
                  className="w-full rounded bg-slate-800 border border-borderBg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accentTeal"
                >
                  <option value="UNRESOLVED">Unresolved / In Investigation</option>
                  <option value="CONFIRMED_SUSPICIOUS">Confirmed Coercive Scam</option>
                  <option value="FALSE_POSITIVE">False Positive (Benign support)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1.5">Audit Trail Notes</label>
                <textarea
                  placeholder="Provide detailed justification for the verification audit..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-slate-800 border border-borderBg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accentTeal"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback}
                className="w-full bg-accentTeal hover:bg-cyan-500 text-black py-2 rounded text-xs font-bold transition disabled:opacity-50"
              >
                {submittingFeedback ? "Saving Verdict..." : "Save Audit Verdict"}
              </button>
            </form>
          </div>

          {/* Evidence packages log */}
          <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Evidence Packages Log</h2>

            {/* Log form */}
            <form onSubmit={handleAddEvidence} className="space-y-3">
              <input
                type="text"
                placeholder="Evidence Title (e.g. Noida Tower Log)"
                value={evName}
                onChange={(e) => setEvName(e.target.value)}
                className="w-full rounded bg-slate-800/80 border border-borderBg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accentTeal"
              />
              <textarea
                placeholder="Description / SHA hash checksum notes"
                value={evDesc}
                onChange={(e) => setEvDesc(e.target.value)}
                rows={2}
                className="w-full rounded bg-slate-800/80 border border-borderBg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accentTeal"
              />
              <button
                type="submit"
                disabled={uploadingEv}
                className="w-full bg-slate-800 hover:bg-slate-700/80 border border-borderBg hover:border-accentTeal py-1.5 rounded text-xs font-semibold transition text-white disabled:opacity-50"
              >
                {uploadingEv ? "Logging Evidence..." : "Add Synthetic Evidence Log"}
              </button>
            </form>

            <div className="border-t border-borderBg/50 pt-4 space-y-3">
              {evidenceList.length === 0 ? (
                <p className="text-xs text-gray-500">No evidence logs posted yet.</p>
              ) : (
                evidenceList.map((ev, idx) => (
                  <div key={idx} className="rounded-lg bg-background/40 border border-borderBg p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-gray-200 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-accentTeal" />
                        {ev.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {formatDistanceToNow(new Date(ev.created_at))} ago
                      </span>
                    </div>
                    <p className="text-gray-400 text-[11px]">{ev.description}</p>
                    <p className="text-[9px] text-gray-600 font-mono select-all">SHA-256: {ev.file_hash.substring(0, 24)}...</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Case Logs & Analyst Notes (7 cols) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          {/* Notes Log */}
          <div className="rounded-xl border border-borderBg bg-cardBg p-6 flex flex-col min-h-0 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Analyst Action Log</h2>

            {/* Note post form */}
            <form onSubmit={handlePostNote} className="flex gap-3">
              <input
                type="text"
                placeholder="Type analyst action notes..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 rounded bg-slate-800 border border-borderBg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accentTeal"
              />
              <button
                type="submit"
                disabled={postingNote}
                className="bg-accentTeal hover:bg-cyan-500 text-black px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5 text-black" />
                Add Note
              </button>
            </form>

            <div className="space-y-4 overflow-y-auto max-h-[450px] pr-2">
              {notes.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No analyst logs recorded yet.</p>
              ) : (
                notes.map((n, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-800/30 border border-borderBg p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                      <span>Author: {n.author}</span>
                      <span>{formatDistanceToNow(new Date(n.created_at))} ago</span>
                    </div>
                    <p className="text-gray-200 leading-relaxed">{n.note_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
