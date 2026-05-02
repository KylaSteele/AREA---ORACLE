/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { Bitcoin } from 'lucide-react';

interface HeaderProps {
  currency: 'USD' | 'CAD';
  setCurrency: (c: 'USD' | 'CAD') => void;
}

const Header = memo(function Header({ currency, setCurrency }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-linear-to-br from-purple-primary to-pink-accent rounded-2xl flex items-center justify-center font-mono font-bold text-white shadow-[0_8px_24px_rgba(124,92,252,0.4)]">
          <Bitcoin size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">AERA</h1>
          <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase">Resonance Engine · Redundant Signal</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-surface/50 p-1 rounded-xl border border-border/30">
          <button 
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1 rounded-lg font-mono text-[9px] font-bold transition-all ${currency === 'USD' ? 'bg-purple-primary text-white' : 'text-text-muted hover:text-white'}`}
          >
            USD
          </button>
          <button 
            onClick={() => setCurrency('CAD')}
            className={`px-3 py-1 rounded-lg font-mono text-[9px] font-bold transition-all ${currency === 'CAD' ? 'bg-purple-primary text-white' : 'text-text-muted hover:text-white'}`}
          >
            CAD
          </button>
        </div>
      </div>
    </header>
  );
});

export default Header;
