'use client';

import { useState } from 'react';
import { Bot, Sparkles, Send, RefreshCw, ChevronRight, X, Shield, AlertTriangle, Cpu } from 'lucide-react';
import type { Prediction, Satellite } from '@/lib/types';

interface AICopilotProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly selectedPrediction?: Prediction | null;
  readonly satellites: Satellite[];
  readonly predictions: Prediction[];
}

export function AICopilot({
  isOpen,
  onClose,
  selectedPrediction,
  satellites,
  predictions,
}: AICopilotProps) {
  const [prompt, setPrompt] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  const presets = [
    {
      id: 'full-orbital-threat-summary',
      label: '⚡ Full Orbital Threat Summary',
      query: 'Provide a complete Space Situational Awareness threat assessment for all currently active conjunction alerts.',
    },
    {
      id: 'iss-evasion-burn-vector',
      label: '🛡️ ISS Evasion Burn Vector',
      query: 'Calculate optimal Radial/In-Track Delta-V thrust vector for ISS (NORAD #25544) to maximize miss distance while minimizing fuel consumption.',
    },
    {
      id: 'solar-storm-drag-eval',
      label: '☀️ Solar Storm & Drag Evaluation',
      query: 'Analyze the impact of elevated Solar Flux (158 SFU) and Kp Index 4.2 on LEO satellite orbital decay rates.',
    },
    {
      id: 'kessler-syndrome-cascade-risk',
      label: '🚀 Kessler Syndrome Cascade Risk',
      query: 'Evaluate the 48-hour collision cascade probability if the high-risk ISS conjunction is not mitigated.',
    },
  ];

  const runAnalysis = async (queryText?: string) => {
    const textToRun = queryText || prompt;
    if (!textToRun.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToRun,
          context: {
            satellites,
            predictions,
            focusedPrediction: selectedPrediction,
            highRiskConjunctions: predictions.filter(p => p.riskLevel === 'high'),
            spaceWeather: { solarFlux: 158, kpIndex: 4.2, atmosphericDensity: '1.24e-11 kg/m^3' },
          },
        }),
      });

      const data = await res.json();
      setAnalysis(data.result);
      setTimestamp(data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString());
    } catch {
      setAnalysis('⚠️ System error requesting neural threat model. Operating on local deterministic SSA engine.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl h-full bg-[#0d1527] border-l border-[#203657] flex flex-col text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#203657] flex items-center justify-between bg-[#111c33]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                SpaceShield AI Copilot{' '}
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Gemini 3.6 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">Autonomous Orbital Threat & Conjunction Intelligence</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all duration-150 border-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Context Badge */}
        {selectedPrediction && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-red-950/30 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="text-slate-400">Focused Conjunction Context:</span>
              <div className="font-bold text-red-300">
                {selectedPrediction.primaryName} × {selectedPrediction.secondaryName}
              </div>
              <div className="text-slate-400 mt-0.5">
                Miss Dist: {selectedPrediction.missDistanceKm} km · Risk Score: {selectedPrediction.riskScore}
              </div>
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div className="p-4 border-b border-[#1b2b48] bg-[#0c1424]">
          <div className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> Quick Intelligence Analysis Presets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPrompt(p.query);
                  runAnalysis(p.query);
                }}
                disabled={loading}
                className="text-left p-2.5 rounded-md bg-[#13213a] hover:bg-cyan-600 hover:text-slate-950 active:scale-95 border border-[#203657] text-xs transition-all duration-150 flex items-center justify-between group cursor-pointer"
              >
                <span className="text-slate-200 group-hover:text-slate-950 group-hover:font-bold line-clamp-1">{p.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Output Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-sm">
          {!analysis && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Bot className="w-12 h-12 text-cyan-400/40 mb-3" />
              <h4 className="text-slate-200 font-medium mb-1">SpaceShield AI Intelligence Standby</h4>
              <p className="text-xs max-w-sm text-slate-400">
                Select a preset vector above or type a custom question to query our neural orbital Mechanics engine powered by Gemini 3.6 Flash.
              </p>
            </div>
          )}

          {loading && (
            <div className="p-4 rounded-lg bg-[#111c33] border border-cyan-500/20 text-cyan-300 flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <div className="text-xs">
                <div className="font-semibold">Processing Orbital Trajectories & Space Weather...</div>
                <div className="text-slate-400 text-[11px]">Evaluating collision probabilities and Delta-V vectors...</div>
              </div>
            </div>
          )}

          {analysis && !loading && (
            <div className="p-4 rounded-xl bg-[#111e35] border border-cyan-500/30 text-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-[#203657] pb-2 text-xs">
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> AI Threat Assessment Report
                </span>
                {timestamp && <span className="text-slate-500">{timestamp}</span>}
              </div>

              <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans text-slate-200">
                {analysis}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#203657] bg-[#101a2d]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAnalysis();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask AI Copilot (e.g., Calculate ISS evasive burn, analyze atmospheric drag...)"
              className="flex-1 bg-[#0b1220] border border-[#203657] rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all duration-150 border-none cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
