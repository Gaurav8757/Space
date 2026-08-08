'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Search,
  AlertTriangle,
  Activity,
  Orbit as OrbitIcon,
  Sliders,
  RefreshCw,
  Radio,
  Globe,
  FileText,
  Sun,
  Moon,
} from 'lucide-react';
import type { DashboardData, Prediction, Satellite, RiskFilterType } from '@/lib/types';
import { generateMissionControlPDF } from '@/lib/report-generator';
import { AICopilot } from './ai-copilot';
import { ManeuverPlanner } from './maneuver-planner';
import { SpaceAnalytics } from './space-analytics';
import { SpaceShieldLogo } from './logo';
import { ImpactAnalysis } from './impact-analysis';
import { GlobeTrendChart } from './globe-trend-chart';

const Earth = dynamic(() => import('./earth').then((m) => m.Earth), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-cyan-400 gap-2">
      <RefreshCw className="w-6 h-6 animate-spin" />
      <span className="text-xs font-mono">Initializing 3D Orbital Projection Engine...</span>
    </div>
  ),
});

interface DashboardProps {
  readonly initialData: DashboardData;
}

const getApiStatusStyle = (apiConnected: boolean, isDay: boolean) => {
  if (!apiConnected) return 'text-red-600 font-bold';
  return isDay ? 'text-emerald-800 font-bold' : 'text-emerald-600 font-bold';
};

const getFreshnessStatusStyle = (isRefreshing: boolean, isFresh: boolean, isDay: boolean) => {
  if (isRefreshing) return 'text-amber-700 font-bold';
  if (isFresh) return isDay ? 'text-cyan-900 font-extrabold' : 'text-cyan-600 font-bold';
  return 'text-amber-700 font-bold';
};

const getFreshnessLabel = (isRefreshing: boolean, isFresh: boolean) => {
  if (isRefreshing) return 'SYNCING...';
  if (isFresh) return 'LIVE (<1m)';
  return 'STALE';
};

const getFreshnessDotStyle = (isRefreshing: boolean, isFresh: boolean) => {
  if (isRefreshing) return 'bg-amber-500 animate-spin';
  if (isFresh) return 'bg-cyan-500 shadow-[0_0_8px_#38bdf8]';
  return 'bg-amber-500 shadow-[0_0_8px_#fbbf24]';
};

const getHealthStatusStyle = (highRiskCount: number, isDay: boolean) => {
  if (highRiskCount > 0) return isDay ? 'text-amber-800 font-extrabold' : 'text-amber-600 font-bold';
  return isDay ? 'text-emerald-800 font-extrabold' : 'text-emerald-600 font-bold';
};

const getRiskFilterBtnStyle = (lvl: string, riskFilter: string, isDay: boolean) => {
  if (riskFilter === lvl) {
    return isDay ? 'bg-cyan-800 text-white shadow-md font-black' : 'bg-cyan-500 text-slate-950 shadow-md font-extrabold';
  }
  return isDay
    ? 'bg-slate-900 text-white border border-slate-950 hover:bg-cyan-700 font-bold shadow-md'
    : 'bg-[#121f37] text-slate-300 hover:bg-cyan-600 hover:text-slate-950 border border-cyan-900/40';
};

const getChipBtnStyle = (isSelected: boolean, isDay: boolean) => {
  if (isSelected) {
    return isDay ? 'bg-cyan-800 text-white font-extrabold shadow-md' : 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm';
  }
  return isDay
    ? 'bg-slate-900 text-white border border-slate-950 hover:bg-cyan-700 font-bold shadow-md'
    : 'bg-[#121f37] text-slate-300 hover:bg-cyan-600 hover:text-slate-950 border border-cyan-900/40';
};

const getPredictionCardBg = (riskLevel: string, isDay: boolean) => {
  if (riskLevel === 'high') {
    return isDay
      ? 'bg-red-50 border-red-300 hover:border-red-500 shadow-sm'
      : 'bg-red-950/20 border-red-500/40 hover:border-red-500/70';
  }
  if (riskLevel === 'medium') {
    return isDay
      ? 'bg-amber-50 border-amber-300 hover:border-amber-500 shadow-sm'
      : 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70';
  }
  return isDay
    ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-500 shadow-sm'
    : 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/70';
};

