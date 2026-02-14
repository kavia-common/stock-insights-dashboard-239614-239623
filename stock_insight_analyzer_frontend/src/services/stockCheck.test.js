import { CANONICAL_COLUMNS, makeMockUniverse, runStockCheck } from "./stockCheck";

function pricesForTickers(tickers) {
  const out = {};
  for (const t of tickers) out[t] = 100.0;
  return out;
}

function extractTickers(results) {
  return results.map((r) => r.ticker);
}

function isDesc(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > arr[i - 1]) return false;
  }
  return true;
}

test("A. Column Order Test: canonical column order is locked", () => {
  expect(CANONICAL_COLUMNS).toEqual([
    "Rank",
    "Ticker",
    "Company Name",
    "Sector",
    "Current Price",
    "Predicted Price",
    "Predicted 1-Day % Growth",
    "3-Month",
    "6-Month",
    "12-Month",
  ]);
});

test("B. Ranking Integrity Test: results top10 are sorted descending by predicted growth (rank engine)", () => {
  const universe = makeMockUniverse(250);
  const sorted = [...universe].sort((a, b) => b.predicted_1day_growth_pct - a.predicted_1day_growth_pct);
  const top10 = sorted.slice(0, 10).map((r) => r.ticker.toUpperCase());
  const tickers = top10.includes("INTC") ? top10 : [...top10, "INTC"];

  const { output } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe,
    eodPrices: pricesForTickers(tickers),
  });

  const top10Growth = output.results.slice(0, 10).map((r) => r.predicted_1day_growth_pct);
  expect(isDesc(top10Growth)).toBe(true);
});

test("C. Trade Header Test: TRADE when avg>=0.50 and dispersion>=0.60, else NO TRADE; sector_warning when >=7 same sector", () => {
  // Build top10 with avg=1.0 and dispersion=0.9 => TRADE
  const universe = makeMockUniverse(250).map((u, i) => {
    if (i < 10) {
      return { ...u, predicted_1day_growth_pct: 1.0 - i * 0.1, sector: "Tech" }; // 10 in same sector => warning
    }
    return u;
  });

  const sorted = [...universe].sort((a, b) => b.predicted_1day_growth_pct - a.predicted_1day_growth_pct);
  const top10 = sorted.slice(0, 10).map((r) => r.ticker.toUpperCase());
  const tickers = top10.includes("INTC") ? top10 : [...top10, "INTC"];

  const { output } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe,
    eodPrices: pricesForTickers(tickers),
  });

  expect(output.trade_header).toBe("TRADE");
  expect(output.sector_warning).toBe(true);

  // Force NO TRADE by failing dispersion (all equal)
  const universe2 = makeMockUniverse(250).map((u, i) => (i < 10 ? { ...u, predicted_1day_growth_pct: 0.6 } : u));
  const sorted2 = [...universe2].sort((a, b) => b.predicted_1day_growth_pct - a.predicted_1day_growth_pct);
  const top10b = sorted2.slice(0, 10).map((r) => r.ticker.toUpperCase());
  const tickers2 = top10b.includes("INTC") ? top10b : [...top10b, "INTC"];

  const { output: out2 } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe: universe2,
    eodPrices: pricesForTickers(tickers2),
  });

  expect(out2.trade_header).toBe("NO TRADE");

  // Macro override forces NO TRADE even if rules would pass
  const { output: out3 } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe,
    eodPrices: pricesForTickers(tickers),
    macroOverrideNoTrade: true,
  });
  expect(out3.trade_header).toBe("NO TRADE");
});

test("D. INTC Presence Test: INTC is appended even if outside top 10", () => {
  const universe = makeMockUniverse(250).map((u) =>
    u.ticker === "INTC" ? { ...u, predicted_1day_growth_pct: -99 } : u
  );

  const sorted = [...universe].sort((a, b) => b.predicted_1day_growth_pct - a.predicted_1day_growth_pct);
  const top10 = sorted.slice(0, 10).map((r) => r.ticker.toUpperCase());
  expect(top10.includes("INTC")).toBe(false);

  const tickers = [...top10, "INTC"];
  const { output } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe,
    eodPrices: pricesForTickers(tickers),
  });

  expect(extractTickers(output.results)).toContain("INTC");
  expect(output.results.length).toBe(11);
});

test("E. No Partial Universe Test: fails if universe size below minimum threshold", () => {
  const universe = makeMockUniverse(50);
  expect(() =>
    runStockCheck({
      currentDate: "2026-02-14",
      predictionDate: "2026-02-15",
      universe,
      eodPrices: { INTC: 100 },
    })
  ).toThrow(/Universe size/);
});

test("Forward-honest pricing: fails if any output ticker is missing user-supplied EOD price", () => {
  const universe = makeMockUniverse(250);
  const sorted = [...universe].sort((a, b) => b.predicted_1day_growth_pct - a.predicted_1day_growth_pct);
  const top10 = sorted.slice(0, 10).map((r) => r.ticker.toUpperCase());
  const tickers = top10.includes("INTC") ? top10 : [...top10, "INTC"];

  const eodPrices = pricesForTickers(tickers);
  delete eodPrices[tickers[0]];

  expect(() =>
    runStockCheck({
      currentDate: "2026-02-14",
      predictionDate: "2026-02-15",
      universe,
      eodPrices,
    })
  ).toThrow(/Missing\/invalid user-supplied EOD price/);
});
