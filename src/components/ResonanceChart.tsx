/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, BarChart3, LineChart, Layers, Zap, Info, Layout, Terminal, ChevronRight, Activity, Clock, Globe, Power } from 'lucide-react';
import { AtomicClock } from '../utils/clock';

interface ResonanceChartProps {
  prices: number[];
  macroPrices: number[];
  microPrice: number | null;
  signal: any;
  predictions: any[];
  activeTimeframe: string;
  setActiveTimeframe: (tf: string) => void;
  dataStream?: string;
  showChart: boolean;
  setShowChart: (v: boolean) => void;
}

const ResonanceChart = memo(function ResonanceChart({ 
  prices, 
  macroPrices,
  microPrice, 
  signal, 
  predictions,
  activeTimeframe,
  setActiveTimeframe,
  dataStream = 'BINANCE_WS',
  showChart,
  setShowChart
}: ResonanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewMode, setViewMode] = useState<'line' | 'candle' | 'bars'>('line');
  const [showHud, setShowHud] = useState(false);
  const [currentTime, setCurrentTime] = useState(AtomicClock.now());
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Live clock update for HUD
  useEffect(() => {
    if (!showChart || !showHud) return;
    const timer = setInterval(() => {
      setCurrentTime(AtomicClock.now());
    }, 100);
    return () => clearInterval(timer);
  }, [showChart, showHud]);

  // Filter prices based on timeframe for "zoom" effect
  const filteredPrices = useMemo(() => {
    const allPrices = prices.length > 0 ? prices : [0, 0];
    const allMacro = macroPrices.length > 0 ? macroPrices : allPrices;

    switch (activeTimeframe) {
      case '10ms': return allPrices.slice(-10);
      case '1m': return allPrices.slice(-60);
      case '15m': return allPrices;
      case '1h': return allPrices; 
      case '4h': return allPrices;
      case '1d': return allMacro.slice(-24); // Last 24 days
      case '1w': return allMacro.slice(-168); // Last 168 days (approx 24 weeks)
      case '1y': return allMacro; // All macro data (1000 days)
      default: return allPrices;
    }
  }, [prices, macroPrices, activeTimeframe]);

  // Generate simulated candlesticks from filtered prices
  const candles = useMemo(() => {
    if (filteredPrices.length < 5) return [];
    const count = 30; // Fixed number of candles for stability
    const chunkSize = Math.max(1, Math.floor(filteredPrices.length / count));
    const result = [];
    for (let i = 0; i < filteredPrices.length; i += chunkSize) {
      const chunk = filteredPrices.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      result.push({
        open: chunk[0],
        high: Math.max(...chunk),
        low: Math.min(...chunk),
        close: chunk[chunk.length - 1],
        time: i
      });
    }
    return result;
  }, [filteredPrices]);

  // Resize Observer for fluid responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const lastRenderRef = useRef<number>(0);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || filteredPrices.length < 2) return;

    const now = performance.now();
    // Throttle rendering to ~30fps (33ms) for smoothness while saving CPU
    if (now - lastRenderRef.current < 33) return;
    lastRenderRef.current = now;

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 40, right: 40, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    
    // Prepare display data for seamless transition
    const isMacro = ['1d', '1w', '1y'].includes(activeTimeframe);
    const displayPrices = (microPrice !== null && !isMacro) 
      ? [...filteredPrices, microPrice] 
      : filteredPrices;

    // Dynamic future padding based on timeframe - more balanced
    const futurePadding = Math.max(2, Math.min(15, Math.floor(displayPrices.length * 0.2)));

    // Use a group for the chart content to avoid clearing everything
    let g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) {
      g = svg.append('g')
        .attr('class', 'main-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    }

    // Scales
    const x = d3.scaleLinear()
      .domain([0, displayPrices.length + futurePadding]) 
      .range([0, innerWidth]);

    const minPrice = Math.min(...displayPrices);
    const maxPrice = Math.max(...displayPrices);
    const predPrices = predictions.map(p => p.predictedPrice).filter(v => v > 0);
    
    const y = d3.scaleLinear()
      .domain([
        Math.min(minPrice, ...predPrices) * 0.9998,
        Math.max(maxPrice, ...predPrices) * 1.0002
      ])
      .range([innerHeight, 0]);

    // Grid lines
    g.selectAll('g.grid').data([null]).join('g')
      .attr('class', 'grid')
      .attr('opacity', 0.05)
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(() => '') as any);

    // Future Projection Area
    const futureX = displayPrices.length - 1;
    g.selectAll('rect.future-bg').data([null]).join('rect')
      .attr('class', 'future-bg')
      .attr('x', x(futureX))
      .attr('y', 0)
      .attr('width', x(displayPrices.length + futurePadding) - x(futureX))
      .attr('height', innerHeight)
      .attr('fill', 'url(#future-grad)')
      .attr('opacity', 0.1);

    // Future Label
    g.selectAll('text.future-label').data([null]).join('text')
      .attr('class', 'future-label')
      .attr('x', x(futureX + futurePadding / 2))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'JetBrains Mono')
      .attr('font-size', '8px')
      .attr('fill', '#7C5CFC')
      .attr('font-weight', 'bold')
      .text('PREDICTED FUTURE');

    // Gradient for future
    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
      const futureGrad = defs.append('linearGradient')
        .attr('id', 'future-grad')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
      futureGrad.append('stop').attr('offset', '0%').attr('stop-color', '#7C5CFC').attr('stop-opacity', 0.5);
      futureGrad.append('stop').attr('offset', '100%').attr('stop-color', '#7C5CFC').attr('stop-opacity', 0);
    }

    // Line Path
    if (viewMode === 'line') {
      g.selectAll('g.candles').remove();
      g.selectAll('rect.bar').remove();
      
      const line = d3.line<number>()
        .x((_, i) => x(i))
        .y(d => y(d))
        .curve(d3.curveMonotoneX);

      g.selectAll('path.price-line').data([displayPrices]).join('path')
        .attr('class', 'price-line')
        .attr('fill', 'none')
        .attr('stroke', '#7C5CFC')
        .attr('stroke-width', 2)
        .attr('d', line);
    } else if (viewMode === 'candle') {
      g.selectAll('path.price-line').remove();
      g.selectAll('rect.bar').remove();
      
      const candleWidth = (innerWidth / candles.length) * 0.7;
      const candleG = g.selectAll<SVGGElement, any>('g.candle')
        .data(candles, (d: any) => d.time)
        .join('g')
        .attr('class', 'candle');

      candleG.selectAll('line.wick').data((d: any) => [d]).join('line')
        .attr('class', 'wick')
        .attr('x1', (d: any) => x(d.time))
        .attr('x2', (d: any) => x(d.time))
        .attr('y1', (d: any) => y(d.high))
        .attr('y2', (d: any) => y(d.low))
        .attr('stroke', (d: any) => d.close >= d.open ? '#00D68F' : '#FF4D6A')
        .attr('stroke-width', 1);

      candleG.selectAll('rect.body').data((d: any) => [d]).join('rect')
        .attr('class', 'body')
        .attr('x', (d: any) => x(d.time) - candleWidth / 2)
        .attr('y', (d: any) => y(Math.max(d.open, d.close)))
        .attr('width', candleWidth)
        .attr('height', (d: any) => Math.max(1, Math.abs(y(d.open) - y(d.close))))
        .attr('fill', (d: any) => d.close >= d.open ? '#00D68F' : '#FF4D6A')
        .attr('rx', 1);
    } else if (viewMode === 'bars') {
      g.selectAll('path.price-line').remove();
      g.selectAll('g.candle').remove();
      
      const barWidth = (innerWidth / displayPrices.length) * 0.5;
      g.selectAll('rect.bar')
        .data(displayPrices)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', (_, i) => x(i) - barWidth / 2)
        .attr('y', (d: any) => y(d))
        .attr('width', barWidth)
        .attr('height', (d: any) => innerHeight - y(d))
        .attr('fill', '#7C5CFC')
        .attr('opacity', 0.4);
    }

    // Future Projections
    const predictionGroup = g.selectAll('g.predictions').data([predictions]).join('g').attr('class', 'predictions');
    const validPredictions = predictions.filter(p => p.predictedPrice > 0);
    
    if (validPredictions.length > 0) {
      const lastPrice = displayPrices[displayPrices.length - 1];
      const lastIdx = displayPrices.length - 1;
      
      // Confidence Area
      const areaData = [
        { x: lastIdx, y0: lastPrice, y1: lastPrice },
        ...validPredictions.map((p, i) => ({
          x: lastIdx + 5 + (i * 2),
          y0: p.predictedPrice * 0.998,
          y1: p.predictedPrice * 1.002
        }))
      ];

      const area = d3.area<any>()
        .x(d => x(d.x))
        .y0(d => y(d.y0))
        .y1(d => y(d.y1))
        .curve(d3.curveMonotoneX);

      predictionGroup.selectAll('path.confidence-area').data([areaData]).join('path')
        .attr('class', 'confidence-area')
        .attr('fill', '#7C5CFC')
        .attr('opacity', 0.1)
        .attr('d', area);

    // Smooth Prediction Path
      const pathData = [
        { x: lastIdx, y: lastPrice },
        ...validPredictions.map((p, i) => ({
          x: lastIdx + 2 + (i * 3), // Slightly more spread out for clarity
          y: p.predictedPrice
        }))
      ];

      const predLine = d3.line<any>()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .curve(d3.curveMonotoneX);

      predictionGroup.selectAll('path.pred-path').data([pathData]).join('path')
        .attr('class', 'pred-path')
        .attr('fill', 'none')
        .attr('stroke', '#7C5CFC')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
        .attr('d', predLine)
        .attr('opacity', 0.8);

      // Prediction Points and Labels
      const predItems = predictionGroup.selectAll<SVGGElement, any>('g.pred-item')
        .data(validPredictions, (d: any) => d.key)
        .join('g')
        .attr('class', 'pred-item');

      predItems.selectAll('circle.point').data((d: any) => [d]).join('circle')
        .attr('class', 'point')
        .attr('cx', (_, i) => x(lastIdx + 2 + (i * 3)))
        .attr('cy', (d: any) => y(d.predictedPrice as any))
        .attr('r', 2.5)
        .attr('fill', '#C4ADFF')
        .attr('stroke', '#7C5CFC')
        .attr('stroke-width', 1);

      // Staggered Labels to avoid overlap
      predItems.selectAll('text.label').data((d: any) => [d]).join('text')
        .attr('class', 'label')
        .attr('x', (_, i) => x(lastIdx + 2 + (i * 3)) + 8)
        .attr('y', (d: any, i) => {
          const base = y(d.predictedPrice as any);
          // Stagger labels vertically if they are too close
          return i % 2 === 0 ? base - 4 : base + 4;
        })
        .attr('font-family', 'JetBrains Mono')
        .attr('font-size', '7px')
        .attr('fill', '#E8E3FF')
        .attr('alignment-baseline', 'middle')
        .attr('opacity', showHud ? 0.1 : 0.9)
        .text((d: any) => showHud ? '' : `${d.label}: $${d.predictedPrice.toLocaleString()}`);
    } else {
      predictionGroup.selectAll('*').remove();
    }

    // SR Potential Well Overlay
    if (signal) {
      const wellGroup = g.selectAll('g.well-overlay').data([signal]).join('g').attr('class', 'well-overlay');
      
      const wellData = [];
      const a = signal.a;
      const b = signal.b;
      for (let xVal = -4; xVal <= 4; xVal += 0.2) {
        const v = - (a / 2) * Math.pow(xVal, 2) + (b / 4) * Math.pow(xVal, 4);
        wellData.push({ x: xVal, v });
      }

      const wellX = d3.scaleLinear().domain([-4, 4]).range([innerWidth - 120, innerWidth - 20]);
      const wellY = d3.scaleLinear().domain([d3.min(wellData, d => d.v)!, d3.max(wellData, d => d.v)!]).range([50, 10]);

      const wellLine = d3.line<any>()
        .x(d => wellX(d.x))
        .y(d => wellY(d.v))
        .curve(d3.curveBasis);

      wellGroup.selectAll('path.well-curve').data([wellData]).join('path')
        .attr('class', 'well-curve')
        .attr('fill', 'none')
        .attr('stroke', '#F857A6')
        .attr('stroke-width', 1.5)
        .attr('d', wellLine)
        .attr('opacity', 0.8);

      const currentX = (signal.phase || 0) * 2;
      const currentV = - (a / 2) * Math.pow(currentX, 2) + (b / 4) * Math.pow(currentX, 4);
      
      wellGroup.selectAll('circle.ball').data([null]).join('circle')
        .attr('class', 'ball')
        .attr('cx', wellX(currentX))
        .attr('cy', wellY(currentV))
        .attr('r', 4)
        .attr('fill', '#FFFFFF')
        .attr('filter', 'drop-shadow(0 0 4px #F857A6)');

      wellGroup.selectAll('text.well-label').data([null]).join('text')
        .attr('class', 'well-label')
        .attr('x', innerWidth - 70)
        .attr('y', 65)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'JetBrains Mono')
        .attr('font-size', '8px')
        .attr('fill', '#F857A6')
        .attr('font-weight', 'bold')
        .text('MARKET GRAVITY (SR)');
    }

    // Axes
    const yAxis = d3.axisRight(y)
      .ticks(5)
      .tickFormat(d => `$${d.toLocaleString()}`);

    g.selectAll('g.y-axis').data([null]).join('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${innerWidth}, 0)`)
      .call(yAxis as any)
      .selectAll('text')
      .attr('font-family', 'JetBrains Mono')
      .attr('font-size', '8px')
      .attr('fill', '#7B72A8')
      .attr('font-weight', '500');

    g.selectAll('.domain').attr('stroke', 'none');
    g.selectAll('.tick line').attr('stroke', 'rgba(123, 114, 168, 0.15)');

  }, [filteredPrices, microPrice, signal, predictions, viewMode, candles, activeTimeframe, dimensions]);

  // Calculate dynamic mean confidence
  const meanConfidence = useMemo(() => {
    const validPreds = predictions.filter(p => p.predictedPrice > 0);
    if (validPreds.length === 0) return "0";
    const sum = validPreds.reduce((acc, p) => acc + (parseInt(p.conf) || 0), 0);
    return (sum / validPreds.length).toFixed(1);
  }, [predictions]);

  return (
    <section className="bg-card border border-border rounded-[32px] p-8 shadow-2xl relative overflow-hidden group/chart">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-primary/10 rounded-xl text-purple-primary">
            <Maximize2 size={16} />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">Smart Analytics</span>
            <h3 className="text-white font-black text-sm tracking-tight">Dolyn Smart Chart Window</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-surface/40 p-1 rounded-2xl border border-border/30 backdrop-blur-md">
          <button 
            onClick={() => setShowChart(!showChart)}
            className={`p-2.5 rounded-xl transition-all duration-300 ${showChart ? 'bg-purple-primary text-white shadow-lg shadow-purple-primary/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
            title={showChart ? "Turn OFF Chart Display" : "Turn ON Chart Display"}
          >
            <Power size={14} />
          </button>
          <div className="w-px h-4 bg-border/30 mx-1"></div>
          <button 
            onClick={() => setViewMode('line')}
            className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'line' ? 'bg-purple-primary text-white shadow-lg shadow-purple-primary/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
          >
            <LineChart size={14} />
          </button>
          <button 
            onClick={() => setViewMode('candle')}
            className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'candle' ? 'bg-purple-primary text-white shadow-lg shadow-purple-primary/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
          >
            <Layers size={14} />
          </button>
          <button 
            onClick={() => setViewMode('bars')}
            className={`p-2.5 rounded-xl transition-all duration-300 ${viewMode === 'bars' ? 'bg-purple-primary text-white shadow-lg shadow-purple-primary/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
          >
            <BarChart3 size={14} />
          </button>
          <div className="w-px h-4 bg-border/30 mx-1"></div>
          <button 
            onClick={() => setShowHud(!showHud)}
            className={`p-2.5 rounded-xl transition-all duration-300 ${showHud ? 'bg-purple-accent text-white shadow-lg shadow-purple-accent/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
            title="Toggle Prediction HUD"
          >
            <Layout size={14} />
          </button>
        </div>
      </div>

      {showChart ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div ref={containerRef} className="h-[300px] md:h-[480px] w-full bg-surface/10 rounded-[32px] border border-border/20 relative group overflow-hidden">
              <svg ref={svgRef} className="w-full h-full overflow-visible" />
              
              {/* Legend Overlay - Refined Apple/Dribbble Style */}
              <div className="absolute top-6 left-6 flex flex-col gap-3 bg-black/60 p-4 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 rounded-full bg-purple-primary shadow-[0_0_8px_rgba(124,92,252,0.5)]"></div>
                  <span className="font-mono text-[9px] text-white/90 font-bold uppercase tracking-widest">Current Price</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 rounded-full border-t-2 border-dashed border-purple-accent/80"></div>
                  <span className="font-mono text-[9px] text-white/90 font-bold uppercase tracking-widest">Predicted Path</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 rounded-full bg-pink-accent shadow-[0_0_8px_rgba(248,87,166,0.5)]"></div>
                  <span className="font-mono text-[9px] text-white/90 font-bold uppercase tracking-widest">Market Gravity</span>
                </div>
              </div>

              {/* Timeframe Indicator */}
              <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 font-mono text-[9px] text-purple-accent font-black tracking-widest uppercase">
                {activeTimeframe} RESOLUTION
              </div>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                {!showHud ? (
                  <motion.div 
                    key="internals"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="space-y-4 h-full"
                  >
                    <div className="p-6 bg-surface/30 rounded-[32px] border border-border/20 h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-6 text-purple-accent">
                        <div className="p-2 bg-purple-accent/10 rounded-xl">
                          <Zap size={16} />
                        </div>
                        <span className="font-mono text-[11px] font-black uppercase tracking-widest">Algo Internals</span>
                      </div>
                      <div className="space-y-5 flex-1">
                        {[
                          { label: 'ALGO MODE', value: 'LIVE', color: 'text-white' },
                          { label: 'SPEED', value: '10ms Ticks', color: 'text-white' },
                          { label: 'RANGE', value: '10ms - 1 Year', color: 'text-white' },
                          { label: 'ALGO TYPE', value: 'CLAY RS', color: 'text-green-accent' },
                          { label: 'HEALTH', value: signal?.accepted ? 'STABLE' : 'NOISY', color: signal?.accepted ? 'text-green-accent' : 'text-red-accent' }
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center group/stat">
                            <span className="font-mono text-[9px] text-text-muted group-hover/stat:text-text-faint transition-colors">{item.label}</span>
                            <span className={`font-mono text-[11px] font-bold ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                        <div className="h-px bg-border/20 my-2"></div>
                      </div>

                      <div className="mt-auto p-5 bg-purple-primary/5 rounded-2xl border border-purple-primary/10">
                        <div className="flex items-center gap-2 mb-3 text-purple-primary">
                          <Info size={14} />
                          <span className="font-mono text-[10px] font-black uppercase tracking-widest">Protocol</span>
                        </div>
                        <p className="font-mono text-[9px] text-text-muted leading-relaxed italic">
                          Stochastic Resonance pathing uses non-linear potential wells to map future volatility clusters.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="hud"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute inset-0 bg-card/95 backdrop-blur-2xl rounded-[32px] border border-purple-primary/30 p-6 flex flex-col shadow-[0_32px_64px_rgba(0,0,0,0.4)] z-50"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3 text-purple-accent">
                        <div className="p-2.5 bg-purple-primary/10 rounded-xl shadow-inner">
                          <Terminal size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em]">Prediction HUD</span>
                          <span className="font-mono text-[8px] text-text-muted uppercase font-bold">v2.5.0-STABLE</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowHud(false)} 
                        className="p-2 hover:bg-white/5 rounded-xl text-text-muted hover:text-white transition-all active:scale-95"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>

                    {/* Atomic Clock & Sync Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <div className="p-4 bg-surface/40 rounded-2xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2 mb-2 text-text-muted">
                          <Clock size={12} />
                          <span className="font-mono text-[8px] uppercase font-bold tracking-widest">Atomic</span>
                        </div>
                        <div className="font-mono text-[14px] text-white font-black tabular-nums tracking-tight">
                          {new Date(currentTime).toLocaleTimeString('en-GB', { hour12: false })}
                          <span className="text-[9px] opacity-40 ml-1 font-normal">.{String(currentTime % 1000).padStart(3, '0')}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-surface/40 rounded-2xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-2 mb-2 text-text-muted">
                          <Globe size={12} />
                          <span className="font-mono text-[8px] uppercase font-bold tracking-widest">Source</span>
                        </div>
                        <div className="font-mono text-[11px] text-green-accent font-black tracking-tight">
                          {dataStream.replace('_', ' ')}
                        </div>
                        <div className="font-mono text-[7px] text-text-faint uppercase font-bold mt-1">Latency: ~12ms</div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                      {predictions.filter(p => p.predictedPrice > 0).map((pred, idx) => {
                        const currentPrice = microPrice || filteredPrices[filteredPrices.length - 1];
                        const diff = pred.predictedPrice - currentPrice;
                        const percent = (diff / currentPrice) * 100;
                        const accuracy = parseInt(pred.conf) || 0;
                        
                        return (
                          <motion.div 
                            key={pred.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-5 bg-surface/40 rounded-2xl border border-white/5 hover:border-purple-primary/40 transition-all group/item relative overflow-hidden shadow-lg"
                          >
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-primary/20 group-hover/item:bg-purple-primary transition-colors"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-col">
                                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest font-bold">{pred.label}</span>
                                <span className="font-mono text-[7px] text-text-faint uppercase font-medium mt-0.5">Target: {pred.targetTime.split(' ')[1]}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className={`font-mono text-[11px] font-black ${percent >= 0 ? 'text-green-accent' : 'text-red-accent'}`}>
                                  {percent >= 0 ? '+' : ''}{percent.toFixed(2)}%
                                </span>
                                <span className="font-mono text-[7px] text-text-faint uppercase font-bold mt-0.5">Acc: {accuracy}%</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-end">
                              <span className="font-mono text-xl text-white font-black tabular-nums tracking-tighter">
                                ${pred.predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden shadow-inner">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${accuracy}%` }}
                                    className="h-full bg-purple-primary shadow-[0_0_8px_rgba(124,92,252,0.4)]" 
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      {predictions.filter(p => p.predictedPrice > 0).length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-10">
                          <Activity size={32} className="mb-4 animate-pulse text-purple-accent" />
                          <span className="font-mono text-[11px] uppercase tracking-[0.3em] font-black">Scanning Resonance...</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-mono text-[9px] text-text-muted uppercase font-bold tracking-widest">Mean Confidence</span>
                        <span className="font-mono text-[12px] text-purple-accent font-black">{meanConfidence}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${meanConfidence}%` }}
                          className="h-full bg-linear-to-r from-purple-primary to-purple-accent shadow-[0_0_12px_rgba(124,92,252,0.3)]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {['10ms', '1m', '15m', '1h', '4h', '1d', '1w', '1y'].map(tf => (
              <button 
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-4 py-2 rounded-xl font-mono text-[10px] font-black tracking-widest uppercase transition-all duration-300 border ${activeTimeframe === tf ? 'bg-purple-primary text-white border-purple-primary shadow-lg shadow-purple-primary/20' : 'bg-surface/30 text-text-muted hover:text-white border-border/30 hover:bg-white/5'}`}
              >
                {tf}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between p-4 bg-surface/10 rounded-2xl border border-dashed border-border/30">
          <div className="flex items-center gap-4">
            <Power size={20} className="text-text-faint" />
            <div className="flex flex-col">
              <h4 className="text-xs font-black text-text-faint uppercase tracking-widest">Chart Engine Offline</h4>
              <p className="text-[9px] text-text-muted font-mono">Rendering suspended to optimize resources.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowChart(true)}
            className="px-6 py-2 bg-purple-primary text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-purple-primary/20 hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            Re-Initialize
          </button>
        </div>
      )}
    </section>
  );
});

export default ResonanceChart;
