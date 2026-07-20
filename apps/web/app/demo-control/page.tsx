"use client";

import React, { useState } from 'react';
import { Play, Pause, FastForward, RotateCcw, AlertTriangle } from 'lucide-react';

export default function DemoControl() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<string>('');

  const startScenario = async (scenarioId: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`http://localhost:8001/api/v1/demo/replay/${scenarioId}/start`, {
        method: 'POST'
      });
      if (res.ok) {
        setStatus(`Scenario ${scenarioId} dispatched.`);
      } else {
        setStatus(`Failed to dispatch scenario ${scenarioId}`);
      }
    } catch (e) {
      setStatus(`Network error starting scenario.`);
    }
    setLoading(false);
  };

  const syncAuditLogs = async () => {
    try {
      const res = await fetch(`http://localhost:8001/api/v1/ops/reconcile`, { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Demo Control Centre</h1>
        <p className="text-slate-400">Manage deterministic synthetic scenarios and event bus operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-emerald-400">Golden Scenarios</h2>
          <div className="space-y-4">
            <button 
              onClick={() => startScenario('digital-arrest')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left"
            >
              <span>1. Escalating Digital Arrest (Critical)</span>
              <Play className="w-4 h-4" />
            </button>
            <button 
              onClick={() => startScenario('benign-bank-support')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left"
            >
              <span>2. Ambiguous Benign Support (Safe)</span>
              <Play className="w-4 h-4" />
            </button>
            <button 
              onClick={() => startScenario('campaign')}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left border border-amber-900/50"
            >
              <span className="text-amber-500">3. Combined Campaign (Multi-Session + Scan)</span>
              <Play className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Event Bus Ops</h2>
          <div className="space-y-4">
            <button 
              onClick={reconcileDeadLetters}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left"
            >
              <span>Reconcile Dead Letters</span>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm overflow-auto">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
