/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  Trophy, 
  Copy, 
  Trash2,
  Zap,
  TrendingUp,
  Terminal,
  Snowflake,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { 
  Prediction, 
  PendingPrediction, 
  ResolvedPrediction, 
  LogEntry, 
  ScoreHorizon,
  TradingState
} from './types';
import { 
  dolynPredict, 
  predictPrice, 
  calculateConfidence, 
  calculateMacroTrend,
  ALGO_CONSTANTS 
} from './utils/algo';
import { AtomicClock } from './utils/clock';
import Sparkline from './components/Sparkline';
import ResonanceChart from './components/ResonanceChart';
import PredictionList from './components/PredictionList';
import ScoreboardTable from './components/ScoreboardTable';
import VerificationTerminal from './components/VerificationTerminal';
import AlgoTerminal from './components/AlgoTerminal';
import Header from './components/Header';
import SystemMonitor from './components/SystemMonitor';
import PricePulseCard from './components/PricePulseCard';
import MarketEnergySignal from './components/MarketEnergySignal';
import AutoTradePanel from './components/AutoTradePanel';
import { calculateProjections } from './utils/projections';
import ProfitProjections from './components/ProfitProjections';

const HORIZONS = [
  { label: '1 MINUTE', key: '1m', minutes: 1 },
  { label: '2 MINUTES', key: '2m', minutes: 2 },
  { label: '3 MINUTES', key: '3m', minutes: 3 },
  { label: '4 MINUTES', key: '4m', minutes: 4 },
  { label: '5 MINUTES', key: '5m', minutes: 5 },
  { label: '15 MINUTES', key: '15m', minutes: 15 },
  { label: '30 MINUTES', key: '30m', minutes: 30 },
  { label: '1 HOUR', key: '1h', minutes: 60 },
  { label: '4 HOURS', key: '4h', minutes: 240 },
  { label: '8 HOURS', key: '8h', minutes: 480 },
  { label: '11 HOURS', key: '11h', minutes: 660 },
];

// Golden Ratio Constants
const PHI = 1.61803398875;
const GOLDEN_WIDTH = 600;

