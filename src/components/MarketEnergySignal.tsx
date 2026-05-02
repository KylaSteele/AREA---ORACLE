/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { motion } from 'motion/react';
import { Activity, Copy, Power } from 'lucide-react';

interface MarketEnergySignalProps {
  dataStream: string;
  setDataStream: (v: any) => void;
  signal: any;
  resonanceData: number[];
  countdown: number;
  addLog: (msg: string, type?: any) => void;
  copyToClipboard: (text: string) => void;
  showMarketEnergy: boolean;
  setShowMarketEnergy: (v: boolean) => void;
}

const MarketEnergySignal = memo(function MarketEnergySignal({
  dataStream,
  setDataStream,
  signal,
  resonanceData,
  countdown,
  addLog,
  copyToClipboard,
  showMarketEnergy,
  setShowMarketEnergy
}: MarketEnergySignalProps) {
  return (
    <section className="bg-card border border-border rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
          <Activity size={14} />
          <span>Market Energy Signal</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowMarketEnergy(!showMarketEnergy)}
            className={`p-1.5 rounded-lg transition-colors ${showMarketEnergy ? 'bg-purple-primary/20 text-purple-primary' : 'bg-surface text-text-muted hover:text-white'}`}
            title={showMarketEnergy ? "Turn OFF Signal Display" : "Turn ON Signal Display"}
          >
            <Power size={12} />
          </button>
          <button 
            onClick={() => {
              if (!signal) return;
              const text = `MARKET ENERGY SIGNAL:\n` +
                `- Stability (a*): ${signal.a.toFixed(6)}\n` +
                `- Resistance (b*): ${signal.b.toFixed(6)}\n` +
                `- SNR: ${signal.snr.toFixed(2)} dB\n` +
                `- Kramers: ${signal.kramers.toFixed(8)}\n` +
                `- Confidence: ${signal.conf.toFixed(2)}%\n` +
                `- Flip Chance: ${(signal.pTrans * 100).toFixed(4)}%`;
              copyToClipboard(text);
            }}
            className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
            title="Copy signal data"
          >
            <Copy size={12} />
          </button>
          <select 
            value={dataStream}
            onChange={(e) => {
              const val = e.target.value as any;
              setDataStream(val);
              addLog(`Switching data stream to ${val}`, 'purple' as any);
            }}
            className="bg-surface/50 border border-border/30 rounded-lg px-2 py-1 font-mono text-[9px] text-white focus:outline-none focus:border-purple-primary"
          >
            <option value="BINANCE_WS">BINANCE WS</option>
            <option value="BINANCE_REST">BINANCE REST</option>
            <option value="COINBASE_REST">COINBASE REST</option>
          </select>
        </div>
      </div>
      
      {showMarketEnergy ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
          <div className="flex flex-col items-center justify-center p-6 bg-surface/30 rounded-[24px] border border-border/20 relative">
            <div className="absolute top-4 left-4 font-mono text-[7px] text-text-muted uppercase">Potential Well</div>
            
            {/* Double-Well Potential Visualization */}
            <div className="relative h-24 w-full mb-4">
              <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                <path 
                  d={(() => {
                    const a = signal?.a || 1.3;
                    const b = signal?.b || 0.15;
                    let d = "M 0 20";
                    for (let x = -10; x <= 10; x += 0.5) {
                      const y = - (a / 2) * (x * x) + (b / 4) * Math.pow(x, 4);
                      const screenX = (x + 10) * 5;
                      const screenY = 20 + y * 2;
                      d += ` L ${screenX} ${screenY}`;
                    }
                    return d;
                  })()}
                  fill="none"
                  stroke="rgba(124,92,252,0.3)"
                  strokeWidth="1"
                />
                {signal && signal.xHistory && signal.xHistory.length > 0 && (
                  <motion.circle 
                    initial={{ 
                      cx: (signal.xHistory[signal.xHistory.length - 1] + 10) * 5,
                      cy: 20 + (-(signal.a / 2) * Math.pow(signal.xHistory[signal.xHistory.length - 1], 2) + (signal.b / 4) * Math.pow(signal.xHistory[signal.xHistory.length - 1], 4)) * 2
                    }}
                    animate={{ 
                      cx: (signal.xHistory[signal.xHistory.length - 1] + 10) * 5,
                      cy: 20 + (-(signal.a / 2) * Math.pow(signal.xHistory[signal.xHistory.length - 1], 2) + (signal.b / 4) * Math.pow(signal.xHistory[signal.xHistory.length - 1], 4)) * 2
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    r="2"
                    fill="var(--color-purple-accent)"
                    className="shadow-[0_0_10px_var(--color-purple-accent)]"
                  />
                )}
              </svg>
              <div className="flex justify-between mt-1 px-2">
                <span className="font-mono text-[6px] text-red-accent uppercase">Bear</span>
                <span className="font-mono text-[6px] text-green-accent uppercase">Bull</span>
              </div>
            </div>

            <div className="font-mono text-[10px] text-text-muted mt-2 tracking-widest uppercase">
              {signal ? `${Math.min(99.9, signal.conf).toFixed(1)}% CONF` : 'SYNCING...'}
            </div>
          </div>
          
          <div className="h-full flex flex-col gap-4">
            <div className="flex-1 bg-surface/50 rounded-2xl border border-border/30 relative overflow-hidden p-2">
              <div className="absolute top-2 left-2 font-mono text-[7px] text-text-muted uppercase z-10">Resonance History</div>
              <div className="flex items-end h-full gap-0.5 pt-4">
                {resonanceData.map((v, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 ${v > 0 ? 'bg-purple-primary' : 'bg-pink-accent'}`}
                    style={{ 
                      height: `${Math.min(100, Math.abs(v) * 10)}%`,
                      opacity: 0.3 + (i / resonanceData.length) * 0.7
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-surface/30 rounded-xl border border-border/20 flex justify-between items-center">
                <span className="font-mono text-[7px] text-text-muted uppercase">SNR</span>
                <span className="font-mono text-[10px] font-bold text-white">{signal?.snr?.toFixed(2) || '0.00'} dB</span>
              </div>
              <div className="p-2 bg-surface/30 rounded-xl border border-border/20 flex justify-between items-center">
                <span className="font-mono text-[7px] text-text-muted uppercase">Kramers</span>
                <span className="font-mono text-[10px] font-bold text-white">{signal?.kramers?.toFixed(5) || '0.00000'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-surface/10 rounded-2xl border border-dashed border-border/30">
          <div className="flex items-center gap-4">
            <Power size={20} className="text-text-faint" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-text-faint uppercase tracking-widest">Energy Signal Offline</span>
              <p className="text-[8px] text-text-muted font-mono">Visual data stream suspended.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowMarketEnergy(true)}
            className="px-6 py-2 bg-purple-primary/10 text-purple-primary rounded-xl font-mono text-[9px] font-bold uppercase hover:bg-purple-primary/20 transition-all"
          >
            Re-Initialize
          </button>
        </div>
      )}
      
      {showMarketEnergy && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/30 pt-6">
            <div className="text-center">
              <div className="font-mono text-[9px] text-text-muted uppercase mb-1">Stability (a*)</div>
              <div className="font-mono text-sm font-black text-white">{signal?.a?.toFixed(4) || '0.0000'}</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[9px] text-text-muted uppercase mb-1">Resistance (b*)</div>
              <div className="font-mono text-sm font-black text-white">{signal?.b?.toFixed(4) || '0.0000'}</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[9px] text-text-muted uppercase mb-1">Next Update</div>
              <div className="font-mono text-sm font-black text-amber-accent">{(countdown || 0).toFixed(1)}s</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-surface/30 rounded-xl border border-border/20 flex justify-between items-center">
              <span className="font-mono text-[8px] text-text-muted uppercase">Data Health</span>
              <span className={`font-mono text-xs font-bold ${signal?.accepted ? 'text-green-accent' : 'text-red-accent'}`}>
                {signal?.accepted ? 'STABLE' : 'NOISY'}
              </span>
            </div>
            <div className="p-3 bg-surface/30 rounded-xl border border-border/20 flex justify-between items-center">
              <span className="font-mono text-[8px] text-text-muted uppercase">Flip Chance</span>
              <span className="font-mono text-xs font-bold text-purple-accent">
                {(signal?.pTrans * 100).toFixed(2) || '0.00'}%
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
});

export default MarketEnergySignal;
