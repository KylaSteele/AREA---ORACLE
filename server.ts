import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { dolynPredict, predictPrice, calculateMacroTrend } from "./src/utils/algo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
const db = new Database("trading.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS account (
    id INTEGER PRIMARY KEY,
    balance REAL DEFAULT 1000.0,
    initial_balance REAL DEFAULT 1000.0,
    position_size REAL DEFAULT 0,
    entry_price REAL DEFAULT 0,
    is_auto_trade INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    side TEXT,
    entry_price REAL,
    exit_price REAL,
    quantity REAL,
    pnl REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add missing columns if table already existed without them
const addColumns = () => {
  const columns = [
    { name: 'leverage', type: 'REAL DEFAULT 1.5' },
    { name: 'risk_per_trade', type: 'REAL DEFAULT 0.5' },
    { name: 'target_monthly', type: 'REAL DEFAULT 3000.0' }
  ];
  
  const tableInfo = db.prepare("PRAGMA table_info(account)").all() as any[];
  const existingColumns = tableInfo.map(c => c.name);
  
  for (const col of columns) {
    if (!existingColumns.includes(col.name)) {
      console.log(`Adding missing column ${col.name} to account table`);
      db.exec(`ALTER TABLE account ADD COLUMN ${col.name} ${col.type}`);
    }
  }

  // Ensure no nulls in existing row
  db.prepare("UPDATE account SET leverage = 1.5 WHERE leverage IS NULL").run();
  db.prepare("UPDATE account SET risk_per_trade = 0.5 WHERE risk_per_trade IS NULL").run();
  db.prepare("UPDATE account SET target_monthly = 3000.0 WHERE target_monthly IS NULL").run();
};
addColumns();

// Seed default account safely
try {
  const row = db.prepare("SELECT id FROM account WHERE id = 1").get();
  if (!row) {
    db.prepare("INSERT INTO account (id, balance, initial_balance, leverage, risk_per_trade, target_monthly) VALUES (1, 1000.0, 1000.0, 1.5, 0.5, 3000.0)").run();
  } else {
    // Force set defaults if they are missing
    db.prepare("UPDATE account SET leverage = 1.5 WHERE id = 1 AND leverage IS NULL").run();
    db.prepare("UPDATE account SET risk_per_trade = 0.5 WHERE id = 1 AND risk_per_trade IS NULL").run();
    db.prepare("UPDATE account SET target_monthly = 3000.0 WHERE id = 1 AND target_monthly IS NULL").run();
  }
} catch (e) {
  console.error("Migration/Seeding Error:", e);
}

// State
let latestPrice = 0;
let priceHistory: number[] = [];
let latestPrediction: any = null;
let nextTick = Date.now() + 10000;
const HISTORY_LIMIT = 200;

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Persistence Helpers
  const getAccount = () => db.prepare("SELECT * FROM account WHERE id = 1").get() as any;
  const updateAccount = (updates: any) => {
    const keys = Object.keys(updates);
    const setClause = keys.map(k => `${k} = ?`).join(", ");
    db.prepare(`UPDATE account SET ${setClause}, last_updated = CURRENT_TIMESTAMP WHERE id = 1`).run(...Object.values(updates));
  };

  // Profit Projection Logic
  const calculateProjections = (balance: number, leverage: number = 1.5, riskPerTrade: number = 0.5, prediction?: any) => {
    const netEdgePerSignal = 0.0015; // 0.15% after fees
    const signalsPerDay = 45;
    
    // Connect to algo: adjust yield based on prediction confidence or SNR
    let multiplier = 0.85;
    if (prediction) {
      // If SNR > 10, engine is very confident, boost projection slightly
      if (prediction.snr > 10) multiplier = 0.95;
      // If BullFrac is extreme, edge is stronger
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
        // Compounding for longer terms
        estimatedValue = balance * Math.pow(1 + effectiveDailyYield, p.factor);
      }

      return {
        label: p.label,
        value: estimatedValue,
        profit: estimatedValue - balance,
        pct: ((estimatedValue / balance) - 1) * 100
      };
    });
  };

  // API Routes
  app.get("/api/trading/state", (req, res, next) => {
    try {
      const acc = getAccount();
      if (!acc) {
        return res.status(404).json({ error: "Account not found" });
      }
      const projections = calculateProjections(acc.balance, acc.leverage, acc.risk_per_trade, latestPrediction);
      const nextTickSeconds = Math.max(0, Math.ceil((nextTick - Date.now()) / 1000));
      res.json({
        ...acc,
        latestPrice,
        unrealizedPnl: acc.position_size !== 0 ? (latestPrice - acc.entry_price) * acc.position_size : 0,
        projections,
        nextTickSeconds,
        algo: latestPrediction
      });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/trading/update-settings", (req, res) => {
    const { leverage, risk_per_trade, target_monthly } = req.body;
    updateAccount({ leverage, risk_per_trade, target_monthly });
    res.json({ success: true });
  });

  app.post("/api/trading/toggle", (req, res) => {
    const acc = getAccount();
    const newState = acc.is_auto_trade === 1 ? 0 : 1;
    updateAccount({ is_auto_trade: newState });
    res.json({ success: true, is_auto_trade: newState });
  });

  app.post("/api/trading/reset", (req, res) => {
    const initial = req.body.amount || 1000.0;
    updateAccount({ balance: initial, initial_balance: initial, position_size: 0, entry_price: 0, is_auto_trade: 0 });
    db.prepare("DELETE FROM trades").run();
    res.json({ success: true });
  });

  // Binance Proxy for client
  app.get("/api/proxy/binance", async (req, res) => {
    try {
      const { path: apiPath } = req.query;
      if (!apiPath) return res.status(400).json({ error: "Missing path parameter" });
      const target = `https://api.binance.com${apiPath}`;
      console.log(`Proxying to: ${target}`);
      const response = await fetch(target);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: e.message });
    }
  });

  // Background Trading Loop
  setInterval(async () => {
    nextTick = Date.now() + 10000;
    try {
      // Fetch latest price
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const data = await response.json();
      latestPrice = parseFloat(data.price);
      priceHistory.push(latestPrice);
      if (priceHistory.length > HISTORY_LIMIT) priceHistory.shift();

      const acc = getAccount();
      if (acc.is_auto_trade === 1 && priceHistory.length >= 30) {
        const pred = dolynPredict(priceHistory);
        latestPrediction = pred;
        if (!pred) return;

        const fee = 0.001; // 0.1% taker fee
        
        // Strategy: if BULLish and not LONG, go LONG. if BEARish and not SHORT, go SHORT.
        const targetSide = pred.direction; // 'LONG' or 'SHORT'
        const currentSide = acc.position_size > 0 ? 'LONG' : (acc.position_size < 0 ? 'SHORT' : 'NONE');

        if (targetSide !== currentSide) {
          console.log(`Bot Trigger: Switching from ${currentSide} to ${targetSide} at ${latestPrice}`);
          
          let newBalance = acc.balance;
          
          // Close current
          if (currentSide !== 'NONE') {
            const pnl = (latestPrice - acc.entry_price) * acc.position_size;
            newBalance += pnl;
            // Record trade
            db.prepare("INSERT INTO trades (side, entry_price, exit_price, quantity, pnl) VALUES (?, ?, ?, ?, ?)")
              .run(currentSide, acc.entry_price, latestPrice, Math.abs(acc.position_size), pnl);
          }

          // Open new
          const riskAmount = acc.balance * (acc.risk_per_trade / 100);
          const maxPositionNotional = acc.balance * acc.leverage;
          const positionNotional = Math.min(maxPositionNotional, riskAmount * 12);
          
          const quantity = (targetSide === 'LONG' ? 1 : -1) * (positionNotional / latestPrice);
          
          updateAccount({
            position_size: quantity,
            entry_price: latestPrice
          });
        }
      }
    } catch (e) {
      console.error("Trading loop error:", e);
    }
  }, 10000); // Check every 10s

  // Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
