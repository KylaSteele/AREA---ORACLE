import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Trash2, Copy } from 'lucide-react';
import { ResolvedPrediction } from '../types';

interface VerificationTerminalProps {
  resolvedPredictions: ResolvedPrediction[];
  clearLogs: () => void;
  copyToClipboard: (text: string) => void;
  deleteResolvedPrediction: (id: string) => void;
  formatPrecisePrice: (price: number) => string;
}

const VerificationTerminal = memo(function VerificationTerminal({
  resolvedPredictions,
  clearLogs,
  copyToClipboard,
  deleteResolvedPrediction,
  formatPrecisePrice
}: VerificationTerminalProps) {
  // Group predictions by resolution time
  const grouped = resolvedPredictions.reduce((acc, r) => {
    if (!acc[r.resolvedAt]) acc[r.resolvedAt] = [];
    acc[r.resolvedAt].push(r);
    return acc;
  }, {} as Record<string, ResolvedPrediction[]>);

  const sortedTimes = Object.keys(grouped).sort((a, b) => {
    // Reverse chronological order
    return b.localeCompare(a);
  });

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 relative z-30">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
          <Terminal size={14} />
          <span>Verification Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={clearLogs}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-accent/5 hover:bg-red-accent/10 border border-red-accent/20 rounded-lg font-mono text-[9px] text-red-accent transition-all"
            title="Clear Logs & Receipts"
          >
            <Trash2 size={16} />
            CLEAR TERMINAL
          </button>
          <button 
            onClick={() => {
              const text = resolvedPredictions.map(r => 
                `[${r.resolvedAt}] ${r.label} VERIFICATION\n` +
                `EXCHANGE: ${r.source}\n` +
                `BASE: $${formatPrecisePrice(r.baselinePrice)}\n` +
                `TIME: ${r.predictedAt}\n` +
                `PRED: $${formatPrecisePrice(r.predicted)}\n` +
                `ACTUAL: $${formatPrecisePrice(r.actual)}\n` +
                `ACCURACY: ${r.accuracy.toFixed(6)}%`
              ).join('\n\n');
              copyToClipboard(`DOLYN VERIFICATION RECEIPTS:\n\n${text}`);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface/50 hover:bg-surface border border-border/30 rounded-lg font-mono text-[9px] text-text-muted hover:text-white transition-all transition-colors"
          >
            <Copy size={10} />
            COPY RECEIPTS
          </button>
        </div>
      </div>
      <div className="bg-black/40 rounded-2xl p-6 font-mono text-[10px] leading-relaxed border border-border/20 max-h-[400px] overflow-y-auto custom-scrollbar">
        {resolvedPredictions.length === 0 ? (
          <div className="text-text-faint italic">Waiting for first resonance resolution...</div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence initial={false}>
              {sortedTimes.map((time) => (
                <motion.div 
                  key={time}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/20" />
                    <div className="text-purple-accent font-black tracking-widest text-[9px] uppercase">
                      Resolution Batch: {time}
                    </div>
                    <div className="h-px flex-1 bg-border/20" />
                  </div>
                  
                  <div className="space-y-4">
                    {grouped[time].map((r) => (
                      <motion.div 
                        key={r.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="border-l-2 border-purple-primary/30 pl-4 py-1 relative group/receipt bg-white/5 rounded-r-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-purple-accent font-bold uppercase tracking-tighter">{r.label} VERIFICATION</div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const text = `[${r.resolvedAt}] ${r.label} VERIFICATION\n` +
                                `EXCHANGE: ${r.source}\n` +
                                `BASE: $${formatPrecisePrice(r.baselinePrice)}\n` +
                                `TIME: ${r.predictedAt}\n` +
                                `PRED: $${formatPrecisePrice(r.predicted)}\n` +
                                `ACTUAL: $${formatPrecisePrice(r.actual)}\n` +
                                `ACCURACY: ${r.accuracy.toFixed(6)}%`;
                              copyToClipboard(text);
                            }}
                            className="p-2 rounded-lg bg-surface/50 hover:bg-surface text-text-muted hover:text-white transition-all border border-border/20"
                            title="Copy this receipt"
                          >
                            <Copy size={14} />
                          </button>
                          <button 
                            onClick={() => deleteResolvedPrediction(r.id)}
                            className="p-2 rounded-lg bg-red-accent/5 hover:bg-red-accent/15 text-red-accent transition-all border border-red-accent/10"
                            title="Delete this receipt"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-text-muted">
                          <div>BASE: <span className="text-white">${formatPrecisePrice(r.baselinePrice)}</span></div>
                          <div>TIME: <span className="text-white text-[8px]">{r.predictedAt}</span></div>
                          <div>PRED: <span className="text-purple-accent font-bold">${formatPrecisePrice(r.predicted)}</span></div>
                          <div>ACTUAL: <span className="text-white font-bold">${formatPrecisePrice(r.actual)}</span></div>
                          <div className="col-span-1 sm:col-span-2 mt-1">
                            ACCURACY: <span className={r.accuracy > 98 ? 'text-green-accent' : 'text-amber-accent'}>{r.accuracy.toFixed(6)}%</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
});

export default VerificationTerminal;
