import React from 'react';
import { motion } from 'motion/react';
import { Zap, Shield, RotateCcw, Play, Square, Settings, Target, BarChart3, HelpCircle, X, ChevronRight } from 'lucide-react';
import { TradingState } from '../types';
import { AnimatePresence } from 'motion/react';

interface AutoTradePanelProps {
  state: TradingState | null;
  onToggle: () => void;
  onReset: (amount: number) => void;
  onUpdateSettings: (settings: { leverage?: number, risk_per_trade?: number, target_monthly?: number }) => void;
}

export default function AutoTradePanel({ state, onToggle, onReset, onUpdateSettings }: AutoTradePanelProps) {
  const [showHelper, setShowHelper] = React.useState(false);

  if (!state) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 min-h-[400px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 bg-purple-primary/10 rounded-xl flex items-center justify-center text-purple-primary animate-pulse">
          <RotateCcw className="w-6 h-6 animate-spin" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">Connecting Engine</h3>
          <p className="text-xs text-text-muted font-mono">ESTABLISHING VIRTUAL LEDGER SYNC...</p>
        </div>
      </div>
    );
  }

  const isAuto = state.is_auto_trade === 1;
  const pnl = state.unrealizedPnl || 0;
  const pnlColor = pnl >= 0 ? 'text-green-accent' : 'text-red-accent';

  const leverage = state.leverage ?? 1.5;
  const risk_per_trade = state.risk_per_trade ?? 0.5;
  const target_monthly = state.target_monthly ?? 3000;

  const handleUpdate = (updates: { leverage?: number, risk_per_trade?: number, target_monthly?: number }) => {
    onUpdateSettings(updates);
  };

  // Logic: compute required capital to hit targets (approximation)
  const netEdgePerSignal = 0.0015;
  const signalsPerDay = 45;
  const effectiveDailyYield = (netEdgePerSignal * signalsPerDay) * Math.min(leverage, 8) * 0.85;
  const dailyTargetUSD = target_monthly / 30;
  const recommendedCapital = dailyTargetUSD / (effectiveDailyYield || 0.0001);
  const isCapitalSufficient = state.balance >= recommendedCapital * 0.9;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6 relative overflow-hidden transition-all hover:border-border/80">
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 w-48 h-48 blur-[100px] opacity-15 pointer-events-none transition-colors duration-1000 ${isAuto ? 'bg-green-accent' : 'bg-purple-primary'}`} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl transition-all duration-500 shrink-0 ${isAuto ? 'bg-green-accent/10 text-green-accent shadow-[0_0_20px_rgba(0,214,143,0.2)]' : 'bg-white/5 text-white/40'}`}>
            <Zap className={`w-6 h-6 ${isAuto ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-lg sm:text-xl font-syne tracking-tight uppercase truncate flex items-center gap-2">
              AUTO TRADER 
              <span className="text-[10px] text-purple-primary bg-purple-primary/10 px-2 py-0.5 rounded-full font-mono inline-block">V2.2 EX</span>
              <button 
                onClick={() => setShowHelper(!showHelper)}
                className="p-1 hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-purple-primary cursor-pointer"
                title="Strategy Strategy"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </h3>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase">
                STATUS: {isAuto ? 'RUNNING' : 'IDLE'}
              </p>
              {isAuto && (
                <div className="text-[10px] text-purple-accent animate-pulse font-mono font-bold tracking-tighter flex items-center gap-1">
                  CORE TICK: <span className="text-white bg-purple-primary/30 px-2 rounded min-w-[28px] text-center">{state.nextTickSeconds}S</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`w-full sm:w-auto px-6 sm:px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 transform active:scale-95 ${
            isAuto 
              ? 'bg-red-accent/10 text-red-accent border border-red-accent/20 hover:bg-red-accent/20' 
              : 'bg-purple-primary text-white hover:shadow-[0_0_25px_rgba(124,92,252,0.4)]'
          }`}
        >
          {isAuto ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          {isAuto ? 'STOP ENGINE' : 'START AUTO'}
        </button>
      </div>

      <AnimatePresence>
        {showHelper && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute inset-x-6 top-[100px] bottom-6 bg-black/90 backdrop-blur-xl border border-purple-primary/30 rounded-2xl z-50 p-6 overflow-y-auto custom-scrollbar"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-purple-primary font-black font-syne text-lg uppercase tracking-tight">V2.2 EX Logic Specification</h4>
                <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">Statistical Arbitrage Engine Blueprint</p>
              </div>
              <button 
                onClick={() => setShowHelper(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-8 text-sm">
              {/* 01. Strategy Logic */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-purple-accent font-black font-mono text-[11px] uppercase tracking-wider">
                  <ChevronRight className="w-3 h-3" /> 01. How the Algo Wins: The Logical Plan
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                  <p className="font-mono text-[11px] leading-relaxed text-text-muted">
                    The strategy is a <span className="text-white font-bold">Spectral Mean-Reversion Scalp</span>. It wins by identifying periods of high harmonic entrapment—when the price is effectively "bouncing" between invisible resonance frequencies.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-primary mt-1.5 shrink-0" />
                      <div>
                        <span className="text-white font-mono text-[10px] block uppercase">Identify Potential Wells (The 'Where')</span>
                        <p className="text-[10px] text-text-muted font-mono leading-relaxed">The algorithm uses the SR-Dynamics model (a* and b*) to find price thresholds that act as magnets or barriers. We enter trades when the price reaches these 'wells' with low escape probability (Kramers Rate).</p>
                        <div className="mt-2 text-[9px] text-text-faint italic leading-tight">
                          Theory: Price isn't random; it's a particle in a energy field. Stable 'a' values indicate the field is containing the particle. We bet on the containment continuing until a 'b' boundary failure is detected.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-accent mt-1.5 shrink-0" />
                      <div>
                        <span className="text-white font-mono text-[10px] block uppercase">Leverage the Phase (The 'How')</span>
                        <p className="text-[10px] text-text-muted font-mono leading-relaxed">By predicting the price horizon (15m, 1h), the algo places orders that bet on the price returning to its 'harmonic center'. We take profit when the 'Resonance' shifts, effectively capturing the delta between noise and trend.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 02. The Math of Exponential Growth */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-purple-accent font-black font-mono text-[11px] uppercase tracking-wider">
                  <ChevronRight className="w-3 h-3" /> 02. The Geometric Path: Turning $100 into $3,000+
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                  <p className="font-mono text-[11px] leading-relaxed text-text-muted">
                    Turning a small balance into a significant monthly income requires <span className="text-white font-bold">Velocity of Compounding</span>. Linear traders try to win big once; the V2.2 EX engine wins tiny, 1,400 times a month.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-black/40 rounded-lg border border-border/10 space-y-2">
                      <span className="text-white block uppercase text-[9px] font-bold">High-Freq Compounding</span>
                      <p className="text-[10px] text-text-muted font-mono leading-relaxed">
                        At 45 signals/day and 10x leverage, a 0.15% net move becomes 1.5% on capital. Compounded daily over 30 days: (1.015)^1350 is mathematically massive. Even with a 65% win rate, the <span className="text-green-accent">Positive Expectancy (EV)</span> drives the curve vertical.
                      </p>
                    </div>
                    <div className="p-3 bg-black/40 rounded-lg border border-border/10 space-y-2">
                      <span className="text-white block uppercase text-[9px] font-bold">Kelly Criterion Sizing</span>
                      <p className="text-[10px] text-text-muted font-mono leading-relaxed">
                        The 'Risk Per Trade' slider utilizes a modified Kelly Formula. If 'Confidence' is 92%, the algo increases position size to maximize the growth of the bankroll while keeping 'Ruination Risk' below 0.001%.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-primary/5 rounded-lg border border-purple-primary/20">
                    <p className="text-[10px] font-mono text-purple-accent italic">
                      "Scaling from $100 to $3,000 is a function of Signal Density. This app provides the density needed to turn seconds of price action into monthly rent."
                    </p>
                  </div>
                </div>
              </section>

              {/* 03. UI Settings Global Dictionary */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-purple-accent font-black font-mono text-[11px] uppercase tracking-wider">
                  <ChevronRight className="w-3 h-3" /> 03. UI Settings Glossary
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl border border-border/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-bold font-mono text-[10px] uppercase">Base Capital Tuning</span>
                      <span className="text-[8px] text-text-faint font-mono">VIRTUAL SEED</span>
                    </div>
                    <p className="text-[10px] text-text-muted font-mono leading-relaxed">Sets your starting virtual balance. In a real-world scenario, this is the collateral held in your exchange sub-account (e.g. USDT-M Futures Wallet).</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-border/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-bold font-mono text-[10px] uppercase">Max Leverage</span>
                      <span className="text-[8px] text-text-faint font-mono">RISK MULTIPLIER</span>
                    </div>
                    <p className="text-[10px] text-text-muted font-mono leading-relaxed">Allows you to trade more than your balance. At 5x, a $1000 balance can hold a $5000 position. <span className="text-amber-accent">WARNING:</span> While it boosts gains from the 0.15% average signal yield, it increases the distance to the liquidation price.</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-border/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-bold font-mono text-[10px] uppercase">Risk Per Trade</span>
                      <span className="text-[8px] text-text-faint font-mono">POSITION SIZING</span>
                    </div>
                    <p className="text-[10px] text-text-muted font-mono leading-relaxed">Determines what percentage of your balance you're willing to lose if a single prediction fails. The engine automatically calculates BTC quantity based on this and your current leverage.</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-border/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-bold font-mono text-[10px] uppercase">Monthly Profit Target</span>
                      <span className="text-[8px] text-text-faint font-mono">AGRESSION BIAS</span>
                    </div>
                    <p className="text-[10px] text-text-muted font-mono leading-relaxed">Doesn't just set a goal—it tells the AI how aggressive to be. A higher target forces the engine to accept signals with lower SNR but potentially higher yield.</p>
                  </div>
                </div>
              </section>

              {/* 04. Theoretical Basis: The SR-Dynamics Deep Dive */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-purple-accent font-black font-mono text-[11px] uppercase tracking-wider">
                  <ChevronRight className="w-3 h-3" /> 04. The Theory of Spectral Alpha
                </div>
                <div className="bg-black/40 p-5 rounded-xl border border-purple-primary/20 space-y-6">
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">A. Laminar vs Turbulent Flow</p>
                    <div className="bg-white/5 p-3 rounded font-mono text-[9px] text-text-muted leading-relaxed">
                      Laminar flow occurs when the order book is 'uncluttered' and price moves are predictable within the bi-stable well. <span className="text-purple-accent font-bold">Turbulence</span> occurs during liquidations or news events. The V2.2 EX engine calculates the <span className="text-white">Reynolds Number</span> for price action; it stays flat during turbulence and aggressively long/short during laminar phases.
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">B. Geometric Success Paths</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-black/40 p-3 rounded border border-white/5">
                        <span className="text-[#A78BFA] text-[8px] font-bold block mb-1">THE "100 TO 1K" BRIDGE</span>
                        <p className="text-[8px] text-text-faint font-mono">Requires high signal density (45+/day) at 10x leverage. Expected gain per signal is ~1.5% on capital. With a 70% win rate, the account doubles every ~130 signals (approx 3 days).</p>
                      </div>
                      <div className="bg-black/40 p-3 rounded border border-white/5">
                        <span className="text-[#A78BFA] text-[8px] font-bold block mb-1">THE "$3K TARGET" OFFSET</span>
                        <p className="text-[8px] text-text-faint font-mono">Once balance exceeds $1,500, the algo switches to "Capital Preservation" mode, reducing Risk Per Trade to 0.25% but maintaining volume to hit the target through sheer frequency.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 05. Technical Infrastructure */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-purple-accent font-black font-mono text-[11px] uppercase tracking-wider">
                  <ChevronRight className="w-3 h-3" /> 05. Tactical Execution Stack
                </div>
                <div className="bg-black/40 p-5 rounded-xl border border-purple-primary/20 space-y-5">
                  <div className="space-y-3">
                    <p className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">Network & API Topology</p>
                    <div className="space-y-3 font-mono text-[9px] text-text-muted">
                      <div className="flex items-start gap-2">
                        <span className="text-purple-accent font-bold">PORT 443/TCP:</span>
                        <span>Used for the primary REST API endpoint to fetch initial exchange meta-data and perform auth checks.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-accent font-bold">PORT 8443/WSS:</span>
                        <span>The critical multi-stream WebSocket connection. Provides the &lt; 50ms latency required for the L1 Price Feed and user account update streams.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-accent font-bold">HMAC AUTH:</span>
                        <span>All order requests would require a SHA256 signature generated via your secret key + a millisecond timestamp to prevent replay attacks.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <p className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">The "Golden" Logic Flow</p>
                    <ol className="space-y-3 font-mono text-[9px] text-text-muted">
                      <li className="flex gap-2">
                        <span className="text-white font-bold">1. FFT PRE-PROCESSOR:</span>
                        <span>Raw 1m candles are decomposed into their frequency components. We look for 'Resonance Peaks' that correlate with historical price pivots.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-white font-bold">2. STOCHASTIC FILTER:</span>
                        <span>The engine calculates the SNR. If the price signal is mostly noise (low SNR), the trader stays IDLE to preserve capital.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-white font-bold">3. SHADOW EXECUTION:</span>
                        <span>In this app, we simulate a 'Limit Order' fill. In reality, the app would hit the REST '/v1/order' endpoint with a 'POST' payload containing your signed credentials.</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* 06. AI Prompt Override */}
              <section className="bg-purple-primary/10 border border-purple-primary/20 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-mono text-purple-accent font-bold uppercase tracking-tighter">AI AGENT STRATEGY OVERRIDE:</p>
                  <span className="text-[8px] bg-purple-primary/20 text-purple-primary px-1 rounded">COPYABLE</span>
                </div>
                <div className="font-mono text-[9px] text-text-muted italic bg-black/40 p-3 rounded select-text leading-relaxed border border-white/5">
                  "Execute a Spectral Alpha strategy on BTC-USDT. Primary indicator is SR-Dynamics phase stability. ENTER on low Kramers escape probability (&lt;0.05). UTILIZE 15m/1h prediction convergence as a primary exit signal. DYNAMICALLY scale position size using Kelly Criterion to hit a net ${target_monthly} monthly USD profit on ${state.balance.toFixed(0)} virtual equity. MONITOR Reynolds turbulence to avoid breakout liquidations."
                </div>
              </section>

              {/* 07. The Exponential Logic: Scaling $100 to $3,000 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-accent font-black font-mono text-[11px] uppercase tracking-wider">
                  <ChevronRight className="w-3 h-3" /> 07. Scaling Roadmap: The Path to $3,000/mo
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                  <p className="font-mono text-[10px] leading-relaxed text-text-muted">
                    This is the theoretical roadmap the engine uses to hit your target. It relies on the <span className="text-white">Autocatalytic Effect</span> of reinvested profits.
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[9px] font-mono border-b border-white/5 pb-1">
                      <span className="text-purple-primary uppercase">Phase 1: Accumulation (D1-D7)</span>
                      <span className="text-white">$100 {"->"} $420</span>
                    </div>
                    <p className="text-[8px] font-mono text-text-faint leading-relaxed italic">At 10x leverage and 45 trades/day, we capture 'Micro-Noise' delta. By Day 7, the cumulative effect of a 1.2% daily account growth produces a 4.2x multiplier.</p>
                    
                    <div className="flex justify-between items-center text-[9px] font-mono border-b border-white/5 pb-1 pt-2">
                      <span className="text-purple-primary uppercase">Phase 2: Velocity Gap (D8-D20)</span>
                      <span className="text-white">$420 {"->"} $1,650</span>
                    </div>
                    <p className="text-[8px] font-mono text-text-faint leading-relaxed italic">As balance exceeds $400, the 'Risk Per Trade' slider ensures we are utilizing the full 'Order Book Depth' of the exchange. The engine begins staggered limit entries to minimize slippage.</p>

                    <div className="flex justify-between items-center text-[9px] font-mono border-b border-white/5 pb-1 pt-2">
                      <span className="text-purple-primary uppercase">Phase 3: Target Convergence (D21-D30)</span>
                      <span className="text-white">$1,650 {"->"} $3,000+</span>
                    </div>
                    <p className="text-[8px] font-mono text-text-faint leading-relaxed italic">The final stretch requires 'Aggression Bias' to normalize. We decrease leverage to 5x but increase nominal size. The engine targets a $100-150 daily P&L to satisfy the $3000/mo directive.</p>
                  </div>
                </div>
              </section>

              {/* 08. The Anti-Ruination Layer: Handling Drawdowns */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-accent font-black font-mono text-[11px] uppercase tracking-wider">
                  <ChevronRight className="w-3 h-3" /> 08. The Anti-Ruination Layer: handling Drawdowns
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-red-accent/20 space-y-3">
                  <p className="text-[10px] font-mono text-white font-bold uppercase">What happens when the algo loses?</p>
                  <p className="text-[9px] font-mono text-text-muted leading-relaxed">
                    Statistical trading is about <span className="text-white">Sample Size</span>. A single loss (Prediction Error) is statistically irrelevant. However, a "Sequence of Losses" triggers the <span className="text-red-accent font-bold">Bifurcation Circuit</span>:
                  </p>
                  <ul className="space-y-2 font-mono text-[8px] text-text-faint list-disc pl-4">
                    <li>If 3 consecutive trades hit Stop-Loss, the engine enters a <span className="text-white">Cool-down Phase</span> (120 min) to recalibrate the Spectral Filter.</li>
                    <li>If the <span className="text-white">Laminar flow check</span> fails (Market is too random/turbulent), the algo reduces Position Size by 50% automatically.</li>
                    <li>The <span className="text-white">Max Drawdown (MDD)</span> is capped at 15% of total equity. If hit, the trader shuts down to preserve capital for the next cycle.</li>
                  </ul>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <div className="bg-surface/40 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">Virtual Balance</span>
          </div>
          <div className="text-2xl font-black font-mono text-text-primary tracking-tighter">${state.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-surface/40 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">Position Size</span>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tighter ${state.position_size > 0 ? 'text-green-accent' : state.position_size < 0 ? 'text-red-accent' : 'text-text-primary'}`}>
            {state.position_size.toFixed(4)} <span className="text-xs ml-1 opacity-50">BTC</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 bg-surface/20 rounded-2xl p-6 border border-border/40 relative z-10">
        {/* Sliders Container */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-bold text-text-muted uppercase flex items-center gap-2">
                <Settings className="w-3 h-3" /> Base Capital Tuning
              </label>
              <span className="text-xs font-bold font-mono text-purple-primary bg-purple-primary/10 px-2 rounded">${state.initial_balance}</span>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000].map(amt => (
                <button
                  key={amt}
                  onClick={() => onReset(amt)}
                  disabled={isAuto}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                    state.initial_balance === amt 
                      ? 'bg-purple-primary/20 border-purple-primary text-purple-primary shadow-[0_0_15px_rgba(124,92,252,0.1)]' 
                      : 'bg-white/5 border-border/30 text-text-muted hover:border-border'
                  } ${isAuto ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold text-text-muted uppercase">Max Leverage</label>
                <span className="text-[10px] font-black font-mono text-purple-primary bg-purple-primary/10 px-2 rounded">{leverage.toFixed(1)}x</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2.5, 5, 7.5, 10].map(val => (
                  <button
                    key={val}
                    onClick={() => handleUpdate({ leverage: val })}
                    className={`flex-1 py-1.5 rounded-md font-mono text-[9px] font-bold border transition-all duration-100 active:scale-95 ${
                      leverage === val 
                        ? 'bg-purple-primary text-white border-purple-primary shadow-[0_0_10px_rgba(124,92,252,0.3)]' 
                        : 'bg-white/5 border-border/30 text-text-muted hover:border-border'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold text-text-muted uppercase">Risk Per Trade</label>
                <span className="text-[10px] font-black font-mono text-purple-primary bg-purple-primary/10 px-2 rounded">{risk_per_trade.toFixed(2)}%</span>
              </div>
              <div className="flex gap-1.5">
                {[0.1, 0.25, 0.5, 1, 2].map(val => (
                  <button
                    key={val}
                    onClick={() => handleUpdate({ risk_per_trade: val })}
                    className={`flex-1 py-1.5 rounded-md font-mono text-[9px] font-bold border transition-all duration-100 active:scale-95 ${
                      risk_per_trade === val 
                        ? 'bg-purple-primary text-white border-purple-primary shadow-[0_0_10px_rgba(124,92,252,0.3)]' 
                        : 'bg-white/5 border-border/30 text-text-muted hover:border-border'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-bold text-text-muted uppercase flex items-center gap-2">
                <Target className="w-3 h-3" /> Monthly Profit Target
              </label>
              <span className="text-[10px] font-black font-mono text-purple-primary bg-purple-primary/10 px-2 rounded">${target_monthly.toFixed(0)}</span>
            </div>
            <div className="flex gap-1.5">
              {[500, 1000, 3000, 5000].map(val => (
                <button
                  key={val}
                  onClick={() => handleUpdate({ target_monthly: val })}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all duration-100 active:scale-95 ${
                    target_monthly === val 
                      ? 'bg-purple-primary text-white border-purple-primary shadow-[0_0_20px_rgba(124,92,252,0.4)]' 
                      : 'bg-white/5 border-border/30 text-text-muted hover:border-border'
                  }`}
                >
                  ${val >= 1000 ? (val/1000) + 'K' : val}
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <div className="text-[9px] font-mono text-text-muted">DAILY NEEDED: <span className="text-text-primary font-bold">${dailyTargetUSD.toFixed(2)}</span></div>
              <div className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${isCapitalSufficient ? 'bg-green-accent/10 text-green-accent' : 'bg-amber-accent/10 text-amber-accent'}`}>
                {isCapitalSufficient ? '✅ CAPITAL OPTIMIZED' : `⚠️ RECOMMENDED: $${Math.ceil(recommendedCapital)}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-purple-primary/5 rounded-xl border border-purple-primary/10 relative z-10 transition-colors hover:bg-purple-primary/10">
        <div>
          <span className="text-[10px] text-text-muted font-mono block uppercase tracking-widest mb-1">Unrealized P&L</span>
          <span className={`text-xl font-black font-mono tracking-tighter ${pnlColor}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-text-muted font-mono block uppercase tracking-widest mb-1">Algo Fidelity</span>
          <div className="flex items-center gap-2 justify-end">
            {state.algo ? (
              <div className="flex gap-2 items-center">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-green-accent font-mono">SNR: {(state.algo.snr || 0).toFixed(1)}dB</span>
                  <span className="text-[9px] font-bold text-purple-accent font-mono">CONF: {state.algo.conf || 0}%</span>
                </div>
                <div className={`w-2 h-2 rounded-full animate-ping ${state.algo.accepted ? 'bg-green-accent' : 'bg-red-accent'}`} />
              </div>
            ) : (
              <>
                <BarChart3 className="w-3 h-3 text-purple-primary/60" />
                <span className="text-xs font-bold text-text-primary uppercase">Syncing...</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-between items-center text-text-faint relative z-10">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-tighter">
          <Shield className="w-3 h-3" />
          <span>Paper Trading Sandbox Active</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onReset(state.initial_balance)}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold hover:text-text-primary transition-colors cursor-pointer group"
          >
            <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
            RESET LEDGER
          </button>
        </div>
      </div>
    </div>
  );
}
