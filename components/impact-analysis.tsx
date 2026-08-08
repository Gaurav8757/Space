'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Prediction } from '@/lib/types';
import { ShieldAlert, Activity, Crosshair, Gauge, Info } from 'lucide-react';

interface ImpactAnalysisProps {
  predictions: Prediction[];
  selectedPrediction?: Prediction | null;
  onSelectPrediction?: (pred: Prediction) => void;
  onOpenCopilot?: (pred: Prediction) => void;
  onOpenManeuverPlanner?: (pred: Prediction) => void;
  themeMode?: 'day' | 'night';
}

interface DataPoint {
  hour: number; // Hours before TCA (e.g., -48 to 0)
  timeLabel: string;
  probability: number; // 0 to 1 scale (or percentage)
  missDistanceKm: number; // Miss distance in km
  relVelocity: number; // km/s
  covarianceAreaKm2: number; // km^2
}

// Pure Helper Functions & Custom Hooks extracted to reduce Cognitive Complexity (sonarjs/cognitive-complexity)
function generateTimeSeriesData(activeItem: Prediction | null): DataPoint[] {
  if (!activeItem) return [];

  const baseRisk = activeItem.riskScore;
  const baseDistance = activeItem.missDistanceKm;
  const points: DataPoint[] = [];

  for (let h = -48; h <= 0; h += 2) {
    const progress = (h + 48) / 48;
    const expFactor = Math.pow(progress, 2.5);
    const prob = Math.min(0.98, Math.max(0.001, (baseRisk / 100) * (0.05 + expFactor * 0.95)));
    const dist = Math.max(0.05, baseDistance * (2.2 - progress * 1.2) + Math.sin(h * 0.4) * 0.08);
    const vel = 14.2 + (1 - progress) * 0.8 + Math.cos(h) * 0.1;
    const cov = Math.max(1.2, 85 * (1 - progress * 0.85));

    points.push({
      hour: h,
      timeLabel: h === 0 ? 'TCA (0h)' : `T${h}h`,
      probability: Number(prob.toFixed(4)),
      missDistanceKm: Number(dist.toFixed(3)),
      relVelocity: Number(vel.toFixed(2)),
      covarianceAreaKm2: Number(cov.toFixed(1)),
    });
  }

  return points;
}

function getButtonClass(item: Prediction, activeItemId: string, isDay: boolean): string {
  const isSelected = item.id === activeItemId;
  if (isSelected) {
    if (item.riskLevel === 'high') {
      return isDay
        ? 'bg-red-800 text-white border border-red-950 font-extrabold shadow-md'
        : 'bg-red-500/20 text-red-400 border border-red-500/60 shadow-md';
    }
    return isDay
      ? 'bg-amber-800 text-white border border-amber-950 font-extrabold shadow-md'
      : 'bg-amber-500/20 text-amber-300 border border-amber-500/60';
  }
  return isDay
    ? 'bg-slate-900 text-white border border-slate-950 hover:bg-cyan-700 font-bold shadow-md'
    : 'bg-[#14233c] text-slate-300 hover:bg-[#1c3052] border border-cyan-900/40';
}

