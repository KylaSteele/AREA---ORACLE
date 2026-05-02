/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { Activity, TrendingUp, TrendingDown, Copy } from 'lucide-react';
import Sparkline from './Sparkline';

interface PricePulseCardProps {
  currency: 'USD' | 'CAD';
  microPrice: number | null;
  lastPrice: number | null;
  exchangeRate: number;
  priceChange: number;
  signal: any;
  sparkData: number[];
  showLivePrice: boolean;
  showPriceLine: boolean;
  setShowPriceLine: (v: boolean) => void;
  copyToClipboard: (text: string) => void;
}

const PricePulseCard = memo(function PricePulseCard({
  currency,
  microPrice,
  lastPrice,
  exchangeRate,
  priceChange,
  signal,
  sparkData,
  showLivePrice,
  showPriceLine,
  setShowPriceLine,
  copyToClipboard
}: PricePulseCardProps) {
  const currentPrice = (microPrice ? (currency === 'USD' ? microPrice : microPrice * exchangeRate) : (currency === 'USD' ? lastPrice : lastPrice! * exchangeRate));
  const formattedPrice = currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—';

  return (
    <section className={`bg-card border border-border rounded-[32px] p-8 relative overflow-hidden transition-all duration-500 shadow-2xl ${signal?.direction === 'LONG' ? 'shadow-green-accent/5' : signal?.direction === 'SHORT' ? 'shadow-red-accent/5' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
          <Activity size={14} />
          <span>Live Price Pulse</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowPriceLine(!showPriceLine)}
            className={`p-1.5 rounded-lg transition-colors ${showPriceLine ? 'bg-purple-primary/20 text-purple-primary' : 'bg-surface text-text-muted hover:text-white'}`}
            title={showPriceLine ? "Hide Price Line" : "Show Price Line"}
          >
            <Activity size={12} className={showPriceLine ? "animate-pulse" : ""} />
          </button>
          <button 
            onClick={() => copyToClipboard(`${currency === 'USD' ? '$' : 'C$'}${formattedPrice} ${currency}`)}
            className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
            title="Copy current price"
          >
            <Copy size={12} />
          </button>
          <div className="font-mono text-[10px] text-purple-accent font-bold">SUPER-FAST SYNC</div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4">
        <div>
          <span className={`text-4xl md:text-6xl font-black tracking-tighter text-white leading-none transition-all duration-300 ${showLivePrice ? 'opacity-100 blur-0' : 'opacity-20 blur-md'}`}>
            {currency === 'USD' ? '$' : 'C$'}{formattedPrice}
          </span>
          <span className="text-lg font-bold text-text-muted ml-3">{currency}</span>
        </div>
        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-mono text-sm font-bold border transition-all duration-500 ${priceChange >= 0 ? 'bg-green-accent/10 text-green-accent border-green-accent/25' : 'bg-red-accent/10 text-red-accent border-red-accent/25'}`}>
            {priceChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(4)}%
          </div>
          {signal && (
            <div className="font-mono text-[9px] text-text-muted bg-surface/50 px-2 py-1 rounded-lg border border-border/30">
              VOL: {(signal.sigma * 100).toFixed(4)}%
            </div>
          )}
        </div>
      </div>

      {showPriceLine && (
        <div className="mt-4 bg-surface/30 rounded-2xl p-4 border border-border/30">
          <Sparkline data={sparkData} />
        </div>
      )}
    </section>
  );
});

export default PricePulseCard;
