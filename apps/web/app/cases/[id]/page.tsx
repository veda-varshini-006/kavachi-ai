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
    <div className="relative min-h-screen pb-12">
      {/* Background Image for Case Details with Izanami Blend */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/city-bg.jpg"
          alt="Abstract City Grid"
          className="w-full h-full object-cover opacity-10 mix-blend-luminosity blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
      </div>

      <div className="space-y-12 max-w-[1200px] mx-auto pt-4 relative z-10">
        {/* Back button and title */}
        <div className="space-y-8 border-b border-white/5 pb-8">
          <Link href="/cases" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 hover:text-accentGold transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to Incident Cases
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="font-serif text-4xl text-white font-medium mb-2">{caseObj.title}</h1>
              <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">CASE ID: {caseObj.id}</p>
            </div>
            <div className="flex gap-4">
              {caseObj.analyst_verdict && (
                <span className={`px-4 py-2 text-[10px] font-medium tracking-widest uppercase border ${
                  caseObj.analyst_verdict === "FALSE_POSITIVE"
                    ? "text-emerald-500 border-emerald-500/30"
                    : caseObj.analyst_verdict === "CONFIRMED_SUSPICIOUS"
                    ? "text-red-500 border-red-500/30"
                    : "text-accentGold border-accentGold/30"
                }`}>
                  Audit: {caseObj.analyst_verdict.replace("_", " ")}
                </span>
              )}
              <span className="px-4 py-2 border border-white/10 bg-background/50 text-[10px] text-gray-300 font-medium uppercase tracking-widest">
                Status: {caseObj.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column: Details & Feedback (5 cols) */}
          <div className="lg:col-span-5 space-y-12">
            {/* Metadata Card */}
            <div className="space-y-8">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 border-b border-white/5 pb-4">Case Metadata</h2>
              
              <div className="grid grid-cols-2 gap-8 text-[10px] uppercase tracking-widest">
                <div>
                  <span className="text-gray-600 block mb-2">Severity</span>
                  <span className={`font-medium ${caseObj.severity === 'CRITICAL' ? 'text-red-500' : caseObj.severity === 'HIGH' ? 'text-accentGold' : 'text-white'}`}>{caseObj.severity}</span>
                </div>
                <div>
                  <span className="text-gray-600 block mb-2">Assigned To</span>
                  <span className="font-medium text-white">{caseObj.assigned_to || "Unassigned"}</span>
                </div>
                {session && (
                  <>
                    <div>
                      <span className="text-gray-600 block mb-2">Citizen Target</span>
                      <span className="font-mono text-white">{session.citizen_identifier}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-2">Suspect Phone</span>
                      <span className="font-mono text-white">{session.suspect_identifier}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pt-4">
                <span className="text-[10px] text-gray-600 uppercase block font-medium tracking-widest mb-4">Incident Profile Summary</span>
                <p className="font-serif text-lg text-gray-300 font-light leading-relaxed">{caseObj.description}</p>
              </div>
            </div>

            {/* Analyst Review Feedback Form */}
            <div className="border border-white/5 bg-background/30 p-8 space-y-8 backdrop-blur-sm">
              <div>
                <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white flex items-center gap-3 mb-2">
                  <UserCheck className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
                  Post-Audit Verdict Review
                </h2>
                <p className="text-[10px] font-light text-gray-500">
                  Audit the auto-verdict for reporting accuracy (does not retrain downstream rules).
                </p>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                <div>
                  <label htmlFor="verdictSelect" className="text-[9px] font-medium uppercase tracking-widest text-gray-500 block mb-3">Resolution Verdict</label>
                  <select
                    id="verdictSelect"
                    value={analystVerdict}
                    onChange={(e) => setAnalystVerdict(e.target.value)}
                    className="w-full bg-transparent border-b border-white/20 pb-2 text-[11px] uppercase tracking-widest text-white focus:outline-none focus:border-accentGold transition-colors [&>option]:bg-background [&>option]:text-white"
                  >
                    <option value="UNRESOLVED">Unresolved / In Investigation</option>
                    <option value="CONFIRMED_SUSPICIOUS">Confirmed Coercive Scam</option>
                    <option value="FALSE_POSITIVE">False Positive (Benign support)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="auditNotes" className="text-[9px] font-medium uppercase tracking-widest text-gray-500 block mb-3">Audit Trail Notes</label>
                  <textarea
                    id="auditNotes"
                    placeholder="Provide detailed justification for the verification audit..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-light placeholder-gray-600 focus:outline-none focus:border-accentGold transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full border border-accentGold text-accentGold hover:bg-accentGold hover:text-black py-4 text-[10px] uppercase tracking-widest font-medium transition-colors disabled:opacity-50"
                >
                  {submittingFeedback ? "Saving Verdict..." : "Save Audit Verdict"}
                </button>
              </form>
            </div>

            {/* Evidence packages log */}
            <div className="space-y-8 pt-4 border-t border-white/5">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">Evidence Packages Log</h2>

              {/* Log form */}
              <form onSubmit={handleAddEvidence} className="space-y-6 bg-white/[0.02] p-6 border border-white/5">
                <input
                  type="text"
                  placeholder="Evidence Title (e.g. Noida Tower Log)"
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-light placeholder-gray-600 focus:outline-none focus:border-accentGold transition-colors"
                />
                <textarea
                  placeholder="Description / SHA hash checksum notes"
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-transparent border-b border-white/20 pb-2 text-sm text-white font-light placeholder-gray-600 focus:outline-none focus:border-accentGold transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={uploadingEv}
                  className="w-full border border-white/20 hover:border-white/60 py-3 text-[10px] uppercase tracking-widest font-medium transition-colors text-white disabled:opacity-50"
                >
                  {uploadingEv ? "Logging Evidence..." : "Add Synthetic Evidence Log"}
                </button>
              </form>

              <div className="space-y-4">
                {evidenceList.length === 0 ? (
                  <p className="text-[10px] uppercase tracking-widest font-light text-gray-600 text-center py-4">No evidence logs posted yet.</p>
                ) : (
                  evidenceList.map((ev, idx) => (
                    <div key={idx} className="border-l-2 border-accentGold pl-4 py-2 space-y-2">
                      <div className="flex items-center justify-between text-white font-medium">
                        <span className="flex items-center gap-3 text-[10px] uppercase tracking-widest">
                          <FileCode className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
                          {ev.name}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-gray-500">
                          {formatDistanceToNow(new Date(ev.created_at))} ago
                        </span>
                      </div>
                      <p className="text-gray-400 font-light text-sm">{ev.description}</p>
                      <p className="text-[9px] text-gray-600 font-mono select-all tracking-widest">SHA-256: {ev.file_hash.substring(0, 24)}...</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Case Logs & Analyst Notes (7 cols) */}
          <div className="lg:col-span-7 space-y-8 flex flex-col lg:border-l lg:border-white/5 lg:pl-12 pt-12 lg:pt-0">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 border-b border-white/5 pb-4">Analyst Action Log</h2>

            {/* Note post form */}
            <form onSubmit={handlePostNote} className="flex flex-col gap-6 pt-4">
              <textarea
                placeholder="Type analyst action notes..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
                className="w-full bg-background/50 border border-white/10 p-4 text-sm text-white font-light placeholder-gray-600 focus:outline-none focus:border-accentGold transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={postingNote}
                className="self-end bg-accentGold hover:bg-white text-black px-8 py-3 text-[10px] uppercase tracking-widest font-medium flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add Note
              </button>
            </form>

            <div className="space-y-8 pt-8 overflow-y-auto max-h-[600px] pr-4">
              {notes.length === 0 ? (
                <p className="text-[10px] uppercase tracking-widest font-light text-gray-600 text-center py-12 border border-white/5">No analyst logs recorded yet.</p>
              ) : (
                notes.map((n, idx) => (
                  <div key={idx} className="border-b border-white/5 pb-8 space-y-4">
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-500 font-medium">
                      <span className="text-accentGold">AUTHOR: {n.author}</span>
                      <span>{formatDistanceToNow(new Date(n.created_at))} ago</span>
                    </div>
                    <p className="font-serif text-xl font-light text-gray-300 leading-relaxed">{n.note_text}</p>
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
