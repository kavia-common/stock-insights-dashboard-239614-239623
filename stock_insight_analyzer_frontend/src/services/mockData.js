/**
 * Mock/fallback dataset used when the backend is unreachable.
 */

export const MOCK_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA", "GOOGL"];

export const MOCK_DASHBOARD = {
  market: {
    asOf: new Date().toISOString(),
    sentiment: "Bullish",
    breadth: 0.62,
    volatility: 18.4,
  },
  kpis: [
    { label: "Watchlist Value", value: 128430.22, deltaPct: 1.34 },
    { label: "Today P/L", value: 1840.5, deltaPct: 0.88 },
    { label: "Top Mover", value: "NVDA", deltaPct: 2.71 },
    { label: "Risk Score", value: 37, deltaPct: -4.1 },
  ],
  series: {
    portfolio: [
      { t: "Mon", v: 121.2 },
      { t: "Tue", v: 123.1 },
      { t: "Wed", v: 122.3 },
      { t: "Thu", v: 124.8 },
      { t: "Fri", v: 126.4 },
    ],
    volume: [
      { t: "Mon", v: 42 },
      { t: "Tue", v: 55 },
      { t: "Wed", v: 49 },
      { t: "Thu", v: 61 },
      { t: "Fri", v: 58 },
    ],
  },
  movers: [
    { symbol: "NVDA", price: 884.12, changePct: 2.71, signal: "Momentum" },
    { symbol: "AAPL", price: 178.33, changePct: 1.12, signal: "Breakout" },
    { symbol: "TSLA", price: 192.04, changePct: -1.55, signal: "Volatile" },
    { symbol: "AMZN", price: 168.77, changePct: 0.38, signal: "Range" },
  ],
};

export const MOCK_NEWS = [
  {
    id: "n1",
    title: "Mega-cap tech leads as inflation cools slightly",
    source: "MarketWire",
    ts: Date.now() - 1000 * 60 * 30,
    summary: "Equities rose broadly with strength in semiconductors and cloud as rate expectations steadied.",
    symbols: ["NVDA", "MSFT", "AAPL"],
  },
  {
    id: "n2",
    title: "Energy slips; defensives outperform into close",
    source: "Daily Alpha",
    ts: Date.now() - 1000 * 60 * 60 * 3,
    summary: "Late-session rotation into defensives pushed staples and healthcare higher while energy eased.",
    symbols: ["XOM", "CVX"],
  },
  {
    id: "n3",
    title: "Retail sales surprise boosts risk appetite",
    source: "The Ledger",
    ts: Date.now() - 1000 * 60 * 60 * 8,
    summary: "Better-than-expected retail sales eased recession fears, lifting cyclicals and small caps.",
    symbols: ["IWM", "AMZN"],
  },
];

export const MOCK_WATCHLIST = [
  { symbol: "AAPL", name: "Apple", price: 178.33, changePct: 1.12, rating: "Buy" },
  { symbol: "MSFT", name: "Microsoft", price: 409.18, changePct: 0.44, rating: "Buy" },
  { symbol: "NVDA", name: "NVIDIA", price: 884.12, changePct: 2.71, rating: "Hold" },
  { symbol: "TSLA", name: "Tesla", price: 192.04, changePct: -1.55, rating: "Speculative" },
];

export function mockDetails(symbol) {
  const base = MOCK_WATCHLIST.find((w) => w.symbol === symbol) || {
    symbol,
    name: symbol,
    price: 100 + Math.random() * 200,
    changePct: (Math.random() - 0.5) * 4,
    rating: "Neutral",
  };

  const series = Array.from({ length: 30 }).map((_, i) => {
    const t = i + 1;
    const drift = 0.12;
    const noise = (Math.random() - 0.5) * 2.2;
    const v = Math.max(20, base.price + (t - 15) * drift + noise);
    return { t: `D${t}`, v: Number(v.toFixed(2)) };
  });

  return {
    ...base,
    stats: {
      pe: 24.8,
      eps: 6.12,
      beta: 1.14,
      marketCap: "2.82T",
      divYield: "0.55%",
    },
    insights: [
      { label: "Trend", value: base.changePct >= 0 ? "Uptrend" : "Downtrend" },
      { label: "Momentum", value: "Moderate" },
      { label: "Support", value: Number((base.price * 0.93).toFixed(2)) },
      { label: "Resistance", value: Number((base.price * 1.06).toFixed(2)) },
    ],
    series,
  };
}
