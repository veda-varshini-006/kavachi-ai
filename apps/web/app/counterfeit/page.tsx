"use client";

import { useEffect, useState } from "react";
import {
  Scan,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Upload,
  Trash2,
  PlusCircle,
  Link2,
  Activity,
  FileSpreadsheet
} from "lucide-react";

interface ScanResult {
  scan_id: string;
  verdict: "LIKELY_GENUINE" | "SUSPECT_COUNTERFEIT" | "NEEDS_MANUAL_REVIEW";
  risk_score: number;
  confidence: number;
  quality_score: number;
  detected_side: string;
  feature_checks: {
    resolution_check: boolean;
    focus_check: boolean;
    exposure_check: boolean;
    layout_alignment: boolean;
    serial_format: boolean;
  };
  anomaly_regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    description: string;
  }>;
  model_version: string;
  processing_time_ms: number;
  limitations: string;
}

interface Case {
  id: string;
  title: string;
  status: string;
}

export default function CounterfeitScreening() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  
  // Case linking states
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [linkedCaseId, setLinkedCaseId] = useState<string | null>(null);

  // Evaluation states
  const [evalData, setEvalData] = useState<any | null>(null);

  // Storage deleted state
  const [imageDeleted, setImageDeleted] = useState(false);

  const fetchCasesAndEval = async () => {
    try {
      const [casesRes, evalRes] = await Promise.all([
        fetch("/api/v1/cases?page_size=20"),
        fetch("/api/v1/counterfeit/evaluation")
      ]);
      if (casesRes.ok) {
        const cData = await casesRes.json();
        setCases(cData.items || []);
        if (cData.items?.length > 0) {
          setSelectedCaseId(cData.items[0].id);
        }
      }
      if (evalRes.ok) {
        const eData = await evalRes.json();
        setEvalData(eData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCasesAndEval();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setResult(null);
      setImageDeleted(false);
      setLinkedCaseId(null);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setImageDeleted(false);
    setResult(null);
    setLinkedCaseId(null);

    const formData = new FormData();
    formData.append("file", file);
    if (selectedCaseId) {
      formData.append("case_id", selectedCaseId);
    }

    try {
      const res = await fetch("/api/v1/counterfeit/scan", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.scan);
        setLinkedCaseId(data.linked_case_id);
      } else {
        const err = await res.json();
        alert(`Analysis Error: ${err.detail || "Verification failed"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCaseScan = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("create_case_if_needed", "true");

    try {
      const res = await fetch("/api/v1/counterfeit/scan", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.scan);
        setLinkedCaseId(data.linked_case_id);
        fetchCasesAndEval(); // refresh dropdown list
        alert(`New counterfeit-seizure case created successfully! ID: ${data.linked_case_id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!result) return;

    try {
      const res = await fetch(`/api/v1/counterfeit/scan/${result.scan_id}/original`, {
        method: "DELETE"
      });
      if (res.ok) {
        setImageDeleted(true);
        alert("Original suspect image deleted from server disk storage successfully!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative min-h-screen pb-12">
      {/* Background Image for Counterfeit Module with Izanami Blend */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/counterfeit-bg.jpg"
          alt="Abstract geometric nodes"
          className="w-full h-full object-cover opacity-15 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/95 to-background" />
      </div>

      <div className="space-y-12 max-w-[1600px] mx-auto pt-4 relative z-10">
        {/* Title */}
        <div className="border-b border-white/5 pb-8">
          <h1 className="font-serif text-4xl text-white font-medium mb-3 flex items-center gap-4">
            <Scan className="h-6 w-6 text-accentGold" strokeWidth={1.5} />
            Suspect Currency Screening
          </h1>
          <p className="text-sm text-gray-500 font-light max-w-2xl leading-relaxed tracking-wide">
            AI-assisted banknote layout anomaly detection. Screen watermarks, color shifts, and serial numbers.
          </p>
        </div>

        {/* Warning watermark */}
        <div className="border border-red-500/20 bg-background/50 p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50" />
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-2">Screening Tool Boundary Notice</span>
          <p className="text-xs text-gray-400 leading-relaxed font-light">
            AI-ASSISTED SCREENING PROTOTYPE ONLY - NOT COURT ADMISSIBLE. Never distribute high-resolution currency templates. Physical security features and expert authentication are strictly required.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column: Image scanner dropzone (7 cols) */}
          <div className="lg:col-span-8 space-y-12">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 border-b border-white/5 pb-4">
              Upload & Scan Interface
            </h2>
            
            <form onSubmit={handleScanSubmit} className="space-y-8">
              {/* Dropzone area */}
              <div className="flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-accentGold bg-background/30 p-12 transition-colors cursor-pointer relative group backdrop-blur-sm">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                
                {previewUrl ? (
                  <div className="relative max-w-full">
                    {/* Render preview image with absolute scaled overlays */}
                    <img src={previewUrl} alt="Banknote preview" className="max-h-[400px] border border-white/10 opacity-80" />
                    
                    {/* Render Anomaly Regions Overlay on top */}
                    {result && !imageDeleted && result.anomaly_regions.map((reg, idx) => (
                      <div
                        key={idx}
                        className="absolute border border-accentGold bg-accentGold/10 cursor-help group/reg"
                        style={{
                          left: `${(reg.x / 1200) * 100}%`,
                          top: `${(reg.y / 570) * 100}%`,
                          width: `${(reg.width / 1200) * 100}%`,
                          height: `${(reg.height / 570) * 100}%`
                        }}
                        title={reg.description}
                      >
                        <span className="absolute -top-6 left-0 bg-background border border-accentGold text-accentGold text-[8px] uppercase tracking-widest px-2 py-1 truncate max-w-[200px] shadow-lg">
                          {reg.description}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Upload className="h-8 w-8 text-gray-500 group-hover:text-accentGold transition-colors mx-auto" strokeWidth={1.5} />
                    <p className="text-sm font-light text-gray-300">Drag & drop JPEGs/PNGs here or click to select</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-600">MIME limits: image/jpeg or image/png under 8MB</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {file && (
                <div className="flex flex-col sm:flex-row gap-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-accentGold hover:bg-white text-black py-4 text-[10px] uppercase tracking-widest font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? "Analyzing image..." : "Scan & Screen Suspect Note"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateCaseScan}
                    disabled={loading}
                    className="flex-1 border border-white/20 hover:border-accentGold text-white hover:text-accentGold py-4 text-[10px] uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <PlusCircle className="h-4 w-4" strokeWidth={1.5} />
                    Escalate Seizure case
                  </button>
                </div>
              )}
            </form>

            {/* Scanned Results Panels */}
            {result && (
              <div className="space-y-12">
                
                {/* Result Headline Card */}
                <div className="border-b border-white/5 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em] block mb-4">Screening Verdict</span>
                    <h3 className={`font-serif text-3xl font-light flex items-center gap-4 ${
                      result.verdict === "LIKELY_GENUINE"
                        ? "text-emerald-500"
                        : result.verdict === "SUSPECT_COUNTERFEIT"
                        ? "text-red-500"
                        : "text-accentGold"
                    }`}>
                      {result.verdict === "LIKELY_GENUINE" ? (
                        <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />
                      ) : (
                        <ShieldAlert className="h-6 w-6" strokeWidth={1.5} />
                      )}
                      {result.verdict.replace(/_/g, " ")}
                    </h3>
                  </div>

                  <div className="text-left md:text-right space-y-2">
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em] block">Risk Score</span>
                    <span className="font-serif text-4xl text-white font-light">{(result.risk_score * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Features checklists and anomalies logs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm font-light">
                  
                  {/* Visual Consistency Checklist */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Visual Consistency Checks</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-gray-400">Layout Alignment</span>
                        <span className={`text-[10px] uppercase tracking-widest font-medium ${result.feature_checks.layout_alignment ? "text-emerald-500" : "text-red-500"}`}>
                          {result.feature_checks.layout_alignment ? "Consistent" : "Discrepancy"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-gray-400">Serial Format Plausibility</span>
                        <span className={`text-[10px] uppercase tracking-widest font-medium ${result.feature_checks.serial_format ? "text-emerald-500" : "text-red-500"}`}>
                          {result.feature_checks.serial_format ? "Valid Structure" : "Malformed Pattern"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-gray-400">Exposure Focus Level</span>
                        <span className={`text-[10px] uppercase tracking-widest font-medium ${result.feature_checks.focus_check ? "text-emerald-500" : "text-red-500"}`}>
                          {result.feature_checks.focus_check ? "In Focus" : "Blur Mismatch"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quality metrics and controls */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Quality Indicators & Storage</h4>
                    <div className="space-y-6">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 block mb-3">Quality Score / {(result.quality_score * 100).toFixed(0)}%</span>
                        <div className="w-full bg-background border border-white/10 h-1 relative">
                          <div className="bg-accentGold h-1 absolute left-0 top-0" style={{ width: `${result.quality_score * 100}%` }}></div>
                        </div>
                      </div>

                      {/* Hard Delete image command */}
                      <button
                        onClick={handleDeleteImage}
                        disabled={imageDeleted}
                        className="w-full flex items-center justify-center gap-3 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white py-3 text-[10px] uppercase tracking-widest font-medium transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        {imageDeleted ? "Original image deleted" : "Delete Original Image"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Case attachment section */}
                <div className="pt-8">
                  {linkedCaseId ? (
                    <div className="bg-background/50 p-6 border border-white/10 flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-3">
                        <Link2 className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
                        Associated Case ID
                      </span>
                      <span className="font-mono text-white text-sm">{linkedCaseId}</span>
                    </div>
                  ) : (
                    cases.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <label className="text-[10px] uppercase tracking-widest text-gray-400 shrink-0">Associate with Case Queue:</label>
                        <select
                          value={selectedCaseId}
                          onChange={(e) => setSelectedCaseId(e.target.value)}
                          className="flex-1 w-full bg-transparent border-b border-white/20 pb-2 text-[11px] uppercase tracking-widest text-white focus:outline-none focus:border-accentGold transition-colors [&>option]:bg-background [&>option]:text-white"
                        >
                          {cases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title} ({c.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Right Column: Synthetic Perturbation Evaluations Benchmarks (5 cols) */}
          <div className="lg:col-span-4 lg:border-l lg:border-white/5 lg:pl-12 pt-12 lg:pt-0">
            <div className="space-y-8">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500 border-b border-white/5 pb-4 flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 text-accentGold" strokeWidth={1.5} />
                Perturbation Evaluation splits
              </h2>

              {evalData ? (
                <div className="space-y-12">
                  {/* Metrics list */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400">Total Benchmark Cases</span>
                      <span className="font-mono text-xl text-white font-light">{evalData.metrics_summary.total_benchmark_cases}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400">Macro-F1 Accuracy</span>
                      <span className="font-mono text-xl text-white font-light">{(evalData.metrics_summary.accuracy * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400">False Acceptance Rate (FAR)</span>
                      <span className="font-mono text-xl text-white font-light">{(evalData.metrics_summary.false_acceptance_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400">Manual-Review Abstention</span>
                      <span className="font-mono text-xl text-white font-light">{(evalData.metrics_summary.abstention_manual_review_rate * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Performance Splits Labels */}
                  <div className="space-y-6">
                    <div className="bg-background/30 p-6 border border-white/5 space-y-4">
                      <span className="text-[10px] text-accentGold font-medium uppercase tracking-[0.2em] block">Synthetic Perturbations Accuracy</span>
                      <p className="font-serif text-lg text-gray-300 font-light leading-relaxed">
                        {(evalData.performance_splits.synthetic_perturbations_performance.accuracy * 100).toFixed(0)}% accuracy score on programmatically perturbed watermarked templates.
                      </p>
                    </div>
                    <div className="bg-background/30 p-6 border border-white/5 space-y-4">
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em] block">Real-World Production Accuracy</span>
                      <p className="text-[10px] uppercase tracking-widest text-gray-600 leading-relaxed">
                        Notice: real-world currency performance is untested. Platform remains an analyst prototype simulation only.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] uppercase tracking-widest font-light text-gray-600 text-center py-12 border border-white/5">Loading evaluation metrics...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
