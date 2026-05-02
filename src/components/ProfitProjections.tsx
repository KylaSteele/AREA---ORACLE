import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Clock, Info, BarChart3 } from 'lucide-react';
import { ProjectionMetric } from '../types';

interface ProfitProjectionsProps {
  projections: ProjectionMetric[];
  algo?: {
    snr: number;
    conf: number;
    accepted: boolean;
  } | null;
}

export default function ProfitProjections({ projections, algo }: ProfitProjectionsProps) {
  const isHighConfidence = algo && algo.snr > 10 && algo.conf > 70;

  const formatCompact = (val: number) => {
    if (val >= 1000000000) return (val / 1000000000).toFixed(2) + 'B';
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 100000) return (val / 1000).toFixed(1) + 'K';
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className={`bg-card border border-border rounded-xl p-6 space-y-6 flex flex-col justify-between transition-all duration-500 ${isHighConfidence ? 'shadow-[0_0_40px_rgba(124,92,252,0.15)] border-purple-primary/30' : ''}`}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 transition-colors ${isHighConfidence ? 'text-green-accent' : 'text-purple-primary'}`} />
            <h3 className="font-bold text-sm font-syne uppercase tracking-wider text-text-primary">Growth Projections</h3>
          </div>
          <div className="text-[10px] text-text-muted font-mono flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              <BarChart3 className="w-3 h-3" />
              <span>SR-DYNAMICS ENGINE V2.2</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isHighConfidence ? 'bg-green-accent shadow-[0_0_5px_#00d68f]' : 'bg-purple-primary'}`} />
              <span className={`transition-colors ${isHighConfidence ? 'text-green-accent font-bold' : ''}`}>
                {isHighConfidence ? 'HIGH FIDELITY' : 'LIVE SYNC'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {projections.map((proj, idx) => (
            <motion.div
              key={proj.label}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02, duration: 0.1 }}
              className={`bg-surface/30 border rounded-xl p-3 sm:p-4 transition-all duration-200 hover:bg-surface/50 group ${
                isHighConfidence ? 'border-green-accent/20' : 'border-border/40'
              } hover:border-purple-primary/30`}
            >
              <div className="text-[10px] text-text-muted font-mono uppercase mb-2 group-hover:text-purple-accent transition-colors">{proj.label} Horizon</div>
              <div className={`font-black text-text-primary mb-1 tracking-tighter truncate ${
                (proj.value || 0) > 1000000 ? 'text-base' : 'text-lg'
              }`}>
                ${formatCompact(proj.value || 0)}
              </div>
              <div className={`text-[10px] font-mono font-bold flex items-center gap-1 ${(proj.profit || 0) >= 0 ? 'text-green-accent' : 'text-red-accent'}`}>
                {(proj.profit || 0) >= 0 ? '▲' : '▼'} {(proj.pct || 0).toFixed(proj.pct > 1000 ? 0 : 1)}%
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="bg-purple-primary/5 rounded-xl p-4 border border-purple-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-primary" />
            <span className="text-[10px] font-black font-mono text-purple-primary uppercase">Edge Analysis</span>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed font-medium">
            Projections are calculated using a net 0.15% edge per signal after accounting for average transaction fees and 0.05% slippage. The model assumes high-frequency execution (42-45 signals/day) across the selected resonance windows.
          </p>
        </div>
        
        <div className="flex items-center justify-between text-[9px] text-text-faint font-mono uppercase tracking-widest">
          <span>Simulation Mode: Active</span>
          <span className="animate-pulse">Engine Syncing...</span>
        </div>
      </div>
    </div>
  );
}
