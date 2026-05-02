import React, { useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, ChevronDown, ChevronUp, X, Maximize2, Minimize2 } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'algo';
}

interface AlgoTerminalProps {
  logs: LogEntry[];
  onClear: () => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  algoState: any; // Add algoState to show live metrics
}

type TerminalTab = 'ALL' | 'CORE' | 'CLAY' | 'SR' | 'PROJECTION';

const AlgoTerminal = memo(function AlgoTerminal({ logs, onClear, isOpen, setIsOpen, algoState }: AlgoTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TerminalTab>('ALL');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  const filteredLogs = React.useMemo(() => {
    if (activeTab === 'ALL') return logs;
    return logs.filter(log => {
      if (activeTab === 'CORE') return log.message.includes('CORE_SIGNAL') || log.message.includes('SYSTEM');
      if (activeTab === 'CLAY') return log.message.includes('CLAY_DECODE') || log.message.includes('PEAKS');
      if (activeTab === 'SR') return log.message.includes('RESONANCE') || log.message.includes('KRAMERS');
      if (activeTab === 'PROJECTION') return log.message.includes('COMMIT') || log.message.includes('REFRESH') || log.message.includes('TARGET');
      return true;
    });
  }, [logs, activeTab]);

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 p-4 bg-black/80 border border-green-accent/30 rounded-full text-green-accent shadow-[0_0_20px_rgba(0,255,143,0.2)] hover:scale-110 transition-all z-50 backdrop-blur-xl"
    >
      <Terminal size={20} />
    </button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        height: isExpanded ? '85vh' : '500px',
        width: isExpanded ? '95vw' : '550px'
      }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 bg-black/95 border border-green-accent/20 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.6)] z-50 flex flex-col overflow-hidden backdrop-blur-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-green-accent" />
          <span className="font-mono text-[10px] font-black text-green-accent uppercase tracking-[0.2em]">Algo Core Terminal</span>
          <div className="flex gap-1 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-white/5 bg-black/20 p-1 gap-1">
        {(['ALL', 'CORE', 'CLAY', 'SR', 'PROJECTION'] as TerminalTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 font-mono text-[8px] uppercase font-black tracking-widest rounded-lg transition-all ${
              activeTab === tab 
                ? 'bg-green-accent/20 text-green-accent border border-green-accent/30' 
                : 'text-text-muted hover:bg-white/5 hover:text-text-faint'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Live Metrics Bar */}
      {algoState && (
        <div className="bg-white/5 border-b border-white/5">
          <div className="grid grid-cols-4 gap-px">
            <div className="p-2 flex flex-col">
              <span className="font-mono text-[7px] text-text-faint uppercase">SNR</span>
              <span className="font-mono text-[10px] text-green-accent font-bold">{algoState.snr?.toFixed(2)} dB</span>
            </div>
            <div className="p-2 flex flex-col">
              <span className="font-mono text-[7px] text-text-faint uppercase">dH Dist</span>
              <span className={`font-mono text-[10px] font-bold ${algoState.dH === 0 ? 'text-green-accent' : 'text-amber-accent'}`}>{algoState.dH}</span>
            </div>
            <div className="p-2 flex flex-col">
              <span className="font-mono text-[7px] text-text-faint uppercase">Kramers</span>
              <span className="font-mono text-[10px] text-blue-accent font-bold">{algoState.kramers?.toFixed(5)}</span>
            </div>
            <div className="p-2 flex flex-col">
              <span className="font-mono text-[7px] text-text-faint uppercase">Bullish</span>
              <span className="font-mono text-[10px] text-purple-accent font-bold">{(algoState.bullFrac * 100)?.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Tab Specific Live Data */}
          <div className="px-2 pb-2 grid grid-cols-2 gap-2">
            {activeTab === 'CLAY' && algoState.clayCode && (
              <div className="col-span-2 p-1.5 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                <span className="font-mono text-[7px] text-text-faint uppercase">GF(27) Codeword:</span>
                <span className="font-mono text-[9px] text-green-accent font-bold tracking-widest">
                  [{algoState.clayCode.join(', ')}]
                </span>
              </div>
            )}
            {activeTab === 'SR' && (
              <>
                <div className="p-1.5 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-[7px] text-text-faint uppercase">a (Linear):</span>
                  <span className="font-mono text-[9px] text-blue-accent font-bold">{algoState.a?.toFixed(4)}</span>
                </div>
                <div className="p-1.5 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-[7px] text-text-faint uppercase">b (Non-Lin):</span>
                  <span className="font-mono text-[9px] text-blue-accent font-bold">{algoState.b?.toFixed(4)}</span>
                </div>
              </>
            )}
            {activeTab === 'CORE' && (
              <>
                <div className="p-1.5 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-[7px] text-text-faint uppercase">Sigma (Noise):</span>
                  <span className="font-mono text-[9px] text-amber-accent font-bold">{algoState.sigma?.toFixed(6)}</span>
                </div>
                <div className="p-1.5 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-[7px] text-text-faint uppercase">Stability:</span>
                  <span className={`font-mono text-[9px] font-bold ${algoState.accepted ? 'text-green-accent' : 'text-red-accent'}`}>
                    {algoState.accepted ? 'STABLE' : 'UNSTABLE'}
                  </span>
                </div>
              </>
            )}
            {activeTab === 'PROJECTION' && (
              <>
                <div className="p-1.5 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-[7px] text-text-faint uppercase">Macro Trend:</span>
                  <span className="font-mono text-[9px] text-blue-accent font-bold">{(algoState.macroTrend || 0).toFixed(8)}</span>
                </div>
                <div className="p-1.5 bg-black/40 rounded border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-[7px] text-text-faint uppercase">P(Trans):</span>
                  <span className="font-mono text-[9px] text-amber-accent font-bold">{(algoState.pTrans * 100)?.toFixed(2)}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Log Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed custom-scrollbar bg-black/40"
      >
        <div className="space-y-1">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex gap-3 group">
              <span className="text-text-faint opacity-40 shrink-0">[{log.timestamp}]</span>
              <span className={`
                ${log.type === 'algo' ? 'text-green-accent' : ''}
                ${log.type === 'success' ? 'text-blue-accent' : ''}
                ${log.type === 'warning' ? 'text-amber-accent' : ''}
                ${log.type === 'error' ? 'text-red-accent' : ''}
                ${log.type === 'info' ? 'text-text-muted' : ''}
                break-all
              `}>
                <span className="opacity-50 mr-1">{log.type === 'algo' ? 'λ' : '>'}</span>
                {log.message}
              </span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
              <Terminal size={40} className="mb-4" />
              <p className="uppercase tracking-[0.3em] font-black">No {activeTab} Data Stream</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Status */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-green-accent animate-pulse" />
            <span className="font-mono text-[8px] text-green-accent/70 uppercase">Core Active</span>
          </div>
          <button 
            onClick={onClear}
            className="font-mono text-[8px] text-text-faint hover:text-white uppercase transition-colors"
          >
            Clear Buffer ({logs.length})
          </button>
        </div>
        <div className="font-mono text-[8px] text-text-faint uppercase">
          Dolyn OS v2.5.0
        </div>
      </div>
    </motion.div>
  );
});

export default AlgoTerminal;