const getRiskBadgeColor = (riskLevel: string) => {
  if (riskLevel === 'high') return 'bg-red-600 text-white';
  if (riskLevel === 'medium') return 'bg-amber-600 text-white';
  return 'bg-emerald-600 text-white';
};

function DashboardHeader({
  isDay,
  apiConnected,
  isRefreshing,
  isFresh,
  highRiskCount,
}: Readonly<{
  isDay: boolean;
  apiConnected: boolean;
  isRefreshing: boolean;
  isFresh: boolean;
  highRiskCount: number;
}>) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl transition-colors shadow-lg border ${isDay ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0c1425] border-[#1d304f]'}`}>
      <div className="flex items-center gap-3">
        <SpaceShieldLogo size={44} showText={true} isDay={isDay} />
      </div>

      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 sm:border-l sm:pl-4 ${isDay ? 'sm:border-slate-300' : 'sm:border-[#1d304f]'}`}>
        <div
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-mono shadow-inner ${isDay ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium' : 'bg-[#070e1b] border-[#1b2c48]'}`}
          title="REST API v1 Telemetry Connection Status"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              apiConnected
                ? 'bg-emerald-500 shadow-[0_0_8px_#34d399] animate-pulse'
                : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
            }`}
          />
          <span className={isDay ? 'text-slate-700 text-[10px] font-bold' : 'text-slate-400 text-[10px]'}></span>
          <span className={getApiStatusStyle(apiConnected, isDay)}>
            {apiConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-mono shadow-inner ${isDay ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium' : 'bg-[#070e1b] border-[#1b2c48]'}`}
          title="Real-time orbital data age and sync state"
        >
          <span className={`w-2 h-2 rounded-full ${getFreshnessDotStyle(isRefreshing, isFresh)}`} />
          <span className={isDay ? 'text-slate-700 text-[10px] font-bold' : 'text-slate-400 text-[10px]'}>FRESHNESS:</span>
          <span className={getFreshnessStatusStyle(isRefreshing, isFresh, isDay)}>
            {getFreshnessLabel(isRefreshing, isFresh)}
          </span>
        </div>

        <div
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-mono shadow-inner ${isDay ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium' : 'bg-[#070e1b] border-[#1b2c48]'}`}
          title="Orbital threat evaluation system health"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              highRiskCount > 0
                ? 'bg-amber-500 shadow-[0_0_8px_#fbbf24]'
                : 'bg-emerald-500 shadow-[0_0_8px_#34d399]'
            }`}
          />
          <span className={isDay ? 'text-slate-700 text-[10px] font-bold' : 'text-slate-400 text-[10px]'}></span>
          <span className={getHealthStatusStyle(highRiskCount, isDay)}>
            {highRiskCount > 0 ? `${highRiskCount} ALERTS` : 'NOMINAL'}
          </span>
        </div>
      </div>
    </header>
  );
}

function OverviewKpiCards({
  isDay,
  satellitesCount,
  predictionsCount,
  highRiskCount,
  mediumRiskCount,
}: Readonly<{
  isDay: boolean;
  satellitesCount: number;
  predictionsCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
}>) {
  const cardContainerClass = isDay ? 'bg-white border-slate-300' : 'bg-[#0c1425] border-[#1d304f]';
  const labelClass = isDay ? 'text-slate-600 font-bold' : 'text-slate-400';

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors shadow-sm min-w-0 ${cardContainerClass}`}>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-mono font-medium ${labelClass}`}>Total Tracked Assets</div>
          <div className="text-2xl font-bold text-cyan-600 mt-0.5">{satellitesCount}</div>
          <div className={`text-[10px] font-mono mt-0.5 ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>LEO Payload & Constellations</div>
        </div>
        <div className={`p-3 rounded-lg border shrink-0 ${isDay ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
          <OrbitIcon className="w-6 h-6" />
        </div>
      </div>

      <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors shadow-sm min-w-0 ${cardContainerClass}`}>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-mono font-medium ${labelClass}`}>Tracked Threat Vectors</div>
          <div className="text-2xl font-bold text-cyan-600 mt-0.5">{predictionsCount}</div>
          <div className={`text-[10px] font-mono mt-0.5 ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>Conjunction Coordinates</div>
        </div>
        <div className={`p-3 rounded-lg border shrink-0 ${isDay ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
          <Activity className="w-6 h-6" />
        </div>
      </div>

      <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors shadow-sm min-w-0 ${cardContainerClass}`}>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-mono font-medium ${labelClass}`}>Critical High Risk</div>
          <div className="text-2xl font-bold text-red-600 mt-0.5">{highRiskCount}</div>
          <div className="text-[10px] text-red-500 font-mono font-bold mt-0.5">Immediate Evasion Required</div>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors shadow-sm min-w-0 ${cardContainerClass}`}>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-mono font-medium ${labelClass}`}>Medium Warning</div>
          <div className="text-2xl font-bold text-amber-600 mt-0.5">{mediumRiskCount}</div>
          <div className="text-[10px] text-amber-600 font-mono mt-0.5">Cautionary Monitoring</div>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
          <Radio className="w-6 h-6" />
        </div>
      </div>
    </section>
  );
}

function PredictionCard({
  item,
  isDay,
  onAiDiagnose,
  onPlanManeuver,
}: Readonly<{
  item: Prediction;
  isDay: boolean;
  onAiDiagnose: (item: Prediction) => void;
  onPlanManeuver: (item: Prediction) => void;
}>) {
  const cardBg = getPredictionCardBg(item.riskLevel, isDay);
  const badgeColor = getRiskBadgeColor(item.riskLevel);
  const formattedTime = item.closestApproach ? `${new Date(item.closestApproach).toISOString().slice(11, 16)} UTC` : 'TCA Pending';

  return (
    <div className={`w-full min-w-0 p-4 rounded-lg border transition-all space-y-3 flex flex-col justify-between md:last:odd:col-span-2 lg:last:odd:col-span-1 ${cardBg}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${badgeColor}`}>
          {item.riskLevel} RISK · Score: {(item.riskScore * 100).toFixed(0)}%
        </span>
        <span className={`text-[11px] font-mono font-semibold ${isDay ? 'text-slate-700' : 'text-slate-400'}`}>
          {formattedTime}
        </span>
      </div>

      <div className={`font-bold text-xs flex flex-col justify-between gap-1 p-2 rounded border min-w-0 ${isDay ? 'bg-[#f8fafc] border-slate-300 text-slate-900 shadow-inner' : 'bg-[#070e1b] border-[#172844] text-slate-100'}`}>
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span className="text-[10px] text-slate-400 font-mono">Primary Target:</span>
          <span className={`font-mono truncate ${isDay ? 'text-cyan-950 font-extrabold' : 'text-cyan-400'}`}>{item.primaryName}</span>
        </div>
        <div className="flex items-center justify-between gap-1 min-w-0 border-t border-slate-700/20 pt-1">
          <span className="text-[10px] text-rose-400 font-mono">Secondary Object:</span>
          <span className={`font-mono truncate ${isDay ? 'text-slate-900 font-bold' : 'text-slate-200'}`}>{item.secondaryName}</span>
        </div>
      </div>

      <div className={`flex flex-col lg:flex-row sm:items-center justify-between gap-2 text-xs pt-2 border-t ${isDay ? 'text-slate-700 border-slate-200' : 'text-slate-400 border-[#1b2a44]'}`}>
        <span className="whitespace-nowrap font-medium">Miss Distance: <strong className={`font-mono ${isDay ? 'text-slate-900 font-extrabold' : 'text-slate-100'}`}>{item.missDistanceKm} km</strong></span>
        <div className="flex flex-col sm:flex-row items-center gap-1.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => onAiDiagnose(item)}
            className={`w-full lg:w-auto text-nowrap flex-1 px-3 py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all duration-150 active:scale-95 cursor-pointer ${
              isDay
                ? 'bg-cyan-800 hover:bg-cyan-700 text-white border border-cyan-950 shadow-sm'
                : 'bg-cyan-950 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-700'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-300" /> AI Diagnose
          </button>

          <button
            type="button"
            onClick={() => onPlanManeuver(item)}
            className={`w-full lg:w-auto flex-1 px-3 py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-all duration-150 active:scale-95 cursor-pointer ${
              isDay
                ? 'bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-950 shadow-sm'
                : 'bg-emerald-950 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-700'
            }`}
          >
            <Sliders className="w-3 h-3 text-emerald-300" /> Maneuver
          </button>
        </div>
      </div>
    </div>
  );
}

