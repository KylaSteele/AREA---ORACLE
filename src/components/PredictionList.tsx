import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trash2, Activity } from 'lucide-react';
import { Prediction, PendingPrediction } from '../types';
import Sparkline from './Sparkline';

interface PredictionListProps {
  predictions: Prediction[];
  pendingPredictions: PendingPrediction[];
  microPrice: number | null;
  prices: number[];
  refreshPrediction: (key: string) => void;
  deleteActivePrediction: (key: string) => void;
  formatPrecisePrice: (price: number) => string;
  AtomicClock: { now: () => number };
  HORIZONS: any[];
}

const PredictionList = memo(function PredictionList({
  predictions,
  pendingPredictions,
  microPrice,
  prices,
  refreshPrediction,
  deleteActivePrediction,
  formatPrecisePrice,
  AtomicClock,
  HORIZONS
}: PredictionListProps) {
  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
      <AnimatePresence initial={false}>
        {(predictions.length > 0 ? predictions : HORIZONS.map(h => ({ ...h, predictedPrice: 0, baselinePrice: 0, predictedAt: '—', targetTime: '—', conf: '—', bar: 0 }))).map((p) => {
          const diff = microPrice ? ((p.predictedPrice - microPrice) / microPrice) * 100 : 0;
          const isPending = pendingPredictions.some(pp => pp.horizonKey === p.key);
          const pendingItem = pendingPredictions.find(pp => pp.horizonKey === p.key);
          const msRemaining = pendingItem ? pendingItem.targetTimestamp - AtomicClock.now() : 0;
          const secRemaining = Math.max(0, Math.floor(msRemaining / 1000));

          const totalDistance = Math.abs(p.predictedPrice - p.baselinePrice);
          const currentDistance = microPrice ? Math.abs(p.predictedPrice - microPrice) : 0;
          const gravity = totalDistance > 0 ? Math.max(0, Math.min(100, (1 - currentDistance / totalDistance) * 100)) : 0;

          return (
            <motion.div 
              key={p.key}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex flex-col sm:grid sm:grid-cols-[120px_1fr_120px_auto] items-start sm:items-center gap-4 p-4 rounded-2xl border transition-all group ${isPending ? 'bg-purple-primary/5 border-purple-primary/20' : 'bg-card2/50 border-border/50 hover:border-purple-primary/30'}`}
            >
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <div className="font-mono text-[11px] text-text-muted font-bold uppercase tracking-wider">{p.label}</div>
                <div className="font-mono text-[10px] text-purple-accent font-bold">{p.conf}{p.conf !== '—' ? '% CONF' : ''}</div>
                <div className="font-mono text-[8px] text-text-muted mt-1">TARGET: <span className="text-white font-bold">{p.targetTime}</span></div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="font-mono text-[7px] uppercase transition-all duration-300 opacity-40 group-hover:opacity-100 group-hover:text-red-accent group-hover:font-bold">
                    {isPending ? `Resolving in ${secRemaining}s` : `Committed`}
                  </div>
                  <button 
                    onClick={() => refreshPrediction(p.key)}
                    className="p-1 rounded-md hover:bg-purple-primary/20 text-text-faint hover:text-purple-accent transition-colors"
                    title="Refresh this prediction"
                  >
                    <RefreshCw size={8} />
                  </button>
                  <button 
                    onClick={() => deleteActivePrediction(p.key)}
                    className="p-2 rounded-lg hover:bg-red-accent/20 text-text-faint hover:text-red-accent transition-all active:scale-90"
                    title="Cancel this prediction"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="relative h-1.5 bg-text-faint/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${p.bar}%` }}
                    className="h-full rounded-full bg-linear-to-r from-purple-primary to-purple-secondary shadow-[0_0_10px_rgba(124,92,252,0.5)]"
                  />
                  {p.predictedPrice > 0 && (
                    <motion.div 
                      animate={{ left: `${gravity}%` }}
                      className="absolute top-0 w-1 h-full bg-white shadow-[0_0_5px_#fff] z-10"
                      title="Price Gravity (Proximity to Target)"
                    />
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div className={`flex items-center gap-1 font-mono text-[9px] font-bold ${diff >= 0 ? 'text-green-accent' : 'text-red-accent'}`}>
                    {p.predictedPrice === 0 ? '—' : (
                      <>
                        <Activity size={10} />
                        {diff >= 0 ? '+' : ''}{diff.toFixed(2)}% FROM LIVE
                      </>
                    )}
                  </div>
                  <div className="font-mono text-[8px] text-text-faint">BASE: ${formatPrecisePrice(p.baselinePrice)}</div>
                </div>
              </div>
              
              {/* Ghost Trend Overlay */}
              <div className="hidden lg:block w-[120px] h-10 opacity-30 group-hover:opacity-60 transition-opacity">
                <Sparkline data={prices.slice(-30)} className="h-full" />
              </div>

              <div className="flex flex-col items-end w-full sm:w-auto">
                <div className="font-mono text-[7px] text-purple-accent/70 font-bold mb-1">GEN: {p.predictedAt}</div>
                <div className={`font-mono text-base font-black text-right ${p.predictedPrice === 0 ? 'text-text-faint' : 'text-text-primary'}`}>
                  ${p.predictedPrice === 0 ? '—' : formatPrecisePrice(p.predictedPrice)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default PredictionList;
