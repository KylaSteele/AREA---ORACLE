/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';

interface SystemMonitorProps {
  atomicStatus: string;
  isWsConnected: boolean;
  lastHeartbeat: number;
  terminalMode: boolean;
  setTerminalMode: (v: boolean) => void;
  emergencyReset: () => void;
  AtomicClockSynced: boolean;
}

const SystemMonitor = memo(function SystemMonitor({ 
  atomicStatus, 
  isWsConnected, 
  lastHeartbeat, 
  terminalMode, 
  setTerminalMode, 
  emergencyReset,
  AtomicClockSynced
}: SystemMonitorProps) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
      <div className="bg-card/40 border border-border/40 rounded-xl p-2 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-text-muted uppercase">Atomic Clock</span>
          <div className={`w-1.5 h-1.5 rounded-full ${AtomicClockSynced ? 'bg-green-accent shadow-[0_0_5px_var(--color-green-accent)]' : 'bg-red-accent'}`}></div>
        </div>
        <div className="font-mono text-[9px] text-white truncate">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
        <div className="font-mono text-[7px] text-text-faint uppercase">{atomicStatus}</div>
      </div>
      <div className="bg-card/40 border border-border/40 rounded-xl p-2 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-text-muted uppercase">Data Stream</span>
          <div className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-green-accent shadow-[0_0_5px_var(--color-green-accent)]' : 'bg-amber-accent'}`}></div>
        </div>
        <div className="font-mono text-[9px] text-white">{isWsConnected ? 'WEBSOCKET' : 'REST CLUSTER'}</div>
        <div className="font-mono text-[7px] text-text-faint">HB: {((Date.now() - lastHeartbeat)/1000).toFixed(1)}s</div>
      </div>
      <div className="bg-card/40 border border-border/40 rounded-xl p-2 flex flex-col gap-1 cursor-pointer hover:bg-surface/40 transition-colors" onClick={() => setTerminalMode(!terminalMode)}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-text-muted uppercase">Terminal</span>
          <div className={`w-1.5 h-1.5 rounded-full ${terminalMode ? 'bg-purple-accent shadow-[0_0_5px_var(--color-purple-accent)]' : 'bg-text-faint'}`}></div>
        </div>
        <div className="font-mono text-[9px] text-white">{terminalMode ? 'ACTIVE' : 'INACTIVE'}</div>
        <div className="font-mono text-[7px] text-text-faint">SCANLINES: {terminalMode ? 'ON' : 'OFF'}</div>
      </div>
      <div className="bg-card/40 border border-border/40 rounded-xl p-2 flex flex-col gap-1 cursor-pointer hover:bg-red-accent/10 transition-colors" onClick={emergencyReset}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-text-muted uppercase">Integrity</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-accent"></div>
        </div>
        <div className="font-mono text-[9px] text-white">HARD RESET</div>
        <div className="font-mono text-[7px] text-text-faint">KILL SWITCH</div>
      </div>
    </section>
  );
});

export default SystemMonitor;