function SatelliteInventoryTable({
  filteredSatellites,
  isDay,
  onSelectSat,
}: Readonly<{
  filteredSatellites: Satellite[];
  isDay: boolean;
  onSelectSat: (sat: Satellite) => void;
}>) {
  return (
    <section className={`p-4 rounded-xl border space-y-4 ${isDay ? 'bg-white border-slate-300 shadow-sm text-slate-900' : 'bg-[#0c1425] border-[#1d304f] text-slate-100'}`}>
      <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
        <h2 className={`text-[10px] sm:text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
          <OrbitIcon className="w-4 h-4 text-cyan-500" /> Active Catalog Assets ({filteredSatellites.length})
        </h2>
        <span className={`text-xs font-mono ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>CelesTrak Catalog Synchronized</span>
      </div>

      <div className={`overflow-x-auto rounded-lg border ${isDay ? 'border-slate-300' : 'border-[#1b2c47]'}`}>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b uppercase font-mono text-[11px] ${isDay ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-[#0e1a30] border-[#1b2c47] text-slate-300'}`}>
              <th className="px-4 py-3 font-semibold tracking-wider align-middle">Satellite Designation</th>
              <th className="px-4 py-3 font-semibold tracking-wider align-middle">NORAD ID</th>
              <th className="px-4 py-3 font-semibold tracking-wider align-middle">Mean Altitude</th>
              <th className="px-4 py-3 font-semibold tracking-wider align-middle">Orbital Inclination</th>
              <th className="px-4 py-3 font-semibold tracking-wider align-middle">Status</th>
              <th className="px-4 py-3 font-semibold tracking-wider align-middle text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDay ? 'divide-slate-200 text-slate-800' : 'divide-[#14243f] text-slate-300'}`}>
            {filteredSatellites.map((sat) => (
              <tr key={sat.id} className={`transition-colors ${isDay ? 'hover:bg-slate-50' : 'hover:bg-[#11203b]'}`}>
                <td className="px-4 py-3 align-middle">
                  <div className={`flex items-center gap-2.5 font-bold ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                    <span>{sat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle font-mono text-cyan-600 font-bold">#{sat.noradId}</td>
                <td className="px-4 py-3 align-middle font-mono text-emerald-600 font-bold">{sat.altitudeKm} km</td>
                <td className={`px-4 py-3 align-middle font-mono ${isDay ? 'text-slate-700' : 'text-slate-300'}`}>51.6°</td>
                <td className="px-4 py-3 align-middle">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wide">
                    {sat.status}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <button
                    type="button"
                    onClick={() => onSelectSat(sat)}
                    className={`px-3 py-1.5 rounded text-[10px] font-semibold text-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${
                      isDay
                        ? 'bg-cyan-700 hover:bg-cyan-800 text-white shadow-md border border-cyan-800'
                        : 'bg-[#162744] hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-600 font-extrabold'
                    }`}
                  >
                    Focus Target
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function FilterSearchBar({
  searchTerm,
  setSearchTerm,
  riskFilter,
  setRiskFilter,
  isDay,
}: Readonly<{
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  riskFilter: RiskFilterType;
  setRiskFilter: (filter: RiskFilterType) => void;
  isDay: boolean;
}>) {
  return (
    <section className={`p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${isDay ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#0c1425] border-[#1d304f]'}`}>
      <div className="relative w-full sm:w-80">
        <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDay ? 'text-slate-500' : 'text-slate-400'}`} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search satellite, debris or NORAD ID..."
          className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none ${
            isDay
              ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-cyan-600'
              : 'bg-[#070e1a] border border-[#1e3252] text-white placeholder:text-slate-500 focus:border-cyan-400'
          }`}
        />
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        <span className={`text-xs whitespace-nowrap ${isDay ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>Filter Risk:</span>
        {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setRiskFilter(lvl)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${getRiskFilterBtnStyle(lvl, riskFilter, isDay)}`}
          >
            {lvl}
          </button>
        ))}
      </div>
    </section>
  );
}

function Live3DOrbitalSection({
  selectedSat,
  setSelectedSat,
  satellites,
  predictions,
  themeMode,
  setThemeMode,
  isDay,
}: Readonly<{
  selectedSat: Satellite;
  setSelectedSat: (sat: Satellite) => void;
  satellites: Satellite[];
  predictions: Prediction[];
  themeMode: 'day' | 'night';
  setThemeMode: (mode: 'day' | 'night') => void;
  isDay: boolean;
}>) {
  return (
    <section className="w-full">
      <div className={`p-4 rounded-xl border space-y-4 ${isDay ? 'bg-white border-slate-300 shadow-sm text-slate-900' : 'bg-[#0c1425] border-[#1d304f] text-slate-100'}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${isDay ? 'border-slate-200' : 'border-[#1b2b46]'}`}>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-600" />
            <h2 className={`text-[10px] md:text-sm font-semibold uppercase tracking-wider ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
              Live 3D Orbital Projection
            </h2>
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border self-start sm:self-auto ${isDay ? 'text-cyan-950 bg-cyan-100 border-cyan-500 font-extrabold' : 'text-cyan-400 bg-cyan-950/70 border-cyan-800'}`}>
            Active View: {selectedSat.name}
          </span>
        </div>

        <div className="w-full h-[360px] sm:h-[520px] relative rounded-lg overflow-hidden bg-[#040914] border border-[#13213a]">
          <Earth
            satellites={satellites}
            selectedSat={selectedSat}
            onSelectSat={(sat) => setSelectedSat(sat)}
            dayNightMode={themeMode}
            onToggleDayNightMode={() => setThemeMode(themeMode === 'day' ? 'night' : 'day')}
          />
        </div>

        <div className={`p-3 rounded-lg border grid grid-cols-2 sm:grid-cols-4 gap-3 ${isDay ? 'bg-slate-50 border-slate-300 shadow-inner' : 'bg-[#070e1b] border-[#1b2b46]'}`}>
          <div>
            <span className={`text-[10px] block ${isDay ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>Selected Satellite</span>
            <span className={`font-extrabold text-xs line-clamp-1 ${isDay ? 'text-cyan-900' : 'text-cyan-400'}`}>{selectedSat.name}</span>
          </div>
          <div>
            <span className={`text-[10px] block ${isDay ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>NORAD Catalog ID</span>
            <span className={`font-mono text-xs font-bold ${isDay ? 'text-slate-900' : 'text-slate-200'}`}>#{selectedSat.noradId}</span>
          </div>
          <div>
            <span className={`text-[10px] block ${isDay ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>Mean Altitude</span>
            <span className={`font-mono text-xs font-bold ${isDay ? 'text-emerald-800' : 'text-emerald-500'}`}>{selectedSat.altitudeKm} km</span>
          </div>
          <div>
            <span className={`text-[10px] block ${isDay ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>Calculated Speed</span>
            <span className={`font-mono text-xs font-bold ${isDay ? 'text-slate-900' : 'text-slate-200'}`}>7.66 km/s</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className={`text-[11px] whitespace-nowrap ${isDay ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>Focus Satellite:</span>
          {satellites.map((sat) => (
            <button
              key={sat.id}
              type="button"
              onClick={() => setSelectedSat(sat)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer ${getChipBtnStyle(selectedSat.id === sat.id, isDay)}`}
            >
              {sat.name}
            </button>
          ))}
        </div>

        <GlobeTrendChart selectedSat={selectedSat} predictions={predictions} themeMode={themeMode} />
      </div>
    </section>
  );
}

function ConjunctionThreatAlertsSection({
  filteredPredictions,
  isDay,
  dashboardData,
  selectedSat,
  onAiDiagnosis,
  onPlanManeuver,
}: Readonly<{
  filteredPredictions: Prediction[];
  isDay: boolean;
  dashboardData: DashboardData;
  selectedSat: Satellite;
  onAiDiagnosis: (p: Prediction) => void;
  onPlanManeuver: (p: Prediction) => void;
}>) {
  return (
    <section className="w-full">
      <div className={`p-4 rounded-xl border space-y-4 ${isDay ? 'bg-white border-slate-300 shadow-sm text-slate-900' : 'bg-[#0c1425] border-[#1d304f] text-slate-100'}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${isDay ? 'border-slate-200' : 'border-[#1b2b46]'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className={`text-[10px] sm:text-sm font-semibold uppercase tracking-wider ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
              Conjunction Threat Alerts
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateMissionControlPDF(dashboardData, selectedSat)}
              title="Export PDF Mission Control Log"
              className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDay
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-400 font-semibold'
                  : 'bg-[#14233c] hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 border-[#233a60]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Export PDF Log
            </button>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${isDay ? 'bg-slate-100 text-slate-900 border-slate-400 font-bold' : 'text-slate-400 bg-[#070e1a] border-[#1e3252]'}`}>
              {filteredPredictions.length} Active Alerts
            </span>
          </div>
        </div>

        <div>
          {filteredPredictions.length === 0 ? (
            <div className={`p-8 text-center text-xs rounded-lg border ${isDay ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-[#070e1b] text-slate-400 border-[#1b2b46]'}`}>
              No conjunction threat vectors matching current search & filter parameters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {filteredPredictions.map((item) => (
                <PredictionCard
                  key={item.id}
                  item={item}
                  isDay={isDay}
                  onAiDiagnose={onAiDiagnosis}
                  onPlanManeuver={onPlanManeuver}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardFooter({ isDay }: Readonly<{ isDay: boolean }>) {
  return (
    <footer
      className={`p-6 rounded-2xl border transition-all duration-300 shadow-xl ${
        isDay
          ? 'bg-gradient-to-r from-slate-50 via-white to-cyan-50/50 border-slate-300/80 text-slate-800'
          : 'bg-gradient-to-r from-[#060d19] via-[#0b172a] to-[#081223] border-[#1d3356] text-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          <SpaceShieldLogo size={36} showText={true} isDay={isDay} />
          <div className={`hidden lg:block h-8 w-px ${isDay ? 'bg-slate-300' : 'bg-cyan-900/50'}`} />
          <p className={`hidden lg:block text-xs font-medium max-w-xs leading-tight ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
            Autonomous Space Situational Awareness & Satellite Collision Avoidance Platform
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right">
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-center gap-2 text-xs font-semibold tracking-wide">
            <span className={isDay ? 'text-slate-700' : 'text-slate-300'}>© All Rights Reserved by</span>
            <span className="text-cyan-500 font-black uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              Sayam Kumar
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-[11px] font-mono">
            <span className={`px-2 py-0.5 rounded font-bold ${isDay ? 'bg-slate-200 text-slate-900' : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'}`}>
              Class IX B
            </span>
            <span className={`px-2 py-0.5 rounded font-bold ${isDay ? 'bg-slate-200 text-slate-900' : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'}`}>
              Roll No. 06
            </span>
            <span className={`px-2.5 py-0.5 rounded font-semibold ${isDay ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950/40 text-amber-300 border border-amber-800/50'}`}>
              Saraswati Shishu Vidya Mandir, Baghmara
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Dashboard({ initialData }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [apiConnected, setApiConnected] = useState<boolean>(true);
  const [now, setNow] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [themeMode, setThemeMode] = useState<'day' | 'night'>('night');
  const isDay = themeMode === 'day';

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);
  const [riskFilter, setRiskFilter] = useState<RiskFilterType>('all');
  const [selectedSat, setSelectedSat] = useState<Satellite>(initialData.satellites[0]);

  // Modal states
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  const [activePredictionForAction, setActivePredictionForAction] = useState<Prediction | null>(null);

  // Polling function for live backend trajectory & collision data
  const fetchLiveData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const [satRes, predRes] = await Promise.all([
        fetch(`${origin}/api/v1/satellites`, { cache: 'no-store', headers: { 'Accept': 'application/json' } }),
        fetch(`${origin}/api/v1/predictions`, { cache: 'no-store', headers: { 'Accept': 'application/json' } }),
      ]);

      if (satRes.ok && predRes.ok) {
        const rawSats = await satRes.json();
        const rawPreds = await predRes.json();

        if (Array.isArray(rawSats) && Array.isArray(rawPreds)) {
          const updatedSatellites: Satellite[] = rawSats.map((s: any) => ({
            id: String(s.id),
            name: s.name,
            noradId: Number(s.norad_id ?? s.noradId),
            altitudeKm: Number(s.altitude_km ?? s.altitudeKm),
            status: s.status,
          }));

          const updatedPredictions: Prediction[] = rawPreds.map((p: any) => ({
            id: String(p.id),
            primaryName: p.primary_name ?? p.primaryName,
            secondaryName: p.secondary_name ?? p.secondaryName,
            closestApproach: p.closest_approach ?? p.closestApproach,
            missDistanceKm: Number(p.miss_distance_km ?? p.missDistanceKm),
            riskScore: Number(p.risk_score ?? p.riskScore),
            riskLevel: p.risk_level ?? p.riskLevel,
          }));

          setDashboardData((prev) => {
            const satsChanged = JSON.stringify(prev.satellites) !== JSON.stringify(updatedSatellites);
            const predsChanged = JSON.stringify(prev.predictions) !== JSON.stringify(updatedPredictions);

            if (!satsChanged && !predsChanged) {
              return prev; // Prevent unnecessary state updates & re-renders
            }

            return {
              satellites: updatedSatellites,
              predictions: updatedPredictions,
            };
          });

          // Sync active selected satellite reference smoothly
          setSelectedSat((prevSat) => {
            if (!prevSat) return updatedSatellites[0];
            const match = updatedSatellites.find((s) => s.id === prevSat.id);
            return match || updatedSatellites[0];
          });

          setLastSynced(new Date());
          setApiConnected(true);
        }
      } else {
        setApiConnected(false);
      }
    } catch {
      // Fallback gracefully without breaking UI interactivity
      setApiConnected(false);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  const isFresh = isMounted && now.getTime() - lastSynced.getTime() < 60000;

  // Initial data load on mount; polling disabled per user preference (manual sync button)
  useEffect(() => {
    fetchLiveData(false);
  }, [fetchLiveData]);

  // Filter predictions
  const filteredPredictions = dashboardData.predictions.filter((item) => {
    const matchesSearch =
      item.primaryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.secondaryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || item.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  // Filter satellites
  const filteredSatellites = dashboardData.satellites.filter((sat) =>
    sat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sat.noradId.toString().includes(searchTerm)
  );

  const highRiskCount = dashboardData.predictions.filter((p) => p.riskLevel === 'high').length;
  const mediumRiskCount = dashboardData.predictions.filter((p) => p.riskLevel === 'medium').length;

  const handleAiDiagnosis = (pred: Prediction) => {
    setActivePredictionForAction(pred);
    setIsCopilotOpen(true);
  };

  const handlePlanManeuver = (pred: Prediction) => {
    setActivePredictionForAction(pred);
    setIsPlannerOpen(true);
  };

  return (
    <main className={`min-h-screen p-3 sm:p-6 space-y-6 font-sans transition-colors duration-300 w-full max-w-full overflow-x-hidden ${isDay ? 'bg-[#f0f4f9] text-slate-900' : 'bg-[#070d18] text-slate-100'}`}>
      <DashboardHeader
        isDay={isDay}
        apiConnected={apiConnected}
        isRefreshing={isRefreshing}
        isFresh={isFresh}
        highRiskCount={highRiskCount}
      />

      {/* Mission Control Actions Toolbar Section */}
      <section className={`p-4 rounded-xl border shadow-md transition-colors ${isDay ? 'bg-white border-slate-300' : 'bg-[#0c1425] border-[#1d304f]'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 mb-3 pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-500" />
            <h2 className={`text-[10px] md:text-sm font-semibold uppercase tracking-wider ${isDay ? 'text-slate-900' : 'text-white'}`}>
              Mission Control Operations & Actions
            </h2>
          </div>
          <span className={`text-[10px] font-mono ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
            Global Control Toolbar
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-4 w-full">
          {/* Day / Night Theme Toggle */}
          <button
            type="button"
            onClick={() => setThemeMode(themeMode === 'day' ? 'night' : 'day')}
            title={isDay ? "Switch to Night Mode (Dark Orbit View)" : "Switch to Day Mode (Light View)"}
            className={`w-full sm:flex-1 py-2 px-2.5 rounded-lg text-[11px] font-bold font-mono transition-all duration-150 active:scale-95 flex items-center justify-center text-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap ${
              isDay
                ? 'bg-amber-500 text-slate-950 border border-amber-600 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
            }`}
          >
            {isDay ? (
              <>
                <Sun className="w-3.5 h-3.5 text-slate-950 animate-spin-slow shrink-0" />
                <span>DAY MODE</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>NIGHT MODE</span>
              </>
            )}
          </button>

          {/* Sync Live Data */}
          <button
            type="button"
            onClick={() => fetchLiveData(true)}
            disabled={isRefreshing}
            title="Sync Live Telemetry & Orbital Predictions with API"
            className={`w-full sm:flex-1 py-2 px-2.5 rounded-lg text-[11px] flex items-center justify-center text-center gap-1.5 font-mono transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap ${
              isDay
                ? 'bg-slate-900 hover:bg-cyan-700 text-white border border-slate-950 font-bold shadow-md'
                : 'bg-[#14233c] hover:bg-cyan-600 hover:text-slate-950 hover:border-cyan-400 text-cyan-300 border border-cyan-800/60 font-bold'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span suppressHydrationWarning>{isMounted ? lastSynced.toLocaleTimeString() : 'SYNCING'}</span>
          </button>

          {/* AI Threat Analyst */}
          <button
            type="button"
            onClick={() => {
              setActivePredictionForAction(null);
              setIsCopilotOpen(true);
            }}
            title="Open AI Threat Analyst Copilot for Risk Assessment"
            className="w-full sm:flex-1 py-2 px-2.5 rounded-lg bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 active:scale-95 text-white font-bold text-[11px] flex items-center justify-center text-center gap-1.5 shadow-md transition-all duration-150 border-none cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200 shrink-0" /> AI Analyst
          </button>

          {/* Maneuver Planner */}
          <button
            type="button"
            onClick={() => {
              setActivePredictionForAction(null);
              setIsPlannerOpen(true);
            }}
            title="Open Orbital Maneuver Strategy Planner"
            className={`w-full sm:flex-1 py-2 px-2.5 rounded-lg text-[11px] flex items-center justify-center text-center gap-1.5 font-bold transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap ${
              isDay
                ? 'bg-slate-900 hover:bg-emerald-700 text-white border border-slate-950 shadow-md'
                : 'bg-[#14233c] hover:bg-emerald-600 hover:text-white hover:border-emerald-500 text-slate-200 border border-[#233a60]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-white" /> Planner
          </button>

          {/* Export Report PDF */}
          <button
            type="button"
            onClick={() => generateMissionControlPDF(dashboardData, selectedSat)}
            title="Download PDF Mission Control Log for high-risk orbital conjunctions"
            className="col-span-2 md:col-span-1 w-full py-2 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-[11px] flex items-center justify-center text-center gap-1.5 font-mono transition-all duration-150 cursor-pointer shadow-md font-bold whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-white shrink-0" /> Export PDF
          </button>
        </div>
      </section>

      <OverviewKpiCards
        isDay={isDay}
        satellitesCount={dashboardData.satellites.length}
        predictionsCount={dashboardData.predictions.length}
        highRiskCount={highRiskCount}
        mediumRiskCount={mediumRiskCount}
      />

      <FilterSearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
        isDay={isDay}
      />

      <Live3DOrbitalSection
        selectedSat={selectedSat}
        setSelectedSat={setSelectedSat}
        satellites={dashboardData.satellites}
        predictions={dashboardData.predictions}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        isDay={isDay}
      />

      <ConjunctionThreatAlertsSection
        filteredPredictions={filteredPredictions}
        isDay={isDay}
        dashboardData={dashboardData}
        selectedSat={selectedSat}
        onAiDiagnosis={handleAiDiagnosis}
        onPlanManeuver={handlePlanManeuver}
      />

      {/* D3 Impact & Conjunction Trend Analysis Section */}
      <section>
        <ImpactAnalysis
          predictions={dashboardData.predictions}
          selectedPrediction={activePredictionForAction}
          onSelectPrediction={(pred) => setActivePredictionForAction(pred)}
          onOpenCopilot={(pred) => handleAiDiagnosis(pred)}
          onOpenManeuverPlanner={(pred) => handlePlanManeuver(pred)}
          themeMode={themeMode}
        />
      </section>

      {/* Analytics Section */}
      <section className={`p-4 rounded-xl border space-y-4 ${isDay ? 'bg-white border-slate-300 shadow-sm text-slate-900' : 'bg-[#0c1425] border-[#1d304f] text-slate-100'}`}>
        <h2 className={`text-[10px] sm:text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
          <Activity className="w-4 h-4 text-cyan-500" /> Orbital Telemetry & Space Weather Diagnostics
        </h2>
        <SpaceAnalytics themeMode={themeMode} />
      </section>

      <SatelliteInventoryTable
        filteredSatellites={filteredSatellites}
        isDay={isDay}
        onSelectSat={(sat) => setSelectedSat(sat)}
      />

      <DashboardFooter isDay={isDay} />

      {/* Modals & Drawers */}
      <AICopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        selectedPrediction={activePredictionForAction}
        satellites={dashboardData.satellites}
        predictions={dashboardData.predictions}
      />

      <ManeuverPlanner
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        prediction={activePredictionForAction}
      />
    </main>
  );
}
