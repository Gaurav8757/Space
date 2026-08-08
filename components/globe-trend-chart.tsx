'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Satellite, Prediction, RiskLevel } from '@/lib/types';
import { TrendingUp, Info } from 'lucide-react';

interface GlobeTrendChartProps {
  selectedSat: Satellite;
  predictions: Prediction[];
  themeMode?: 'day' | 'night';
}

interface HistoricalPoint {
  hoursAgo: number; // -24 to 0
  timeLabel: string;
  pcScore: number; // 0 to 100 (%)
  pcExponent: string; // e.g., "1.4 × 10⁻⁴"
  missDistanceKm: number;
  riskLevel: RiskLevel;
}

export function GlobeTrendChart({ selectedSat, predictions, themeMode = 'night' }: Readonly<GlobeTrendChartProps>) {
  const isDay = themeMode === 'day';
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalPoint | null>(null);

  // Responsive width tracking via ResizeObserver
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

  // Find most critical conjunction associated with selected satellite or overall highest risk
  const relevantPrediction = useMemo(() => {
    const match = predictions.find(
      (p) =>
        p.primaryName.toLowerCase().includes(selectedSat.name.toLowerCase()) ||
        p.secondaryName.toLowerCase().includes(selectedSat.name.toLowerCase())
    );
    return match || predictions[0];
  }, [selectedSat, predictions]);

  // Helper function to extract risk level without nested ternary
  const getRiskLevel = (score: number): RiskLevel => {
    if (score >= 60) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  };

  // Generate realistic 24-hour historical trend data (-24h to 0h)
  const historicalData: HistoricalPoint[] = useMemo(() => {
    if (!relevantPrediction) return [];

    const baseScore = relevantPrediction.riskScore; // e.g. 78% or 12%
    const baseDist = relevantPrediction.missDistanceKm; // e.g. 0.85 km
    const points: HistoricalPoint[] = [];

    // 13 data points spaced every 2 hours from -24h to 0h (Now)
    for (let h = -24; h <= 0; h += 2) {
      const progress = (h + 24) / 24; // 0.0 to 1.0
      // Collision probability evolves non-linearly over the last 24 hours as orbital elements refine
      const fluctuation = Math.sin(h * 0.5) * 4;
      const score = Math.min(
        98,
        Math.max(0.5, baseScore * (0.3 + 0.7 * Math.pow(progress, 1.8)) + fluctuation)
      );

      // Miss distance decreases as orbit determination error reduces
      const dist = Math.max(0.08, baseDist * (1.8 - 0.8 * progress) + Math.cos(h * 0.4) * 0.05);

      const riskLevel = getRiskLevel(score);

      // Convert score to scientific notation representation for Pc
      const pcVal = (score / 100) * 1e-3;
      const expStr = pcVal.toExponential(2).replace('e', ' × 10^');

      points.push({
        hoursAgo: h,
        timeLabel: h === 0 ? 'NOW (T-0)' : `${h}h`,
        pcScore: Number(score.toFixed(1)),
        pcExponent: expStr,
        missDistanceKm: Number(dist.toFixed(2)),
        riskLevel,
      });
    }

    return points;
  }, [relevantPrediction]);

  // D3 Chart Rendering Engine
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || historicalData.length === 0) return;

    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    const width = containerWidth || containerRef.current.clientWidth || 500;
    const height = 180;
    const margin = { top: 25, right: 30, bottom: 30, left: 45 };
    const innerWidth = Math.max(50, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = svgElement
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Hours: -24 to 0)
    const xScale = d3
      .scaleLinear()
      .domain([-24, 0])
      .range([0, innerWidth]);

    // Y Scale (Pc Score 0 - 100%)
    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Gradients
    const defs = svg.append('defs');

    // Glowing Line Gradient
    const lineGradient = defs
      .append('linearGradient')
      .attr('id', 'pc-line-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    lineGradient.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8');
    lineGradient.append('stop').attr('offset', '70%').attr('stop-color', '#f59e0b');
    lineGradient.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e');

    // Area Fill Gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'pc-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f43f5e')
      .attr('stop-opacity', isDay ? 0.25 : 0.35);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', isDay ? '#f8fafc' : '#070e1b')
      .attr('stop-opacity', 0.0);

    // Glow Filter
    const filter = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');

    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Horizontal Grid Lines
    const yAxisGrid = d3.axisLeft(yScale).ticks(4).tickSize(-innerWidth).tickFormat(() => '');
    svg
      .append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', isDay ? '#e2e8f0' : '#16263f')
      .attr('stroke-dasharray', '3,3');

    svg.selectAll('.grid .domain').remove();

    // Critical Threshold Line at Pc = 60%
    svg
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(60))
      .attr('y2', yScale(60))
      .attr('stroke', '#ef4444')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.85);

    svg
      .append('text')
      .attr('x', innerWidth - 4)
      .attr('y', yScale(60) - 4)
      .attr('fill', isDay ? '#dc2626' : '#f87171')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('text-anchor', 'end')
      .attr('font-weight', 'bold')
      .text('CRITICAL THRESHOLD (Pc > 10⁻⁴)');

    // Area path
    const areaGen = d3
      .area<HistoricalPoint>()
      .x((d) => xScale(d.hoursAgo))
      .y0(innerHeight)
      .y1((d) => yScale(d.pcScore))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(historicalData)
      .attr('fill', 'url(#pc-area-gradient)')
      .attr('d', areaGen);

    // Line generator
    const lineGen = d3
      .line<HistoricalPoint>()
      .x((d) => xScale(d.hoursAgo))
      .y((d) => yScale(d.pcScore))
      .curve(d3.curveMonotoneX);

    // Line path with glow effect
    svg
      .append('path')
      .datum(historicalData)
      .attr('fill', 'none')
      .attr('stroke', 'url(#pc-line-gradient)')
      .attr('stroke-width', 2.5)
      .attr('filter', isDay ? null : 'url(#glow)')
      .attr('d', lineGen);

    // X Axis
    const tickCount = Math.max(4, Math.floor(innerWidth / 65));
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(tickCount)
      .tickFormat((d) => (d === 0 ? 'Now' : `${d}h`));

    svg
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', isDay ? '#475569' : '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    svg.select('.domain').attr('stroke', isDay ? '#cbd5e1' : '#1e3252');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `${d}%`);

    svg
      .append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', isDay ? '#475569' : '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    const getPointColor = (riskLevel: RiskLevel) => {
      if (riskLevel === 'high') return '#f43f5e';
      if (riskLevel === 'medium') return '#f59e0b';
      return '#38bdf8';
    };

    // Interactive Points
    svg
      .selectAll('.data-point')
      .data(historicalData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (d) => xScale(d.hoursAgo))
      .attr('cy', (d) => yScale(d.pcScore))
      .attr('r', (d) => (d.hoursAgo === 0 ? 5 : 3.5))
      .attr('fill', (d) => getPointColor(d.riskLevel))
      .attr('stroke', isDay ? '#ffffff' : '#070e1b')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setHoveredPoint(d);
        d3.select(event.currentTarget).attr('r', 7).attr('stroke', isDay ? '#0284c7' : '#ffffff');
      })
      .on('mouseleave', (event, d) => {
        setHoveredPoint(null);
        d3.select(event.currentTarget)
          .attr('r', d.hoursAgo === 0 ? 5 : 3.5)
          .attr('stroke', isDay ? '#ffffff' : '#070e1b');
      });
  }, [historicalData, containerWidth, isDay]);

  return (
    <div className={`p-3.5 rounded-xl space-y-2 mt-4 overflow-hidden ${isDay ? 'bg-slate-50 border border-slate-200 shadow-sm' : 'bg-[#091122] border border-[#1b2c48]'}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2 ${isDay ? 'border-slate-200' : 'border-[#16263e]'}`}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-500 shrink-0" />
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
            24-Hour Historical Collision Probability ($P_c$) Trend
          </h3>
        </div>
        {relevantPrediction && (
          <span className={`text-[10px] font-mono truncate ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
            Object: <strong className="text-cyan-600">{relevantPrediction.primaryName}</strong> vs{' '}
            <strong className="text-red-500">{relevantPrediction.secondaryName}</strong>
          </span>
        )}
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="w-full relative min-h-[180px] overflow-hidden">
        <svg ref={svgRef} className="w-full h-[180px] block" />

        {/* Hover Data Card */}
        {hoveredPoint && (
          <div className={`absolute top-2 right-2 sm:right-4 rounded-lg p-2 text-xs font-mono shadow-xl backdrop-blur space-y-1 z-10 max-w-[200px] ${isDay ? 'bg-white/95 border border-slate-300 text-slate-800' : 'bg-[#0e1c33]/95 border border-cyan-800/80 text-slate-300'}`}>
            <div className={`flex items-center justify-between gap-3 border-b pb-1 ${isDay ? 'border-slate-200' : 'border-[#1c3254]'}`}>
              <span className="text-cyan-600 font-bold">{hoveredPoint.timeLabel}</span>
              <span
                className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                  hoveredPoint.riskLevel === 'high'
                    ? 'bg-red-500/20 text-red-600 border border-red-300'
                    : 'bg-amber-500/20 text-amber-700 border border-amber-300'
                }`}
              >
                {hoveredPoint.riskLevel} Risk
              </span>
            </div>
            <div className={isDay ? 'text-slate-700' : 'text-slate-300'}>
              $P_c$ Score: <strong className={isDay ? 'text-slate-900' : 'text-white'}>{hoveredPoint.pcScore}%</strong>
            </div>
            <div className={`text-[10px] ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
              Miss Distance: <strong className="text-emerald-600">{hoveredPoint.missDistanceKm} km</strong>
            </div>
          </div>
        )}
      </div>

      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] pt-1 border-t font-mono ${isDay ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-[#14233a]'}`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> T-24h (Initial Orbit)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> T-0 (Current Approach)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3 text-cyan-500" /> D3.js Interpolated Trajectory Refinement
        </div>
      </div>
    </div>
  );
}

