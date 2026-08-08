'use client';

import { Activity, Sun, Layers, Radio, ShieldCheck, Flame } from 'lucide-react';

interface AltitudeItem {
  id: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

const ALTITUDE_DATA: AltitudeItem[] = [
  { id: 'leo-low', label: 'LEO Low (<500 km)', count: 14200, percent: 65, color: '#ff8491' },
  { id: 'leo-high', label: 'LEO High (500-1200 km)', count: 5400, percent: 25, color: '#ffce6b' },
  { id: 'meo', label: 'MEO (1200-35000 km)', count: 1200, percent: 6, color: '#79f2b4' },
  { id: 'geo', label: 'GEO (>35786 km)', count: 950, percent: 4, color: '#4de3ff' },
];

function DebrisDistribution({ isDay }: Readonly<{ isDay: boolean }>) {
  return (
    <div className={`p-3 sm:p-4 rounded-xl space-y-3 w-full min-w-0 overflow-hidden ${isDay ? 'bg-white border border-slate-300 shadow-sm' : 'bg-[#101a2d] border border-[#203657]'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 ${isDay ? 'border-slate-200' : 'border-[#1b2c47]'}`}>
        <h3 className={`text-xs sm:text-sm font-semibold flex items-center gap-2 min-w-0 ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
          <Layers className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="truncate">Tracked Debris Altitude Density</span>
        </h3>
        <span className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded border self-start sm:self-auto shrink-0 whitespace-nowrap ${isDay ? 'text-cyan-950 bg-cyan-100 border-cyan-500 font-extrabold' : 'text-cyan-400 bg-cyan-950/60 border-cyan-800'}`}>
          Total Tracked: 21,750
        </span>
      </div>

      <div className="space-y-2.5 pt-1 w-full min-w-0">
        {ALTITUDE_DATA.map((item) => (
          <div key={item.id} className="space-y-1 min-w-0">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-0.5 sm:gap-2 ${isDay ? 'text-slate-700' : 'text-slate-300'}`}>
              <span className="font-medium truncate min-w-0">{item.label}</span>
              <span className="font-mono text-[11px] sm:text-xs shrink-0">{item.count.toLocaleString()} objects ({item.percent}%)</span>
            </div>
            <div className={`w-full rounded-full h-2 overflow-hidden border ${isDay ? 'bg-slate-100 border-slate-300' : 'bg-[#0a111f] border-[#1b2b46]'}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpaceWeatherCard({ isDay }: Readonly<{ isDay: boolean }>) {
  const containerClass = `p-2.5 rounded-lg border min-w-0 overflow-hidden ${isDay ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1322] border-[#1b2c47]'}`;
  const labelClass = `text-[11px] flex items-center gap-1 min-w-0 ${isDay ? 'text-slate-600 font-medium' : 'text-slate-400'}`;
  const valueClass = `text-base sm:text-lg font-bold mt-1 ${isDay ? 'text-slate-900' : 'text-slate-100'}`;
  const subTextClass = `text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'}`;

  return (
    <div className={`p-3 sm:p-4 rounded-xl space-y-3 w-full min-w-0 overflow-hidden ${isDay ? 'bg-white border border-slate-300 shadow-sm' : 'bg-[#101a2d] border border-[#203657]'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 ${isDay ? 'border-slate-200' : 'border-[#1b2c47]'}`}>
        <h3 className={`text-xs sm:text-sm font-semibold flex items-center gap-2 min-w-0 ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">Space Weather & Drag Environment</span>
        </h3>
        <span className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded border self-start sm:self-auto shrink-0 whitespace-nowrap ${isDay ? 'text-amber-800 bg-amber-50 border-amber-300 font-bold' : 'text-amber-400 bg-amber-950/60 border-amber-800'}`}>
          Kp Index: 4.2 (Moderate)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-3 pt-1 w-full min-w-0">
        <div className={containerClass}>
          <div className={labelClass}>
            <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" /> <span className="truncate">Solar Flux (F10.7)</span>
          </div>
          <div className={valueClass}>158 <span className={subTextClass}>SFU</span></div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5 truncate">Elevated Drag in LEO</div>
        </div>

        <div className={containerClass}>
          <div className={labelClass}>
            <Activity className="w-3.5 h-3.5 text-cyan-600 shrink-0" /> <span className="truncate">Atmospheric Density</span>
          </div>
          <div className={valueClass}>1.24e-11 <span className={subTextClass}>kg/m³</span></div>
          <div className="text-[10px] text-cyan-600 font-medium mt-0.5 truncate">Nominal Decay Forecast</div>
        </div>

        <div className={containerClass}>
          <div className={labelClass}>
            <Radio className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> <span className="truncate">Geomagnetic Storm</span>
          </div>
          <div className={valueClass}>G1 Class</div>
          <div className={`text-[10px] mt-0.5 truncate ${subTextClass}`}>Minor GPS Fluctuation</div>
        </div>

        <div className={containerClass}>
          <div className={labelClass}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> <span className="truncate">Conjunction Risk Index</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-red-600 mt-1">8.8 / 10</div>
          <div className="text-[10px] text-red-600 font-medium mt-0.5 truncate">1 High Threat Pending</div>
        </div>
      </div>
    </div>
  );
}

interface SpaceAnalyticsProps {
  themeMode?: 'day' | 'night' | 'system';
}

export function SpaceAnalytics({ themeMode = 'night' }: Readonly<SpaceAnalyticsProps>) {
  const isDay = themeMode === 'day';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full min-w-0">
      <DebrisDistribution isDay={isDay} />
      <SpaceWeatherCard isDay={isDay} />
    </div>
  );
}
