export interface ProjectionMetric {
  label: string;
  value: number;
  profit: number;
  pct: number;
}

export const calculateProjections = (
  balance: number, 
  leverage: number = 1.5, 
  riskPerTrade: number = 0.5, 
  prediction?: any
) => {
  const netEdgePerSignal = 0.0015; // 0.15% after fees
  const signalsPerDay = 45;
  
  let multiplier = 0.85;
  if (prediction) {
    if (prediction.snr > 10) multiplier = 0.95;
    if (prediction.bullFrac > 0.7 || prediction.bullFrac < 0.3) multiplier *= 1.1;
  }

  const riskFactor = riskPerTrade / 0.5;
  const effectiveDailyYield = (netEdgePerSignal * signalsPerDay) * Math.min(leverage, 8) * multiplier * riskFactor;

  const periods = [
    { label: "15m", factor: (0.75 / signalsPerDay) },
    { label: "1h", factor: (3 / signalsPerDay) },
    { label: "11h", factor: (33 / signalsPerDay) },
    { label: "1d", factor: 1 },
    { label: "30d", factor: 30 },
    { label: "6m", factor: 180 }
  ];
  
  return periods.map(p => {
    let estimatedValue;
    if (p.factor <= 1) {
      estimatedValue = balance * (1 + (effectiveDailyYield * p.factor));
    } else {
      estimatedValue = balance * Math.pow(1 + effectiveDailyYield, p.factor);
    }

    const profit = estimatedValue - balance;
    const pct = (profit / (balance || 1)) * 100;

    return {
      label: p.label,
      value: estimatedValue,
      profit,
      pct
    };
  });
};