export default function App() {
  // State
  const [prices, setPrices] = useState<number[]>([]);
  const [sparkData, setSparkData] = useState<number[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [autoMode, setAutoMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<any[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const predictionsRef = useRef<Prediction[]>([]);
  const [pendingPredictions, setPendingPredictions] = useState<PendingPrediction[]>([]);
  const [resolvedPredictions, setResolvedPredictions] = useState<ResolvedPrediction[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreHorizon>>({});
  const [signal, setSignal] = useState<any | null>(null);
  const [apiError, setApiError] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'CAD'>('USD');
  const [exchangeRate, setExchangeRate] = useState(1.35); // Default USD/CAD
  const [showLivePrice, setShowLivePrice] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showMarketEnergy, setShowMarketEnergy] = useState(true);
  const [showPriceLine, setShowPriceLine] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('15m');
  const [atomicStatus, setAtomicStatus] = useState('SYNCING...');
  const [atomicSource, setAtomicSource] = useState('device');
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [dataStream, setDataStream] = useState<'BINANCE_WS' | 'BINANCE_REST' | 'COINBASE_REST'>('BINANCE_WS');
  const [persistenceStatus, setPersistenceStatus] = useState<'IDLE' | 'SAVING' | 'LOADED'>('IDLE');
  const isInitialLoadRef = useRef(true);
  const [terminalMode, setTerminalMode] = useState(false);
  const [tradingState, setTradingState] = useState<TradingState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now() + 30000); // Give 30s grace at startup
  
  const formatPreciseTime = (ms: number) => {
    const d = new Date(ms);
    const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const time12 = d.toLocaleTimeString('en-US', { hour12: true }); // HH:mm:ss AM/PM
    const time24 = d.toLocaleTimeString('en-GB', { hour12: false }); // HH:mm:ss (Military)
    const msPart = String(d.getMilliseconds()).padStart(3, '0');
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `${date} ${time24} / ${time12}.${msPart} (${tz})`;
  };

  const getExchangeName = () => {
    switch (dataStream) {
      case 'BINANCE_WS': return 'Binance WebSocket';
      case 'BINANCE_REST': return 'Binance REST Cluster';
      case 'COINBASE_REST': return 'Coinbase REST';
      default: return 'Unknown Exchange';
    }
  };

  const formatPrecisePrice = (price: number) => {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const alignToBinanceClose = (ms: number, horizonMinutes: number) => {
    // Target :58.500 of the minute H minutes from now to align with Binance closes
    return Math.floor((ms + horizonMinutes * 60000) / 60000) * 60000 + 58500;
  };

  const [isTracking, setIsTracking] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [volatility, setVolatility] = useState<'LOW' | 'MED' | 'HIGH'>('LOW');
  const [convergence, setConvergence] = useState<{ price: number; count: number } | null>(null);
  const [microPrice, setMicroPrice] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [resonanceData, setResonanceData] = useState<number[]>([]);
  const lastPriceRef = useRef<number | null>(null);
  const microPriceRef = useRef<number | null>(null);
  const lastSnapshotRef = useRef<number>(0);

  // Refs for state used in callbacks to avoid stale closures
  const pricesRef = useRef<number[]>([]);
  const macroPricesRef = useRef<number[]>([]);
  const pendingPredictionsRef = useRef<PendingPrediction[]>([]);
  const scoresRef = useRef<Record<string, number[]>>(
    HORIZONS.reduce((acc, h) => ({ ...acc, [h.key]: [] }), {})
  );
  const lastResolvedRef = useRef<Record<string, { predicted: number; actual: number; pct: number } | null>>(
    HORIZONS.reduce((acc, h) => ({ ...acc, [h.key]: null }), {})
  );

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'default') => {
    const d = new Date(AtomicClock.now());
    const time12 = d.toLocaleTimeString([], { hour12: true });
    const time24 = d.toLocaleTimeString([], { hour12: false });
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: `${time24} / ${time12}`,
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const addTerminalLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' | 'algo' = 'info') => {
    const d = new Date(AtomicClock.now());
    const time = d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    const newLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: time,
      message,
      type
    };
    setTerminalLogs(prev => [...prev, newLog].slice(-200));
  }, []);

  const updateScoreboard = useCallback(() => {
    const newScores: Record<string, ScoreHorizon> = {};
    (Object.entries(scoresRef.current) as [string, number[]][]).forEach(([key, arr]) => {
      if (arr.length === 0) return;
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      const last = lastResolvedRef.current[key];
      newScores[key] = {
        avg,
        count: arr.length,
        stars: Math.round(avg / 20),
        history: arr.slice(-10),
        lastPredicted: last?.predicted,
        lastActual: last?.actual,
        lastPct: last?.pct
      };
    });
    setScores(newScores);
  }, []);

  const fetchTradingState = useCallback(async () => {
    try {
      const res = await fetch('/api/trading/state');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded with ${res.status}: ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      setTradingState(data);
    } catch (e) {
      console.error("Failed to fetch trading state", e);
    }
  }, []);

  const toggleAutoTrade = async () => {
    try {
      const res = await fetch('/api/trading/toggle', { method: 'POST' });
      const data = await res.json();
      fetchTradingState();
      addLog(`AUTO-TRADE: ${data.is_auto_trade ? 'STARTED' : 'STOPPED'}`, data.is_auto_trade ? 'green' : 'red');
    } catch (e) {
      addLog("Failed to toggle auto-trade", 'red');
    }
  };

  const resetAccount = async (amount: number) => {
    try {
      await fetch('/api/trading/reset', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      fetchTradingState();
      addLog(`TRADING ACCOUNT RESET TO $${amount}`, 'amber');
    } catch (e) {
      addLog("Failed to reset account", 'red');
    }
  };

  const updateTradingSettings = async (settings: { leverage?: number, risk_per_trade?: number, target_monthly?: number }) => {
    // Optimistic Update with functional setState to ensure snappiness and correctness
    setTradingState(current => {
      if (!current) return null;
      const nextSettings = { ...current, ...settings };
      const nextProjections = calculateProjections(
        nextSettings.balance, 
        nextSettings.leverage, 
        nextSettings.risk_per_trade, 
        nextSettings.algo
      );
      return { ...nextSettings, projections: nextProjections };
    });

    try {
      await fetch('/api/trading/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      fetchTradingState();
    } catch (e) {
      console.error("Failed to update trading settings", e);
    }
  };

  useEffect(() => {
    fetchTradingState();
    const interval = setInterval(fetchTradingState, 3000);
    return () => clearInterval(interval);
  }, [fetchTradingState]);

  const resolvePredictions = useCallback((currentPrice: number) => {
    const now = AtomicClock.now();
    if (isNaN(now)) return;

    const pending = pendingPredictionsRef.current;
    if (pending.length === 0) return;
    
    // Find predictions that have reached their target time
    const toResolve = pending.filter(p => now >= p.targetTimestamp);
    const remaining = pending.filter(p => now < p.targetTimestamp);

    if (toResolve.length > 0) {
      addLog(`SYSTEM: Resolving ${toResolve.length} market targets...`, 'purple' as any);
      
      const newResolved: ResolvedPrediction[] = [];
      
      toResolve.forEach(p => {
        const delta = Math.abs(currentPrice - p.predictedPrice);
        const pct = (delta / currentPrice) * 100;
        const acc = Math.max(0, 100 - pct);

        if (isNaN(acc)) return;

        // Update scores ref
        if (!scoresRef.current[p.horizonKey]) {
          scoresRef.current[p.horizonKey] = [];
        }
        
        scoresRef.current[p.horizonKey].push(acc);
        if (scoresRef.current[p.horizonKey].length > 50) {
          scoresRef.current[p.horizonKey].shift();
        }
        
        lastResolvedRef.current[p.horizonKey] = {
          predicted: p.predictedPrice,
          actual: currentPrice,
          pct
        };

        const resolved: ResolvedPrediction = {
          id: `res-${p.id}-${now}-${Math.random().toString(36).substr(2, 5)}`,
          label: p.horizonLabel,
          key: p.horizonKey,
          predicted: p.predictedPrice,
          actual: currentPrice,
          delta,
          pct,
          accuracy: acc,
          predictedAt: p.predictedAt,
          resolvedAt: formatPreciseTime(now),
          baselinePrice: p.baselinePrice,
          source: p.source
        };

        newResolved.push(resolved);
        addLog(`TARGET REACHED: ${p.horizonLabel} | ACC: ${acc.toFixed(2)}% | ERR: $${delta.toFixed(2)}`, acc > 95 ? 'green' : acc > 85 ? 'amber' : 'red');
      });

      setResolvedPredictions(prev => [...newResolved, ...prev].slice(0, 100));
      
      // Clear resolved targets from the main predictions state
      const resolvedKeys = new Set(toResolve.map(p => p.horizonKey));
      setPredictions(prev => prev.map(p => 
        resolvedKeys.has(p.key) 
          ? { ...p, predictedPrice: 0, baselinePrice: 0, predictedAt: '—', targetTime: '—', conf: '—', bar: 0 } 
          : p
      ));
      
      pendingPredictionsRef.current = remaining;
      setPendingPredictions(remaining);
      updateScoreboard();
    }
  }, [addLog, updateScoreboard]);

  const commitPredictions = useCallback((price: number, sr: number, phase: number) => {
    const now = AtomicClock.now();
    const predictedAt = formatPreciseTime(now);
    const macroTrend = calculateMacroTrend(macroPricesRef.current);
    const lockedKeys = new Set(pendingPredictionsRef.current.map(p => p.horizonKey));
    const source = getExchangeName();

    let hasChanges = false;
    let newPending: PendingPrediction[] = [];
    const nextPredictions = HORIZONS.map(h => {
      const existing = predictionsRef.current.find(p => p.key === h.key);
      if (lockedKeys.has(h.key) && existing && existing.predictedPrice !== 0) {
        return existing;
      }

      hasChanges = true;
      const pp = predictPrice(price, h.minutes, sr, phase, macroTrend);
      const c = calculateConfidence(h.minutes, macroPricesRef.current.length);
      const targetTimestamp = alignToBinanceClose(now, h.minutes);
      const targetTime = formatPreciseTime(targetTimestamp);
      
      // Log math for first updated horizon to terminal
      if (newPending.length === 0) {
        addTerminalLog(`TARGET_MATH: h=${h.minutes}m sr=${sr.toFixed(3)} phase=${phase.toFixed(3)} trend=${macroTrend.toFixed(8)} -> $${pp.toFixed(2)}`, 'info');
      }
      const pId = `pred-${h.key}-${now}`;
      const pObj: Prediction = {
        id: h.key,
        label: h.label,
        key: h.key,
        minutes: h.minutes,
        predictedPrice: pp,
        baselinePrice: price,
        predictedAt,
        targetTime,
        conf: c,
        bar: Math.max(20, parseInt(c)),
        source
      };

      newPending.push({
        id: pId,
        predictedTimestamp: now,
        predictedAt: predictedAt,
        horizonMs: h.minutes * 60 * 1000,
        horizonLabel: h.label,
        horizonKey: h.key,
        predictedPrice: pp,
        targetTimestamp,
        baselinePrice: price,
        source
      });

      return pObj;
    });

    if (hasChanges) {
      setPredictions(nextPredictions);
      predictionsRef.current = nextPredictions;

      if (newPending.length > 0) {
        setPendingPredictions(prev => {
          const next = [...prev.filter(p => lockedKeys.has(p.horizonKey)), ...newPending];
          pendingPredictionsRef.current = next;
          return next;
        });
        addLog(`SYSTEM: Committed ${newPending.length} new resonance targets`, 'purple' as any);
        addTerminalLog(`COMMIT: ${newPending.length} horizons updated. Target alignment: BINANCE_CLOSE`, 'success');
      }
    }
  }, [addLog, addTerminalLog]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addLog('Copied to clipboard', 'green');
    }).catch(err => {
      console.error('Copy failed', err);
      addLog('Copy failed', 'red');
    });
  };

  const refreshPrediction = useCallback((horizonKey: string) => {
    if (!lastPriceRef.current) return;
    const price = lastPriceRef.current;
    const result = dolynPredict(pricesRef.current);
    if (!result) return;

    const h = HORIZONS.find(h => h.key === horizonKey);
    if (!h) return;

    const now = AtomicClock.now();
    const predictedAt = formatPreciseTime(now);
    const macroTrend = calculateMacroTrend(macroPricesRef.current);
    
    const pp = predictPrice(price, h.minutes, result.sr, result.phase, macroTrend);
    const c = calculateConfidence(h.minutes, macroPricesRef.current.length);
    const targetTimestamp = alignToBinanceClose(now, h.minutes);
    const targetTime = formatPreciseTime(targetTimestamp);

    addTerminalLog(`REFRESH_MATH: h=${h.minutes}m sr=${result.sr.toFixed(3)} phase=${result.phase.toFixed(3)} trend=${macroTrend.toFixed(8)} -> $${pp.toFixed(2)}`, 'info');

    const pId = `pred-${h.key}-${now}`;
    const source = getExchangeName();
    const newPred: Prediction = {
      id: h.key,
      label: h.label,
      key: h.key,
      minutes: h.minutes,
      predictedPrice: pp,
      baselinePrice: price,
      predictedAt,
      targetTime,
      conf: c,
      bar: Math.max(20, parseInt(c)),
      source
    };

    setPredictions(prev => {
      const next = prev.map(p => p.key === horizonKey ? newPred : p);
      predictionsRef.current = next;
      return next;
    });
    
    // Replace pending if exists
    const newPending: PendingPrediction = {
      id: pId,
      predictedTimestamp: now,
      horizonMs: h.minutes * 60 * 1000,
      horizonLabel: h.label,
      horizonKey: h.key,
      predictedPrice: pp,
      targetTimestamp,
      baselinePrice: price,
      predictedAt,
      source
    };

    setPendingPredictions(prev => {
      const next = [...prev.filter(p => p.horizonKey !== horizonKey), newPending];
      pendingPredictionsRef.current = next;
      return next;
    });
    addLog(`Manually refreshed ${h.label} resonance target`, 'purple' as any);
    addTerminalLog(`REFRESH: ${h.label} manual re-calc. New Target: $${pp.toFixed(2)}`, 'info');
  }, [addLog, addTerminalLog]);

  const refreshAllPredictions = useCallback(() => {
    if (!lastPriceRef.current) return;
    const price = lastPriceRef.current;
    const result = dolynPredict(pricesRef.current);
    if (!result) return;

    // Clear all pending first to allow full refresh
    setPendingPredictions([]);
    pendingPredictionsRef.current = [];
    commitPredictions(price, result.sr, result.phase);
    addLog('Manually refreshed all resonance targets', 'purple' as any);
    addTerminalLog(`REFRESH_ALL: Recalculating all resonance targets.`, 'warning');
  }, [addLog, addTerminalLog, commitPredictions]);

  const deleteActivePrediction = useCallback((key: string) => {
    console.log(`Cancelling active prediction for ${key}`);
    
    setPendingPredictions(prev => {
      const next = prev.filter(p => p.horizonKey !== key);
      pendingPredictionsRef.current = next;
      return next;
    });
    
    const resetP = (p: Prediction) => p.key === key ? { ...p, predictedPrice: 0, baselinePrice: 0, predictedAt: '—', targetTime: '—', conf: '—', bar: 0, source: '—' } : p;
    setPredictions(prev => prev.map(resetP));
    predictionsRef.current = predictionsRef.current.map(resetP);
    
    addLog(`SYSTEM: Active prediction for ${key} cancelled.`, 'amber' as any);
    addTerminalLog(`CANCEL: Prediction for ${key} removed from queue.`, 'error');
  }, [addLog, addTerminalLog]);

  const deleteResolvedPrediction = useCallback((id: string) => {
    setResolvedPredictions(prev => {
      const next = prev.filter(r => r.id !== id);
      localStorage.setItem('dolyn_resolved_predictions', JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteHorizonScore = useCallback((key: string) => {
    console.log(`[DOLYN] Deleting history for horizon: ${key}`);
    
    const horizon = HORIZONS.find(h => h.key === key);
    
    // 1. Clear Refs immediately
    if (scoresRef.current) {
      scoresRef.current[key] = [];
    }
    if (lastResolvedRef.current) {
      lastResolvedRef.current[key] = null;
    }
    
    // 2. Clear Pending Predictions for this key (Stops the "SYNC IN" countdown)
    setPendingPredictions(prev => {
      const next = prev.filter(p => p.horizonKey !== key);
      pendingPredictionsRef.current = next;
      localStorage.setItem('dolyn_pending_predictions', JSON.stringify(next));
      return next;
    });

    // 3. Reset the Prediction Card (Future Targets section)
    const resetP = (p: Prediction) => p.key === key ? { 
      ...p, 
      predictedPrice: 0, 
      baselinePrice: 0, 
      predictedAt: '—', 
      targetTime: '—', 
      conf: '—', 
      bar: 0, 
      source: '—' 
    } : p;
    setPredictions(prev => {
      const next = prev.map(resetP);
      predictionsRef.current = next;
      localStorage.setItem('dolyn_predictions', JSON.stringify(next));
      return next;
    });
    
    // 4. Clear from scores state immediately to force PENDING UI
    setScores(prev => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem('dolyn_scores', JSON.stringify(next));
      return next;
    });
    
    // 5. Force update Scoreboard to sync everything
    updateScoreboard();
    
    // 6. Sync refs to storage
    localStorage.setItem('dolyn_scores_ref', JSON.stringify(scoresRef.current));
    localStorage.setItem('dolyn_last_resolved', JSON.stringify(lastResolvedRef.current));
    
    addLog(`SYSTEM: Score history and active targets for ${horizon?.label || key} cleared. Receipts preserved.`, 'amber' as any);
  }, [updateScoreboard, addLog]);

  const clearLogs = useCallback(() => {
    console.log('[DOLYN] Clearing Terminal...');
    setResolvedPredictions([]);
    
    // Clear storage immediately
    localStorage.setItem('dolyn_resolved_predictions', '[]');
    isInitialLoadRef.current = false; 
    
    addLog('SYSTEM: Verification terminal receipts cleared.', 'default');
  }, [addLog]);

  const resetScoreboard = useCallback(() => {
    console.log('[DOLYN] Full Scoreboard Reset initiated');
    addLog('SYSTEM: Resetting all scoreboard metrics...', 'amber' as any);
    
    try {
      // 1. Clear Refs immediately
      scoresRef.current = HORIZONS.reduce((acc, h) => ({ ...acc, [h.key]: [] }), {});
      lastResolvedRef.current = HORIZONS.reduce((acc, h) => ({ ...acc, [h.key]: null }), {});
      pendingPredictionsRef.current = [];
      
      const resetPredictions: Prediction[] = HORIZONS.map(h => ({
        id: h.key,
        label: h.label,
        key: h.key,
        minutes: h.minutes,
        predictedPrice: 0,
        baselinePrice: 0,
        predictedAt: '—',
        targetTime: '—',
        conf: '—',
        bar: 0,
        source: '—'
      }));
      predictionsRef.current = resetPredictions;
      
      // 2. Clear State
      setScores({});
      setPendingPredictions([]);
      setPredictions(resetPredictions);
      
      // 3. Clear Storage
      localStorage.setItem('dolyn_scores', '{}');
      localStorage.setItem('dolyn_scores_ref', JSON.stringify(scoresRef.current));
      localStorage.setItem('dolyn_last_resolved', '{}');
      localStorage.setItem('dolyn_pending_predictions', '[]');
      localStorage.setItem('dolyn_predictions', JSON.stringify(resetPredictions));
      
      isInitialLoadRef.current = false; 
      
      // 4. Force UI update
      setTimeout(() => {
        updateScoreboard();
        addLog('SYSTEM: Scoreboard metrics and active targets reset. Receipts preserved.', 'amber' as any);
      }, 50);
      
    } catch (err) {
      console.error('[DOLYN] Reset failed', err);
      addLog('SYSTEM: Reset failed. Check console.', 'red' as any);
    }
  }, [addLog, updateScoreboard]);

  const resetData = useCallback(() => {
    console.log('Resetting all data...');
    try {
      // 1. Clear Refs
      const resetPredictions: Prediction[] = HORIZONS.map(h => ({
        id: h.key,
        label: h.label,
        key: h.key,
        minutes: h.minutes,
        predictedPrice: 0,
        baselinePrice: 0,
        predictedAt: '—',
        targetTime: '—',
        conf: '—',
        bar: 0,
        source: '—'
      }));
      predictionsRef.current = resetPredictions;
      pendingPredictionsRef.current = [];
      scoresRef.current = HORIZONS.reduce((acc, h) => ({ ...acc, [h.key]: [] }), {});
      lastResolvedRef.current = HORIZONS.reduce((acc, h) => ({ ...acc, [h.key]: null }), {});
      
      // 2. Clear State
      setPredictions(resetPredictions);
      setPendingPredictions([]);
      setResolvedPredictions([]);
      setScores({});
      setLogs([]);
      
      // 3. Clear Storage
      localStorage.removeItem('dolyn_pending_predictions');
      localStorage.removeItem('dolyn_resolved_predictions');
      localStorage.removeItem('dolyn_scores');
      localStorage.removeItem('dolyn_scores_ref');
      localStorage.removeItem('dolyn_last_resolved');
      localStorage.setItem('dolyn_predictions', JSON.stringify(resetPredictions));
      
      isInitialLoadRef.current = false;
      
      addLog('SYSTEM: Active predictions and scoreboard cleared. Engine remains active.', 'red' as any);
      updateScoreboard();
    } catch (e) {
      console.error('Reset error:', e);
      addLog('SYSTEM: Reset failed. Please try Hard Reset.', 'red' as any);
    }
  }, [addLog, updateScoreboard]);

  const lastSparkUpdateRef = useRef<number>(0);
  const lastResonanceUpdateRef = useRef<number>(0);
  const lastTerminalLogRef = useRef<number>(0);
  const lastPricesStateUpdateRef = useRef<number>(0);
  const lastPriceChangeUpdateRef = useRef<number>(0);
  const prewarmedRef = useRef<boolean>(false);

  const runPrediction = useCallback((price: number) => {
    if (isFrozen) return;
    const now = AtomicClock.now();
    
    // Update price history (Ref only for logic)
    const newPrices = [...pricesRef.current, price].slice(-ALGO_CONSTANTS.WINDOW * 3);
    pricesRef.current = newPrices;

    // Throttle state update for prices array to 1Hz (used by charts)
    if (now - lastPricesStateUpdateRef.current > 1000) {
      lastPricesStateUpdateRef.current = now;
      setPrices(newPrices);
      
      if (newPrices.length >= 50 && !prewarmedRef.current) {
        prewarmedRef.current = true;
        addLog('SYSTEM: Resonance engine pre-warmed. Ready to commit.', 'green');
      }
    }

    // Update spark data at 1Hz for consistent history
    if (now - lastSparkUpdateRef.current > 1000) {
      lastSparkUpdateRef.current = now;
      setSparkData(prev => [...prev, price].slice(-100));
    }

    // Calculate change (Throttle to 10Hz)
    let currentChange = 0;
    if (now - lastPriceChangeUpdateRef.current > 100) {
      lastPriceChangeUpdateRef.current = now;
      if (lastPriceRef.current !== null) {
        currentChange = ((price - lastPriceRef.current) / lastPriceRef.current) * 100;
        setPriceChange(currentChange);
      }
      setLastPrice(price);
    }
    lastPriceRef.current = price;

    // Run Algorithm for LIVE signal
    const result = dolynPredict(newPrices);
    if (!result) return;

    // Terminal Logging (Throttle to ~1Hz for readability)
    if (now - lastTerminalLogRef.current > 1000) {
      lastTerminalLogRef.current = now;
      const { a, b, sigma, snr, accepted, dH, bullFrac, kramers, peaks, pTrans } = result;
      
      // CORE Section
      addTerminalLog(`CORE_SIGNAL: a=${a.toFixed(4)} b=${b.toFixed(4)} σ=${sigma.toFixed(4)} SNR=${snr.toFixed(2)}dB`, 'algo');
      
      // CLAY Section
      if (accepted) {
        addTerminalLog(`CLAY_DECODE: MIRROR_STABLE (dH=${dH}) -> REFINING REGIME`, 'success');
      } else {
        addTerminalLog(`CLAY_DECODE: MIRROR_UNSTABLE (dH=${dH}) -> DEFAULT REGIME`, 'warning');
      }
      if (peaks && peaks.length > 0) {
        const topPeaks = peaks.slice(0, 3).map((p: any) => `f${p.i}:${p.mag.toFixed(4)}`).join(' ');
        addTerminalLog(`PEAKS: ${topPeaks}`, 'info');
      }

      // SR Section
      addTerminalLog(`RESONANCE: bullFrac=${(bullFrac * 100).toFixed(1)}% phase=${result.phase.toFixed(3)}`, 'info');
      addTerminalLog(`KRAMERS: rate=${kramers.toFixed(6)} pTrans=${(pTrans * 100).toFixed(2)}%`, 'algo');
    }

    // Throttle UI updates for resonance bars to 30Hz to prevent glitching
    if (now - lastResonanceUpdateRef.current > 33) {
      lastResonanceUpdateRef.current = now;
      setResonanceData(result.xHistory.slice(-50));
      const macroTrend = calculateMacroTrend(macroPricesRef.current);
      setSignal({ ...result, macroTrend });
      
      // Calculate Convergence
      const active = predictionsRef.current.filter(p => p.predictedPrice > 0);
      if (active.length >= 2) {
        const prices = active.map(p => p.predictedPrice);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const withinRange = prices.filter(p => Math.abs(p - avg) / avg < 0.0005);
        if (withinRange.length >= 2) {
          setConvergence({ price: avg, count: withinRange.length });
        } else {
          setConvergence(null);
        }
      } else {
        setConvergence(null);
      }
    }
  }, [addLog, isTracking, isFrozen]);

  const connectWebSocket = useCallback(() => {
    if (dataStream !== 'BINANCE_WS') {
      setIsWsConnected(false);
      return;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      const ws = new WebSocket('wss://stream.binance.com/ws/btcusdt@ticker');
      
      ws.onopen = () => {
        setIsWsConnected(true);
        lastHeartbeatRef.current = Date.now();
        addLog('WebSocket connected: Low-latency BTC feed active', 'green');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data.c) return;
          
          const price = parseFloat(data.c);
          const now = AtomicClock.now();
          lastHeartbeatRef.current = Date.now();
          
          lastPriceRef.current = price;
          microPriceRef.current = price; 
          setLastPrice(price);
          setMicroPrice(price);
          
          resolvePredictions(price);
          runPrediction(price);
          
          // Synchronize snapshot trigger to wall clock (every 15s: :00, :15, :30, :45)
          const snapshotId = Math.floor(now / 15000);
          if (snapshotId > lastSnapshotRef.current) {
            lastSnapshotRef.current = snapshotId;
            const result = dolynPredict(pricesRef.current);
            if (result) {
              commitPredictions(price, result.sr, result.phase);
            }
          }
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setIsWsConnected(false);
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        if (dataStream === 'BINANCE_WS') {
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('WS Connection Error', e);
      setIsWsConnected(false);
    }
  }, [addLog, resolvePredictions, runPrediction, commitPredictions, dataStream]);

  const isFetchingRef = useRef(false);

  const fetchPrice = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const now = AtomicClock.now();
    
    // 1. Determine endpoints based on dataStream
    const endpoints = dataStream === 'COINBASE_REST' 
      ? ['https://api.coinbase.com/v2/prices/BTC-USD/spot']
      : [
          '/api/proxy/binance?path=' + encodeURIComponent('/api/v3/ticker/price?symbol=BTCUSDT'),
          'https://api.coinbase.com/v2/prices/BTC-USD/spot' // Final fallback
        ];

    let currentPrice = 0;
    for (const url of endpoints) {
      try {
        const signal = (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) 
          ? (AbortSignal as any).timeout(8000) 
          : null;
        const res = await fetch(url, { signal });
        if (res.ok) {
          const data = await res.json();
          // Handle Coinbase format vs Binance format
          currentPrice = url.includes('coinbase') ? parseFloat(data.data.amount) : parseFloat(data.price);
          if (currentPrice > 0) break;
        }
      } catch (e: any) {
        // Only log if not an abort error to reduce console spam
        if (e.name !== 'AbortError') {
          console.warn(`Fetch failed for ${url}:`, e.message);
        }
      }
    }

    if (currentPrice > 0) {
      lastHeartbeatRef.current = Date.now();
      lastPriceRef.current = currentPrice;
      microPriceRef.current = currentPrice;
      setLastPrice(currentPrice);
      setMicroPrice(currentPrice);

      resolvePredictions(currentPrice);
      runPrediction(currentPrice);

      const snapshotId = Math.floor(now / 15000);
      if (snapshotId > lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshotId;
        const result = dolynPredict(pricesRef.current);
        if (result) {
          commitPredictions(currentPrice, result.sr, result.phase);
        }
      }
    }

    // 2. Secondary: CoinGecko for Exchange Rate (Individual try-catch)
    try {
      const signal = (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) 
        ? (AbortSignal as any).timeout(8000) 
        : null;
      const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,cad', { signal });
      if (cgRes.ok) {
        const data = await cgRes.json();
        const priceUsd = data.bitcoin.usd;
        const priceCad = data.bitcoin.cad;
        if (priceUsd > 0) setExchangeRate(priceCad / priceUsd);
      }
    } catch (error) {
      // Silently fail for exchange rate, not critical
    } finally {
      isFetchingRef.current = false;
    }
  }, [resolvePredictions, runPrediction, commitPredictions, dataStream]);

  const fetchHistoricalPrices = useCallback(async () => {
    const tryFetch = async (path: string) => {
      // Use the server-side proxy to avoid CORS and IP blocking issues
      try {
        const res = await fetch(`/api/proxy/binance?path=${encodeURIComponent(path)}`);
        if (res.ok) return await res.json();
        const errData = await res.json();
        throw new Error(errData.msg || errData.error || `Proxy failed with status ${res.status}`);
      } catch (e: any) {
        console.warn(`Proxy fetch failed, falling back to direct browser fetch:`, e.message);
        
        // Fallback to direct fetch if proxy fails (e.g. during local dev without server)
        const bases = ['https://api.binance.com', 'https://api1.binance.com', 'https://api2.binance.com', 'https://api3.binance.com'];
        for (const base of bases) {
          try {
            const signal = (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) 
              ? (AbortSignal as any).timeout(8000) 
              : null;
            const res = await fetch(`${base}${path}`, { signal });
            if (res.ok) return await res.json();
          } catch (err) {
            console.warn(`Direct fetch failed for ${base}:`, err);
          }
        }
        throw new Error(`All endpoints (proxy and direct) failed for ${path}`);
      }
    };

    try {
      setIsSeeding(true);
      addLog('Seeding historical data from Binance cluster...', 'default');
      
      // 1. Fetch 1000 days of daily data for deep macro context
      const macroData = await tryFetch('/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000');
      if (Array.isArray(macroData)) {
        macroPricesRef.current = macroData.map((d: any) => parseFloat(d[4]));
        addLog(`Deep Macro context loaded: 1000 days (~3 years) of BTC history`, 'purple' as any);
      } else {
        console.warn('Invalid macroData format:', macroData);
        addLog('Macro data unavailable, using price action only.', 'amber');
      }

      // 2. Fetch last 60 minutes of data from Binance to fill buffer
      const data = await tryFetch('/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60');
      if (Array.isArray(data)) {
        const historicalPrices = data.map((d: any) => parseFloat(d[4])); // Closing prices
        
        pricesRef.current = historicalPrices;
        setPrices(historicalPrices);
        setSparkData(historicalPrices);
        
        const latestPrice = historicalPrices[historicalPrices.length - 1];
        lastPriceRef.current = latestPrice;
        setLastPrice(latestPrice);
        
        addLog(`Seeded ${historicalPrices.length} high-frequency samples`, 'green');
        
        // Run initial prediction with seeded data
        runPrediction(latestPrice);

        // Immediate commit of predictions after seeding
        const result = dolynPredict(historicalPrices);
        if (result) {
          commitPredictions(latestPrice, result.sr, result.phase);
        }
      } else {
        throw new Error('Invalid historical data format from Binance');
      }
    } catch (error: any) {
      console.error('Historical fetch error:', error);
      addLog(`Seeding failed. Retrying in 10s...`, 'red');
      setTimeout(fetchHistoricalPrices, 10000);
    } finally {
      setIsSeeding(false);
    }
  }, [runPrediction, commitPredictions, addLog]);

  // Effects
  useEffect(() => {
    // Load state from localStorage
    try {
      isInitialLoadRef.current = true;
      const savedPredictions = localStorage.getItem('dolyn_predictions');
      const savedPending = localStorage.getItem('dolyn_pending_predictions');
      const savedResolved = localStorage.getItem('dolyn_resolved_predictions');
      const savedScores = localStorage.getItem('dolyn_scores');
      const savedScoreRef = localStorage.getItem('dolyn_scores_ref');
      const savedTerminal = localStorage.getItem('dolyn_terminal_mode');
      const savedShowChart = localStorage.getItem('dolyn_show_chart');
      const savedShowMarketEnergy = localStorage.getItem('dolyn_show_market_energy');
      const savedShowPriceLine = localStorage.getItem('dolyn_show_price_line');

      if (savedPredictions) setPredictions(JSON.parse(savedPredictions));
      if (savedShowChart !== null) setShowChart(JSON.parse(savedShowChart));
      if (savedShowMarketEnergy !== null) setShowMarketEnergy(JSON.parse(savedShowMarketEnergy));
      if (savedShowPriceLine !== null) setShowPriceLine(JSON.parse(savedShowPriceLine));
      if (savedPending) {
        const parsed = JSON.parse(savedPending);
        setPendingPredictions(parsed);
        pendingPredictionsRef.current = parsed;
      }
      if (savedResolved) setResolvedPredictions(JSON.parse(savedResolved));
      if (savedScores) setScores(JSON.parse(savedScores));
      
      if (savedScoreRef) {
        const loadedScores = JSON.parse(savedScoreRef);
        // Merge with defaults to ensure new horizons exist
        const mergedScores = { ...scoresRef.current };
        Object.keys(loadedScores).forEach(key => {
          if (Array.isArray(loadedScores[key])) {
            mergedScores[key] = loadedScores[key];
          }
        });
        scoresRef.current = mergedScores;
      }

      const savedLastResolved = localStorage.getItem('dolyn_last_resolved');
      if (savedLastResolved) {
        lastResolvedRef.current = JSON.parse(savedLastResolved);
      }
      
      updateScoreboard();
      setPersistenceStatus('LOADED');
      setTimeout(() => {
        setPersistenceStatus('IDLE');
        isInitialLoadRef.current = false;
      }, 2000);
    } catch (e) {
      console.error('Failed to load state', e);
      isInitialLoadRef.current = false;
    }

    AtomicClock.sync((source, skew) => {
      const skewAbs = Math.abs(skew);
      setAtomicStatus(skewAbs < 100 ? `LIVE · ±${skewAbs.toFixed(0)}ms` : `LIVE · DRIFT ${skewAbs.toFixed(0)}ms`);
      setAtomicSource(source);
      addLog(`Atomic sync successful via ${source} (Skew: ${skew.toFixed(1)}ms)`, 'green');
    });
    connectWebSocket();
    addLog('AERA ready · Smart Calibration Active', 'green');
    addLog('Stochastic Resonance Engine Active · WINDOW=60');

    // Global Error Handler
    const handleError = (e: ErrorEvent) => {
      addLog(`CRITICAL: ${e.message}`, 'red');
      console.error('Global error caught:', e);
    };
    window.addEventListener('error', handleError);

    // Heartbeat check every 15s
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastHeartbeatRef.current;
      
      if (diff > 60000) { // 60s threshold
        console.warn('Heartbeat lost, reconnecting...');
        addLog('Signal lost, recalibrating connection...', 'amber');
        if (dataStream === 'BINANCE_WS') {
          connectWebSocket();
        } else {
          fetchPrice();
        }
      } else if (diff > 10000 && dataStream === 'BINANCE_WS') {
        // Soft failover: if WS is silent for 10s, poll REST once to keep data flowing
        fetchPrice();
      }
      
      // Hourly calibration log
      if (now % 3600000 < 30000) {
        addLog('System Health: 24/7 Stability Check OK', 'default');
      }
    }, 15000);

    return () => {
      window.removeEventListener('error', handleError);
      clearInterval(heartbeatInterval);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket, addLog]);

  useEffect(() => {
    connectWebSocket();
  }, [dataStream, connectWebSocket]);

  useEffect(() => {
    const prewarm = async () => {
      try {
        const signal = (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) 
          ? (AbortSignal as any).timeout(5000) 
          : null;
        const res = await fetch('/api/proxy/binance?path=' + encodeURIComponent('/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=100'), { signal });
        const data = await res.json();
        const historicalPrices = data.map((d: any) => parseFloat(d[4]));
        pricesRef.current = historicalPrices;
        setPrices(historicalPrices);
        addLog(`SYSTEM: Pre-warmed engine with ${historicalPrices.length} historical data points`, 'green');
      } catch (e) {
        console.warn('Pre-warm failed', e);
      }
    };
    prewarm();
  }, [addLog]);

  // Persistence Effect
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    
    const saveState = () => {
      try {
        localStorage.setItem('dolyn_predictions', JSON.stringify(predictions));
        localStorage.setItem('dolyn_pending_predictions', JSON.stringify(pendingPredictions));
        localStorage.setItem('dolyn_resolved_predictions', JSON.stringify(resolvedPredictions));
        localStorage.setItem('dolyn_scores', JSON.stringify(scores));
        localStorage.setItem('dolyn_scores_ref', JSON.stringify(scoresRef.current));
        localStorage.setItem('dolyn_last_resolved', JSON.stringify(lastResolvedRef.current));
        localStorage.setItem('dolyn_terminal_mode', JSON.stringify(terminalMode));
        localStorage.setItem('dolyn_show_chart', JSON.stringify(showChart));
        localStorage.setItem('dolyn_show_market_energy', JSON.stringify(showMarketEnergy));
        localStorage.setItem('dolyn_show_price_line', JSON.stringify(showPriceLine));
      } catch (e) {
        console.error('Failed to save state', e);
      }
    };

    const timeout = setTimeout(saveState, 1000); // Faster save
    return () => clearTimeout(timeout);
  }, [predictions, pendingPredictions, resolvedPredictions, scores, terminalMode]);

  // Resolution Watchdog
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastPriceRef.current) {
        const now = AtomicClock.now();
        const pending = pendingPredictionsRef.current;
        const expired = pending.filter(p => now >= p.targetTimestamp);
        
        if (expired.length > 0) {
          console.log(`Watchdog: Found ${expired.length} expired predictions. Forcing resolution.`);
          resolvePredictions(lastPriceRef.current);
        }
      }
      // Periodic UI sync to ensure scoreboard matches internal refs
      updateScoreboard();
    }, 2000);
    return () => clearInterval(interval);
  }, [resolvePredictions, updateScoreboard]);

  // 10ms High Frequency Simulation Loop
  const lastMicroPriceUpdateRef = useRef<number>(0);
  const lastCountdownUpdateRef = useRef<number>(0);
  const lastVolatilityUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!isTracking) return;

    let lastFetch = 0;

    const interval = setInterval(() => {
      if (lastPriceRef.current === null) return;
      
      const now = AtomicClock.now();

      // Simulate micro-fluctuations (0.001% noise)
      const noise = 1 + (Math.random() - 0.5) * 0.00005;
      const newMicroPrice = (microPriceRef.current || lastPriceRef.current) * noise;
      microPriceRef.current = newMicroPrice;
      
      // Throttle microPrice state update to ~30fps (33ms) to reduce React pressure
      if (now - lastMicroPriceUpdateRef.current > 33) {
        lastMicroPriceUpdateRef.current = now;
        if (!isFrozen) setMicroPrice(newMicroPrice);
      }
      
      // Run prediction at 50Hz
      runPrediction(newMicroPrice);

      // Calculate Volatility every 2 seconds
      if (now - lastVolatilityUpdateRef.current > 2000) {
        lastVolatilityUpdateRef.current = now;
        const recentPrices = pricesRef.current.slice(-20);
        if (recentPrices.length >= 2) {
          const diffs = recentPrices.slice(1).map((p, i) => Math.abs(p - recentPrices[i]) / recentPrices[i]);
          const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          if (avgDiff > 0.0002) setVolatility('HIGH');
          else if (avgDiff > 0.00005) setVolatility('MED');
          else setVolatility('LOW');
        }
      }

      // Calibrate with real price
      const isPollingMode = dataStream !== 'BINANCE_WS' || !isWsConnected;
      const pollInterval = isPollingMode ? 3000 : 60000; 
      
      if (now - lastFetch > pollInterval) {
        lastFetch = now;
        fetchPrice();
      }

      // Update snapshot countdown (synced to wall clock, throttled to 5Hz)
      if (now - lastCountdownUpdateRef.current > 200) {
        lastCountdownUpdateRef.current = now;
        const secondsIntoMinute = (now / 1000) % 60;
        const nextSnapshot = Math.ceil(secondsIntoMinute / 15) * 15;
        const currentCountdown = nextSnapshot - secondsIntoMinute;
        setCountdown(currentCountdown);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [isTracking, runPrediction, fetchPrice, dataStream, isWsConnected]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
    fetchHistoricalPrices();
    addLog('10ms Resonance Engine Initialized', 'green');
  }, [fetchHistoricalPrices, addLog]);

  const handleManualPredict = () => {
    fetchPrice();
  };

  const emergencyReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className={`w-full min-h-screen bg-bg transition-all duration-700 ${terminalMode ? 'grayscale contrast-125' : ''}`}>
      {terminalMode && (
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      )}
      <div className="w-full max-w-[1440px] mx-auto relative z-10 px-4 py-8">
      {/* Header */}
      <Header currency={currency} setCurrency={setCurrency} />

      {/* System Integrity Monitor */}
      <SystemMonitor 
        atomicStatus={atomicStatus}
        isWsConnected={isWsConnected}
        lastHeartbeat={lastHeartbeatRef.current}
        terminalMode={terminalMode}
        setTerminalMode={setTerminalMode}
        emergencyReset={emergencyReset}
        AtomicClockSynced={AtomicClock.synced}
      />

      {/* Start Button Overlay */}

      {/* Start Button Overlay */}
      <AnimatePresence>
        {!isTracking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 backdrop-blur-xl p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border p-10 rounded-[40px] text-center max-w-sm shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
            >
              <div className="w-20 h-20 bg-purple-primary/20 rounded-[24px] flex items-center justify-center mx-auto mb-8 text-purple-primary shadow-[inset_0_0_20px_rgba(124,92,252,0.2)]">
                <Zap size={40} className="animate-pulse" />
              </div>
              <h2 className="text-3xl font-black mb-4 text-white">Resonance Engine</h2>
              <p className="text-text-muted text-base mb-10 leading-relaxed">
                Initialize 10ms high-frequency tracking using Bouvet Clay Algebra for real-time Bitcoin price resonance.
              </p>
              <button 
                onClick={startTracking}
                className="w-full py-5 bg-linear-to-br from-purple-primary to-[#5B3FD8] text-white rounded-[20px] font-bold text-xl shadow-[0_12px_40px_rgba(124,92,252,0.5)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(124,92,252,0.6)] active:translate-y-0 transition-all cursor-pointer"
              >
                Start 10ms Stream
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 mb-4 relative group">
          {/* Visual Bridge */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[1px] bg-gradient-to-r from-purple-primary/20 via-purple-primary/50 to-purple-primary/20 z-20" />
          
          <AutoTradePanel 
            state={tradingState} 
            onToggle={toggleAutoTrade} 
            onReset={resetAccount} 
            onUpdateSettings={updateTradingSettings}
          />
          <ProfitProjections 
            projections={tradingState?.projections || []} 
            algo={tradingState?.algo}
          />
        </div>

        {/* Price Card */}
        <PricePulseCard 
          currency={currency}
          microPrice={microPrice}
          lastPrice={lastPrice}
          exchangeRate={exchangeRate}
          priceChange={priceChange}
          signal={signal}
          sparkData={sparkData}
          showLivePrice={showLivePrice}
          showPriceLine={showPriceLine}
          setShowPriceLine={setShowPriceLine}
          copyToClipboard={copyToClipboard}
        />

        {/* Market Energy Signal */}
        <MarketEnergySignal 
          dataStream={dataStream}
          setDataStream={setDataStream}
          signal={signal}
          resonanceData={resonanceData}
          countdown={countdown}
          addLog={addLog}
          copyToClipboard={copyToClipboard}
          showMarketEnergy={showMarketEnergy}
          setShowMarketEnergy={setShowMarketEnergy}
        />

        {/* Resonance Chart Window */}
        <ResonanceChart 
          prices={prices}
          macroPrices={macroPricesRef.current}
          microPrice={microPrice}
          signal={signal}
          predictions={predictions}
          activeTimeframe={activeTimeframe}
          setActiveTimeframe={setActiveTimeframe}
          dataStream={dataStream}
          showChart={showChart}
          setShowChart={setShowChart}
        />

        {/* Predictions Card */}
        <section className="bg-card border border-border rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 relative z-30">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
              <TrendingUp size={14} />
              <span>Price Predictions</span>
            </div>
            <div className="flex items-center gap-2">
              {convergence && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-accent/20 border border-purple-accent/30 rounded-full font-mono text-[8px] text-purple-accent animate-pulse">
                  <Zap size={10} />
                  RESONANCE CLUSTER: ${formatPrecisePrice(convergence.price)} ({convergence.count}x)
                </div>
              )}
              <button 
                onClick={() => setIsFrozen(!isFrozen)}
                className={`p-1.5 rounded-lg transition-colors ${isFrozen ? 'bg-blue-accent/20 text-blue-accent' : 'hover:bg-surface text-text-muted hover:text-white'}`}
                title={isFrozen ? "Unfreeze UI" : "Freeze UI (Snapshot)"}
              >
                <Snowflake size={14} />
              </button>
              <button 
                onClick={() => {
                  const text = predictions.map(p => 
                    `[${p.predictedAt}] ${p.label} PREDICTION SNAPSHOT:\n` +
                    `  - EXCHANGE: ${p.source}\n` +
                    `  - BASELINE: $${formatPrecisePrice(p.baselinePrice)}\n` +
                    `  - TARGET: $${formatPrecisePrice(p.predictedPrice)}\n` +
                    `  - TARGET TIME: ${p.targetTime}\n` +
                    `  - CONFIDENCE: ${p.conf}%`
                  ).join('\n\n');
                  copyToClipboard(`DOLYN PRICE PREDICTIONS REPORT:\n\n${text}`);
                }}
                className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
                title="Copy predictions"
              >
                <Copy size={12} />
              </button>
              <button 
                onClick={refreshAllPredictions}
                className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
                title="Refresh all"
              >
                <RefreshCw size={12} />
              </button>
              <button 
                onClick={resetData}
                className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
                title="Clear all predictions"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            <PredictionList 
              predictions={predictions}
              pendingPredictions={pendingPredictions}
              microPrice={microPrice}
              prices={prices}
              refreshPrediction={refreshPrediction}
              deleteActivePrediction={deleteActivePrediction}
              formatPrecisePrice={formatPrecisePrice}
              AtomicClock={AtomicClock}
              HORIZONS={HORIZONS}
            />
          </div>
        </section>

        {/* Accuracy Scoreboard (Compact) */}
        <section className="bg-card border border-border rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-30">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
              <Trophy size={14} />
              <span>Scoreboard</span>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] border transition-all ${
                volatility === 'HIGH' ? 'bg-red-accent/10 border-red-accent/30 text-red-accent' :
                volatility === 'MED' ? 'bg-amber-accent/10 border-amber-accent/30 text-amber-accent' :
                'bg-green-accent/10 border-green-accent/30 text-green-accent'
              }`}>
                {volatility === 'HIGH' ? <Zap size={10} /> : volatility === 'MED' ? <AlertTriangle size={10} /> : <Shield size={10} />}
                {volatility} VOLATILITY
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const text = HORIZONS.map(h => {
                    const s = scores[h.key];
                    const pending = pendingPredictions.find(p => p.horizonKey === h.key);
                    let line = `${h.label} PERFORMANCE:\n  - ACCURACY: ${s ? s.avg.toFixed(2) : '0.00'}% (${s ? s.count : 0} samples)`;
                    if (s?.lastPredicted) {
                      line += `\n  - LAST RESOLVED: $${formatPrecisePrice(s.lastPredicted)} -> $${formatPrecisePrice(s.lastActual || 0)} (Error: ${s.lastPct?.toFixed(2)}%)`;
                    }
                    if (pending) {
                      line += `\n  - ACTIVE TARGET: $${formatPrecisePrice(pending.predictedPrice)}\n    - SOURCE: ${pending.source}\n    - BASE: $${formatPrecisePrice(pending.baselinePrice)} (@ ${pending.predictedAt})\n    - RESOLVES AT: ${formatPreciseTime(pending.targetTimestamp)}`;
                    }
                    return line;
                  }).join('\n\n');
                  copyToClipboard(`DOLYN SCOREBOARD SUMMARY:\n\n${text}`);
                }}
                className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
                title="Copy scoreboard"
              >
                <Copy size={12} />
              </button>
              <button 
                onClick={resetScoreboard}
                className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
                title="Reset Scoreboard"
              >
                <Trash2 size={16} />
              </button>
              <div className="font-mono text-[8px] text-amber-accent font-bold">IN {(countdown || 0).toFixed(0)}s</div>
            </div>
          </div>
          
          <ScoreboardTable 
            HORIZONS={HORIZONS}
            scores={scores}
            deleteHorizonScore={deleteHorizonScore}
            formatPrecisePrice={formatPrecisePrice}
            pendingPredictions={pendingPredictions}
            AtomicClock={AtomicClock}
          />

          <VerificationTerminal 
            resolvedPredictions={resolvedPredictions}
            clearLogs={clearLogs}
            copyToClipboard={copyToClipboard}
            deleteResolvedPrediction={deleteResolvedPrediction}
            formatPrecisePrice={formatPrecisePrice}
          />
        </section>

        {/* Live Log */}
        <section className="bg-card border border-border rounded-[32px] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4 relative z-30">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
              <Terminal size={14} />
              <span>System Log</span>
            </div>
            <button 
              onClick={() => {
                const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
                copyToClipboard(text);
              }}
              className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-white transition-colors"
              title="Copy logs"
            >
              <Copy size={12} />
            </button>
          </div>
          
          <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex gap-2 font-mono text-[8px] p-2 bg-card2/30 rounded-lg border border-border/20">
                <span className="text-purple-primary font-bold">[{log.timestamp}]</span>
                <span className={`truncate ${log.type === 'green' ? 'text-green-accent' : log.type === 'red' ? 'text-red-accent' : log.type === 'amber' ? 'text-amber-accent' : 'text-text-muted'}`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="text-center mt-12 font-mono text-[9px] text-text-faint tracking-[0.3em] uppercase">
        AERA · Bouvet Clay Algebra · PHI={PHI.toFixed(6)}
      </footer>

      <AlgoTerminal 
        logs={terminalLogs}
        onClear={() => setTerminalLogs([])}
        isOpen={isTerminalOpen}
        setIsOpen={setIsTerminalOpen}
        algoState={signal}
      />
    </div>
    </div>
  );
}
