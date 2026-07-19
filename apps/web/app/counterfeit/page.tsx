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
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Scan className="h-6 w-6 text-accentTeal" />
          Suspect Currency Screening
        </h1>
        <p className="text-sm text-gray-400">
          AI-assisted banknote layout anomaly detection. Screen watermarks, color shifts, and serial numbers.
        </p>
      </div>

      {/* Warning watermark */}
      <div className="rounded border border-red-500/20 bg-red-500/5 p-4.5">
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">Screening Tool boundary notice</span>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          AI-ASSISTED SCREENING PROTOTYPE ONLY - NOT COURT ADMISSIBLE. Never distribute high-resolution currency templates. Physical security features and expert authentication are strictly required.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Image scanner dropzone (7 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-borderBg bg-cardBg p-6 space-y-6">
            
            <form onSubmit={handleScanSubmit} className="space-y-6">
              {/* Dropzone area */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-borderBg hover:border-accentTeal rounded-lg p-8 bg-background/20 transition cursor-pointer relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                
                {previewUrl ? (
                  <div className="relative max-w-full">
                    {/* Render preview image with absolute scaled overlays */}
                    <img src={previewUrl} alt="Banknote preview" className="rounded max-h-[300px] border border-borderBg" />
                    
                    {/* Render Anomaly Regions Overlay on top */}
                    {result && !imageDeleted && result.anomaly_regions.map((reg, idx) => (
                      <div
                        key={idx}
                        className="absolute border-2 border-accentRed bg-accentRed/10 cursor-help group"
                        style={{
                          left: `${(reg.x / 1200) * 100}%`,
                          top: `${(reg.y / 570) * 100}%`,
                          width: `${(reg.width / 1200) * 100}%`,
                          height: `${(reg.height / 570) * 100}%`
                        }}
                        title={reg.description}
                      >
                        <span className="absolute -top-5 left-0 bg-accentRed text-white text-[9px] font-bold px-1 rounded truncate max-w-[150px]">
                          {reg.description}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center space-y-2.5">
                    <Upload className="h-8 w-8 text-gray-500 mx-auto" />
                    <p className="text-xs text-gray-300">Drag & drop JPEGs/PNGs here or click to select</p>
                    <p className="text-[10px] text-gray-500">MIME limits: image/jpeg or image/png under 8MB</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {file && (
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-accentTeal hover:bg-cyan-500 text-black py-2.5 rounded text-xs font-bold transition disabled:opacity-50"
                  >
                    {loading ? "Analyzing image..." : "Scan & Screen Suspect Note"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateCaseScan}
                    disabled={loading}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 rounded text-xs font-semibold border border-borderBg transition flex items-center gap-1.5"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Escalate Seizure case
                  </button>
                </div>
              )}
            </form>

            {/* Scanned Results Panels */}
            {result && (
              <div className="border-t border-borderBg/50 pt-6 space-y-6">
                
                {/* Result Headline Card */}
                <div className={`rounded-lg border p-4 flex justify-between items-center ${
                  result.verdict === "LIKELY_GENUINE"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : result.verdict === "SUSPECT_COUNTERFEIT"
                    ? "bg-accentRed/5 border-accentRed/20"
                    : "bg-accentAmber/5 border-accentAmber/20"
                }`}>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Screening Verdict:</span>
                    <h3 className={`text-base font-extrabold flex items-center gap-2 ${
                      result.verdict === "LIKELY_GENUINE"
                        ? "text-emerald-500"
                        : result.verdict === "SUSPECT_COUNTERFEIT"
                        ? "text-accentRed"
                        : "text-accentAmber"
                    }`}>
                      {result.verdict === "LIKELY_GENUINE" ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <ShieldAlert className="h-5 w-5" />
                      )}
                      {result.verdict}
                    </h3>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Risk Score:</span>
                    <span className="text-sm font-bold text-white">{(result.risk_score * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Features checklists and anomalies logs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  
                  {/* Visual Consistency Checklist */}
                  <div className="bg-background/30 p-4.5 rounded-lg border border-borderBg/40 space-y-3">
                    <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Visual Consistency Checks</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Layout Alignment</span>
                        <span className={result.feature_checks.layout_alignment ? "text-emerald-500" : "text-accentRed"}>
                          {result.feature_checks.layout_alignment ? "Consistent" : "Discrepancy"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Serial Format Plausibility</span>
                        <span className={result.feature_checks.serial_format ? "text-emerald-500" : "text-accentRed"}>
                          {result.feature_checks.serial_format ? "Valid Structure" : "Malformed Pattern"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Exposure Focus Level</span>
                        <span className={result.feature_checks.focus_check ? "text-emerald-500" : "text-accentRed"}>
                          {result.feature_checks.focus_check ? "In Focus" : "Blur Mismatch"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quality metrics and controls */}
                  <div className="bg-background/30 p-4.5 rounded-lg border border-borderBg/40 space-y-3">
                    <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Quality Indicators & Storage</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Quality Score ({result.quality_score * 100}%)</span>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div className="bg-accentTeal h-1.5 rounded-full" style={{ width: `${result.quality_score * 100}%` }}></div>
                        </div>
                      </div>

                      {/* Hard Delete image command */}
                      <button
                        onClick={handleDeleteImage}
                        disabled={imageDeleted}
                        className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-1.5 border border-red-500/30 rounded text-[11px] font-bold transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {imageDeleted ? "Original image deleted" : "Delete Original Image"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Case attachment section */}
                {linkedCaseId ? (
                  <div className="bg-slate-800/60 p-4 rounded border border-borderBg text-xs flex justify-between items-center">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Link2 className="h-4 w-4 text-accentTeal" />
                      Associated Case ID:
                    </span>
                    <span className="font-mono text-white font-bold">{linkedCaseId}</span>
                  </div>
                ) : (
                  cases.length > 0 && (
                    <div className="border-t border-borderBg/50 pt-4 flex gap-4 items-center">
                      <label className="text-xs text-gray-400 shrink-0">Associate with Case Queue:</label>
                      <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="flex-1 bg-slate-800 text-xs text-white border border-borderBg rounded px-2.5 py-1.5 focus:outline-none"
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
            )}

          </div>
        </div>

        {/* Right Column: Synthetic Perturbation Evaluations Benchmarks (5 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-borderBg bg-cardBg p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <FileSpreadsheet className="h-4.5 w-4.5 text-accentTeal" />
              Perturbation Evaluation splits
            </h2>

            {evalData ? (
              <div className="space-y-4 text-xs">
                {/* Metrics list */}
                <div className="bg-background/40 p-4.5 rounded-lg border border-borderBg/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Benchmark Cases</span>
                    <span className="font-mono text-white">{evalData.metrics_summary.total_benchmark_cases}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Macro-F1 Accuracy</span>
                    <span className="font-mono text-white">{(evalData.metrics_summary.accuracy * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">False Acceptance Rate (FAR)</span>
                    <span className="font-mono text-white">{(evalData.metrics_summary.false_acceptance_rate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Manual-Review Abstention Rate</span>
                    <span className="font-mono text-white">{(evalData.metrics_summary.abstention_manual_review_rate * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Performance Splits Labels */}
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/40 border border-borderBg/50 rounded space-y-1">
                    <span className="text-[10px] text-accentTeal font-bold uppercase tracking-wider">Synthetic Perturbations Accuracy</span>
                    <p className="text-[10px] text-gray-400">{(evalData.performance_splits.synthetic_perturbations_performance.accuracy * 100).toFixed(0)}% accuracy score on programmatically perturbed watermarked templates.</p>
                  </div>
                  <div className="p-3 bg-slate-800/40 border border-borderBg/50 rounded space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Real-World Production Accuracy</span>
                    <p className="text-[10px] text-slate-500">Notice: real-world currency performance is untested. Platform remains an analyst prototype simulation only.</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-6 text-center">Loading evaluation metrics...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