function useD3ImpactChart({
  svgRef,
  containerRef,
  timeSeriesData,
  activeItem,
  containerWidth,
  isDay,
  setHoveredPoint,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  timeSeriesData: DataPoint[];
  activeItem: Prediction;
  containerWidth: number;
  isDay: boolean;
  setHoveredPoint: (pt: DataPoint | null) => void;
}) {
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || timeSeriesData.length === 0) return;

    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    const width = containerWidth || containerRef.current.clientWidth || 600;
    const height = 260;
    const margin = { top: 25, right: 55, bottom: 35, left: 55 };
    const innerWidth = Math.max(50, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = svgElement
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(timeSeriesData, (d) => d.hour) as [number, number])
      .range([0, innerWidth]);

    const yScaleProb = d3
      .scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    const maxDist = d3.max(timeSeriesData, (d) => d.missDistanceKm) || 10;
    const yScaleDist = d3
      .scaleLinear()
      .domain([0, maxDist * 1.15])
      .range([innerHeight, 0]);

    const defs = svg.append('defs');

    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'prob-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', activeItem.riskLevel === 'high' ? '#f43f5e' : '#f59e0b')
      .attr('stop-opacity', isDay ? 0.3 : 0.45);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', isDay ? '#f8fafc' : '#020617')
      .attr('stop-opacity', 0.0);

    const yGrid = d3.axisLeft(yScaleProb).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
    svg
      .append('g')
      .attr('class', 'grid')
      .style('stroke', isDay ? '#e2e8f0' : '#1e293b')
      .style('stroke-dasharray', '3,3')
      .style('stroke-opacity', 0.6)
      .call(yGrid);

    const tickCount = Math.max(4, Math.floor(innerWidth / 70));
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(tickCount)
      .tickFormat((d) => (d === 0 ? 'TCA' : `T${d}h`));

    svg
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', isDay ? '#475569' : '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    const yAxisLeft = d3
      .axisLeft(yScaleProb)
      .ticks(5)
      .tickFormat((d) => `${(Number(d) * 100).toFixed(0)}%`);

    svg
      .append('g')
      .call(yAxisLeft)
      .attr('color', activeItem.riskLevel === 'high' ? '#f43f5e' : '#f59e0b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    const yAxisRight = d3
      .axisRight(yScaleDist)
      .ticks(5)
      .tickFormat((d) => `${d} km`);

    svg
      .append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(yAxisRight)
      .attr('color', isDay ? '#0284c7' : '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    svg
      .append('line')
      .attr('x1', 0)
      .attr('y1', yScaleProb(0.75))
      .attr('x2', innerWidth)
      .attr('y2', yScaleProb(0.75))
      .attr('stroke', '#ef4444')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.85);

    svg
      .append('text')
      .attr('x', 6)
      .attr('y', yScaleProb(0.75) - 4)
      .attr('fill', '#ef4444')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('CRITICAL EMERGENCY THRESHOLD (75%)');

    const areaGenerator = d3
      .area<DataPoint>()
      .x((d) => xScale(d.hour))
      .y0(innerHeight)
      .y1((d) => yScaleProb(d.probability))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(timeSeriesData)
      .attr('fill', 'url(#prob-gradient)')
      .attr('d', areaGenerator);

    const probLineGenerator = d3
      .line<DataPoint>()
      .x((d) => xScale(d.hour))
      .y((d) => yScaleProb(d.probability))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(timeSeriesData)
      .attr('fill', 'none')
      .attr('stroke', activeItem.riskLevel === 'high' ? '#f43f5e' : '#f59e0b')
      .attr('stroke-width', 2.5)
      .attr('d', probLineGenerator);

    const distLineGenerator = d3
      .line<DataPoint>()
      .x((d) => xScale(d.hour))
      .y((d) => yScaleDist(d.missDistanceKm))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(timeSeriesData)
      .attr('fill', 'none')
      .attr('stroke', isDay ? '#0284c7' : '#38bdf8')
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '4,2')
      .attr('d', distLineGenerator);

    const focusLine = svg
      .append('line')
      .attr('stroke', isDay ? '#64748b' : '#94a3b8')
      .attr('stroke-dasharray', '2,2')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    const focusProbDot = svg
      .append('circle')
      .attr('r', 5)
      .attr('fill', activeItem.riskLevel === 'high' ? '#f43f5e' : '#f59e0b')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    const focusDistDot = svg
      .append('circle')
      .attr('r', 4)
      .attr('fill', isDay ? '#0284c7' : '#38bdf8')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    const bisect = d3.bisector<DataPoint, number>((d) => d.hour).center;

    svg
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('pointermove', (event) => {
        const [mx] = d3.pointer(event);
        const hourVal = xScale.invert(mx);
        const index = bisect(timeSeriesData, hourVal);
        const d = timeSeriesData[index];

        if (d) {
          const xPos = xScale(d.hour);
          const yProbPos = yScaleProb(d.probability);
          const yDistPos = yScaleDist(d.missDistanceKm);

          focusLine.attr('x1', xPos).attr('x2', xPos).style('opacity', 1);
          focusProbDot.attr('cx', xPos).attr('cy', yProbPos).style('opacity', 1);
          focusDistDot.attr('cx', xPos).attr('cy', yDistPos).style('opacity', 1);

          setHoveredPoint(d);
        }
      })
      .on('pointerleave', () => {
        focusLine.style('opacity', 0);
        focusProbDot.style('opacity', 0);
        focusDistDot.style('opacity', 0);
        setHoveredPoint(null);
      });
  }, [timeSeriesData, activeItem, containerWidth, isDay, svgRef, containerRef, setHoveredPoint]);
}

function filterHighRiskItems(predictions: Prediction[]): Prediction[] {
  const high = predictions.filter((p) => p.riskLevel === 'high' || p.riskLevel === 'medium');
  return high.length > 0 ? high : predictions;
}

