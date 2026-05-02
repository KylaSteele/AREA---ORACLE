/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Prediction {
  id: string;
  label: string;
  key: string;
  minutes: number;
  predictedPrice: number;
  baselinePrice: number;
  predictedAt: string;
  targetTime: string;
  conf: string;
  bar: number;
  source: string;
}

export interface PendingPrediction {
  id: string;
  predictedTimestamp: number;
  horizonMs: number;
  horizonLabel: string;
  horizonKey: string;
  predictedPrice: number;
  targetTimestamp: number;
  baselinePrice: number;
  predictedAt: string;
  source: string;
}

export interface ResolvedPrediction {
  id: string;
  label: string;
  key: string;
  predicted: number;
  actual: number;
  delta: number;
  pct: number;
  accuracy: number;
  predictedAt: string;
  resolvedAt: string;
  baselinePrice: number;
  source: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type?: 'green' | 'red' | 'amber' | 'default';
}

export interface ScoreHorizon {
  avg: number;
  count: number;
  stars: number;
  history: number[];
  lastPredicted?: number;
  lastActual?: number;
  lastPct?: number;
}

export interface TradingState {
  balance: number;
  initial_balance: number;
  leverage: number;
  risk_per_trade: number;
  target_monthly: number;
  position_size: number;
  entry_price: number;
  is_auto_trade: number;
  latestPrice: number;
  unrealizedPnl: number;
  projections: ProjectionMetric[];
  nextTickSeconds: number;
  algo?: any;
}

export interface ProjectionMetric {
  label: string;
  value: number;
  profit: number;
  pct: number;
}
