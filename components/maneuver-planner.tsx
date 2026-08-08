'use client';

import { useState } from 'react';
import { X, Sliders, Cpu, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Prediction } from '@/lib/types';

interface ManeuverPlannerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly prediction?: Prediction | null;
}

export function ManeuverPlanner({ isOpen, onClose, prediction }: Readonly<ManeuverPlannerProps>) {
  const [satelliteMass, setSatelliteMass] = useState(420000); // e.g. ISS or satellite mass in kg
  const [currentMissDist, setCurrentMissDist] = useState(prediction?.missDistanceKm ?? 1.8);
  const [targetMissDist, setTargetMissDist] = useState(10.0); // target safe distance in km
  const [burnDirection, setBurnDirection] = useState<'posigrade' | 'retrograde' | 'radial_out'>('posigrade');

  const [calcResult, setCalcResult] = useState<{
    deltaV: number;
    fuelKg: number;
    newMissDist: number;
    newRiskScore: number;
    perigeeShiftKm: number;
  } | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);

  const calculateManeuver = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const deltaRequired = Math.max(0.2, (targetMissDist - currentMissDist) * 0.45);
      const isp = 300; // Thruster Specific Impulse in seconds
      const g0 = 9.80665;
      const massRatio = Math.exp(deltaRequired / (isp * g0));
      const fuelRequiredKg = (satelliteMass * (massRatio - 1)) / 1000;

      setCalcResult({
        deltaV: Number(deltaRequired.toFixed(3)),
        fuelKg: Number(fuelRequiredKg.toFixed(2)),
        newMissDist: Number((currentMissDist + deltaRequired * 2.1).toFixed(2)),
        newRiskScore: Math.max(1, Math.round((prediction?.riskScore ?? 75) * 0.08)),
        perigeeShiftKm: Number((deltaRequired * 1.85).toFixed(2)),
      });
      setIsCalculating(false);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0d1527] border border-[#203657] rounded-xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-[#203657] bg-[#111c33] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Evasive Maneuver Planner</h3>
              <p className="text-xs text-slate-400">
                Targeting: {prediction ? `${prediction.primaryName} vs ${prediction.secondaryName}` : 'Selected Satellite'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all duration-150 border-none cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0b1322] p-4 rounded-xl border border-[#1c2e4a]">
            <div>
              <label htmlFor="sat-wet-mass-input" className="text-xs text-slate-400 block mb-1">Satellite Wet Mass (kg)</label>
              <input
                id="sat-wet-mass-input"
                type="number"
                value={satelliteMass}
                onChange={(e) => setSatelliteMass(Number(e.target.value))}
                className="w-full bg-[#111d33] border border-[#203657] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="current-miss-dist-input" className="text-xs text-slate-400 block mb-1">Current Miss Distance (km)</label>
              <input
                id="current-miss-dist-input"
                type="number"
                step="0.1"
                value={currentMissDist}
                onChange={(e) => setCurrentMissDist(Number(e.target.value))}
                className="w-full bg-[#111d33] border border-[#203657] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="target-safe-clearance-input" className="text-xs text-slate-400 block mb-1">Target Safe Clearance (km)</label>
              <input
                id="target-safe-clearance-input"
                type="number"
                step="0.5"
                value={targetMissDist}
                onChange={(e) => setTargetMissDist(Number(e.target.value))}
                className="w-full bg-[#111d33] border border-[#203657] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="burn-vector-select" className="text-xs text-slate-400 block mb-1">Burn Vector</label>
              <select
                id="burn-vector-select"
                value={burnDirection}
                onChange={(e) => setBurnDirection(e.target.value as any)}
                className="w-full bg-[#111d33] border border-[#203657] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="posigrade">Posigrade (+ΔV in velocity direction)</option>
                <option value="retrograde">Retrograde (-ΔV against velocity)</option>
                <option value="radial_out">Radial-Out (Perpendicular outward)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={calculateManeuver}
            disabled={isCalculating}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 border-none transition-all duration-150 cursor-pointer"
          >
            {isCalculating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
            Calculate Precision Thruster Impulse & Trajectory Shift
          </button>

          {/* Results */}
          {calcResult && (
            <div className="p-4 rounded-xl bg-[#0f1d36] border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-[#203657] pb-2 text-xs text-emerald-400 font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Computed Thruster Burn Solution
                </span>
                <span className="text-slate-400 font-mono">TCA - 45 mins</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-[#0b1424] rounded-lg border border-[#1c2e4a]">
                  <div className="text-[11px] text-slate-400">Required ΔV</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{calcResult.deltaV} m/s</div>
                </div>

                <div className="p-3 bg-[#0b1424] rounded-lg border border-[#1c2e4a]">
                  <div className="text-[11px] text-slate-400">Hydrazine Propellant</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">{calcResult.fuelKg} kg</div>
                </div>

                <div className="p-3 bg-[#0b1424] rounded-lg border border-[#1c2e4a]">
                  <div className="text-[11px] text-slate-400">Post-Burn Miss Dist</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{calcResult.newMissDist} km</div>
                </div>

                <div className="p-3 bg-[#0b1424] rounded-lg border border-[#1c2e4a]">
                  <div className="text-[11px] text-slate-400">Post-Burn Risk</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">LOW ({calcResult.newRiskScore})</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0b1322] border border-[#1c2e4a] text-xs text-slate-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-cyan-300">Orbital Parameter Impact:</span> Orbit apogee will increase by approx +{calcResult.perigeeShiftKm} km. Solar panel orientation should be locked in safety mode prior to thruster ignition.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
