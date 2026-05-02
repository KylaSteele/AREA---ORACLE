import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { ScoreHorizon, PendingPrediction } from '../types';

interface ScoreboardTableProps {
  HORIZONS: any[];
  scores: Record<string, ScoreHorizon>;
  deleteHorizonScore: (key: string) => void;
  formatPrecisePrice: (price: number) => string;
}

const ScoreboardTable = memo(function ScoreboardTable({
  HORIZONS,
  scores,
  deleteHorizonScore,
  formatPrecisePrice,
  pendingPredictions,
  AtomicClock
}: ScoreboardTableProps & { pendingPredictions: PendingPrediction[], AtomicClock: any }) {
  return (
    <div className="overflow-x-auto custom-scrollbar max-h-[300px] overflow-y-auto mb-6">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr className="text-left font-mono text-[9px] text-text-muted uppercase tracking-widest border-b border-border/20">
            <th className="pb-3 font-bold">Horizon</th>
            <th className="pb-3 font-bold text-center">Last Pred vs Actual</th>
            <th className="pb-3 font-bold text-center">Delta</th>
            <th className="pb-3 font-bold text-center">Avg Acc</th>
            <th className="pb-3 font-bold text-right">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {HORIZONS.map(h => {
            const score = scores[h.key];
            const pendingItem = pendingPredictions.find(pp => pp.horizonKey === h.key);
            const msRemaining = pendingItem ? pendingItem.targetTimestamp - AtomicClock.now() : 0;
            const secRemaining = Math.max(0, Math.floor(msRemaining / 1000));
            
            return (
              <tr key={h.key} className="group hover:bg-surface/30 transition-colors">
                <td className="py-4 font-mono text-xs text-text-muted font-black uppercase">
                  {h.minutes < 60 ? `${h.minutes}m` : `${h.minutes/60}h`}
                  {pendingItem && (
                    <div className="text-[7px] text-purple-accent animate-pulse mt-1">SYNC IN {secRemaining}s</div>
                  )}
                </td>
                <td className="py-4 text-center">
                  <AnimatePresence mode="wait">
                    {score?.lastPredicted ? (
                      <motion.div 
                        key="data"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex flex-col gap-0.5"
                      >
                        <div className="font-mono text-[10px] text-text-muted tracking-tighter">
                          Pred: <span className="text-purple-accent font-bold">${formatPrecisePrice(score.lastPredicted)}</span>
                        </div>
                        <div className="font-mono text-[10px] text-text-muted tracking-tighter">
                          Act: <span className="text-white font-bold">${score.lastActual ? formatPrecisePrice(score.lastActual) : '—'}</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.span 
                        key="pending"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-[10px] text-text-faint"
                      >
                        PENDING
                      </motion.span>
                    )}
                  </AnimatePresence>
                </td>
                <td className="py-4 text-center">
                  {score?.lastPct !== undefined ? (
                    <div className={`font-mono text-[10px] font-bold ${score.lastPct < 1 ? 'text-green-accent' : score.lastPct < 3 ? 'text-amber-accent' : 'text-red-accent'}`}>
                      {score.lastPct.toFixed(2)}%
                    </div>
                  ) : (
                    <span className="font-mono text-[10px] text-text-faint">—</span>
                  )}
                </td>
                <td className="py-4">
                  <div className="flex flex-col gap-1.5 items-center">
                    <div className="font-mono text-[11px] font-black text-purple-primary">{score ? `${score.avg.toFixed(1)}%` : '—'}</div>
                    <div className="w-20 h-1 bg-text-faint/20 rounded-full relative overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: score ? `${score.avg}%` : '0%' }}
                        className="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-purple-primary to-purple-secondary"
                      />
                    </div>
                    {score?.history && score.history.length > 0 && (
                      <div className="flex gap-0.5 mt-1" title="Last 10 Resolutions Consistency">
                        {score.history.map((acc, idx) => (
                          <div 
                            key={idx}
                            className={`w-1 h-1 rounded-full ${
                              acc > 98 ? 'bg-green-accent' : acc > 90 ? 'bg-amber-accent' : 'bg-red-accent'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 text-right text-[10px] text-amber-accent tracking-[0.1em] font-mono">
                  <div className="flex items-center justify-end gap-3">
                    <span>{score ? '★'.repeat(score.stars) + '☆'.repeat(5 - score.stars) : '☆☆☆☆☆'}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHorizonScore(h.key);
                      }}
                      className="p-2.5 rounded-lg bg-red-accent/10 hover:bg-red-accent/30 text-red-accent transition-all border border-red-accent/20 active:scale-95"
                      title="Clear this horizon"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default ScoreboardTable;