function HoverTooltipBar({
  hoveredPoint,
  isDay,
}: Readonly<{
  hoveredPoint: DataPoint | null;
  isDay: boolean;
}>) {
  return (
    <div className={`min-h-9 p-2.5 sm:px-3 rounded-lg flex flex-wrap items-center justify-between gap-1.5 text-xs font-mono ${isDay ? 'bg-slate-100 border border-slate-300 text-slate-800' : 'bg-[#0c182d] border border-cyan-800/40 text-slate-300'}`}>
      {hoveredPoint ? (
        <>
          <span className="text-cyan-600 font-bold">{hoveredPoint.timeLabel}</span>
          <span>PROB: <b className="text-rose-500">{(hoveredPoint.probability * 100).toFixed(2)}%</b></span>
          <span>MISS: <b className="text-cyan-600">{hoveredPoint.missDistanceKm} km</b></span>
          <span>REL VEL: <b className="text-emerald-600">{hoveredPoint.relVelocity} km/s</b></span>
          <span className="hidden sm:inline">COV AREA: <b className="text-amber-600">{hoveredPoint.covarianceAreaKm2} km²</b></span>
        </>
      ) : (
        <span className={`italic text-[11px] flex items-center gap-1.5 ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
          <Info className="w-3.5 h-3.5 text-cyan-500" />
          Move cursor over chart timeline to view real-time covariance and velocity telemetry.
        </span>
      )}
    </div>
  );
}

const getSpecsCardClass = (isDay: boolean) => (isDay ? 'bg-slate-50 border-slate-200' : 'bg-[#0e1b30] border-[#1b3154]');
const getLabelClass = (isDay: boolean) => (isDay ? 'text-slate-500' : 'text-slate-400');
const getRiskBadgeClass = (riskLevel: string) =>
  riskLevel === 'high' ? 'bg-red-500/20 text-red-500 border-red-500/40' : 'bg-amber-500/20 text-amber-600 border-amber-500/40';

function SpecsGrid({ activeItem, isDay }: Readonly<{ activeItem: Prediction; isDay: boolean }>) {
  const cardClass = getSpecsCardClass(isDay);
  const labelClass = getLabelClass(isDay);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono w-full">
      <div className={`p-3 rounded-lg border flex flex-col justify-between space-y-1 w-full h-full ${cardClass}`}>
        <span className={`text-[11px] ${labelClass}`}>Primary Object</span>
        <span className="text-cyan-600 font-bold text-sm truncate" title={activeItem.primaryName}>{activeItem.primaryName}</span>
      </div>
      <div className={`p-3 rounded-lg border flex flex-col justify-between space-y-1 w-full h-full ${cardClass}`}>
        <span className={`text-[11px] ${labelClass}`}>Secondary Threat</span>
        <span className="text-rose-600 font-bold text-sm truncate" title={activeItem.secondaryName}>{activeItem.secondaryName}</span>
      </div>
      <div className={`p-3 rounded-lg border flex flex-col justify-between space-y-1 w-full h-full ${cardClass}`}>
        <span className={`text-[11px] ${labelClass}`}>Closest Approach (TCA)</span>
        <span className={`font-semibold text-xs ${isDay ? 'text-slate-900' : 'text-white'}`}>{activeItem.closestApproach}</span>
      </div>
      <div className={`p-3 rounded-lg border flex flex-col justify-between space-y-1 w-full h-full ${cardClass}`}>
        <span className={`text-[11px] ${labelClass}`}>Predicted Miss Distance</span>
        <span className="text-emerald-600 font-bold text-sm">{activeItem.missDistanceKm} km</span>
      </div>
      <div className={`p-3 rounded-lg border flex flex-col justify-between space-y-1 w-full h-full ${cardClass}`}>
        <span className={`text-[11px] ${labelClass}`}>Collision Probability (Pc)</span>
        <span className="text-red-600 font-bold text-sm">{activeItem.riskScore}% (10⁻³)</span>
      </div>
    </div>
  );
}

function ThreatSpecsBreakdown({
  activeItem,
  isDay,
  onOpenManeuverPlanner,
  onOpenCopilot,
}: Readonly<{
  activeItem: Prediction;
  isDay: boolean;
  onOpenManeuverPlanner?: (p: Prediction) => void;
  onOpenCopilot?: (p: Prediction) => void;
}>) {
  const containerClass = isDay ? 'bg-white border border-slate-300 shadow-sm' : 'bg-[#070d18] border border-[#172a46]';
  const headerBorderClass = isDay ? 'border-slate-200' : 'border-[#172a46]';
  const headerTitleClass = isDay ? 'text-slate-900' : 'text-slate-100';
  const copilotBtnClass = isDay
    ? 'bg-slate-900 hover:bg-cyan-700 text-white border-slate-950 shadow-md font-bold'
    : 'bg-[#14233c] hover:bg-cyan-600 hover:text-slate-950 hover:border-cyan-400 text-cyan-300 border-cyan-800/60';

  return (
    <div className={`w-full rounded-xl p-4 space-y-4 ${containerClass}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 ${headerBorderClass}`}>
        <div className={`flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider ${headerTitleClass}`}>
          <Crosshair className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className='text-[10px] md:text-sm font-semibold uppercase tracking-wider'>THREAT SPECS & BREAKDOWN</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border self-start sm:self-auto ${getRiskBadgeClass(activeItem.riskLevel)}`}>
          {activeItem.riskLevel} RISK ({activeItem.riskScore}%)
        </span>
      </div>

      <SpecsGrid activeItem={activeItem} isDay={isDay} />

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t ${headerBorderClass}`}>
        <button
          type="button"
          onClick={() => onOpenManeuverPlanner?.(activeItem)}
          className="py-2.5 px-4 rounded-lg bg-cyan-700 hover:bg-cyan-600 active:scale-95 text-white font-mono text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <Gauge className="w-4 h-4 text-cyan-200" />
          <span>EXECUTE EVASIVE MANEUVER PLAN</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenCopilot?.(activeItem)}
          className={`py-2.5 px-4 rounded-lg border font-mono text-xs font-bold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${copilotBtnClass}`}
        >
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span>RUN AI COPILOT TRAJECTORY DIAGNOSIS</span>
        </button>
      </div>
    </div>
  );
}

export function ImpactAnalysis({
  predictions,
  selectedPrediction,
  onSelectPrediction,
  onOpenCopilot,
  onOpenManeuverPlanner,
  themeMode = 'night',
}: Readonly<ImpactAnalysisProps>) {
  const isDay = themeMode === 'day';
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const highRiskItems = useMemo(() => filterHighRiskItems(predictions), [predictions]);

  const [activeItem, setActiveItem] = useState<Prediction>(
    selectedPrediction || highRiskItems[0] || predictions[0]
  );

  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  useEffect(() => {
    if (selectedPrediction) {
      setActiveItem(selectedPrediction);
    }
  }, [selectedPrediction]);

  const timeSeriesData = useMemo(() => generateTimeSeriesData(activeItem), [activeItem]);

  useD3ImpactChart({
    svgRef,
    containerRef,
    timeSeriesData,
    activeItem,
    containerWidth,
    isDay,
    setHoveredPoint,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-xl flex flex-col lg:flex-row md:items-center justify-between gap-3 ${isDay ? 'bg-white border border-slate-300 shadow-sm' : 'bg-[#070d18] border border-[#172a46]'}`}>
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-600" />
            <h3 className={`text-[10px] md:text-sm font-semibold tracking-tight flex tracking-wider items-center gap-2 ${isDay ? 'text-slate-900' : 'text-white'}`}>
              IMPACT & CONJUNCTION TREND ANALYSIS (D3 ENGINE)
            </h3>
          </div>
          <p className={`text-xs mt-0.5 ${isDay ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
            Dynamic 48-Hour Collision Probability Trend & Covariance Error Ellipse Projection
          </p>
        </div>

        {/* High Risk Conjunction Target Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className={`text-[11px] whitespace-nowrap font-mono ${isDay ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>Select Target:</span>
          {highRiskItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveItem(item);
                onSelectPrediction?.(item);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${getButtonClass(item, activeItem.id, isDay)}`}
            >
              <span className={`w-2 h-2 rounded-full ${item.riskLevel === 'high' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{item.primaryName} vs {item.secondaryName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout: Stacked Full-Width D3 Chart & Threat Specs Breakdown */}
      <div className="flex flex-col gap-4">
        {/* Top: D3 Chart Canvas (Full Width) */}
        <div ref={containerRef} className={`w-full rounded-xl p-4 relative flex flex-col justify-between space-y-2 ${isDay ? 'bg-white border border-slate-300 shadow-sm' : 'bg-[#070d18] border border-[#172a46]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-rose-500 font-semibold">
                <span className="w-2.5 h-0.5 bg-rose-500 inline-block" /> Collision Prob %
              </span>
              <span className="flex items-center gap-1.5 text-cyan-600 font-semibold">
                <span className="w-2.5 h-0.5 bg-cyan-500 border-t border-dashed inline-block" /> Miss Dist (km)
              </span>
            </div>
            <div className={`text-[11px] font-mono ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
              Hover curve to inspect trajectory coordinates
            </div>
          </div>

          <svg ref={svgRef} className="w-full h-[260px] my-1" />

          {/* Dynamic Hover Tooltip Bar */}
          <HoverTooltipBar hoveredPoint={hoveredPoint} isDay={isDay} />
        </div>

        {/* Bottom: Detailed Conjunction Breakdown Metrics & AI Maneuver Actions */}
        <ThreatSpecsBreakdown
          activeItem={activeItem}
          isDay={isDay}
          onOpenManeuverPlanner={onOpenManeuverPlanner}
          onOpenCopilot={onOpenCopilot}
        />
      </div>
    </div>
  );
}