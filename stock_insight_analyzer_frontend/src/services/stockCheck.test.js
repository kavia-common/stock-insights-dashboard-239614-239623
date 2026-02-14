import { CANONICAL_COLUMNS, makeMockUniverse, runStockCheck } from "./stockCheck";
import { getModel43Spec, computePredicted1DayGrowthPctFromFactors } from "./stockCheckModel43";

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

/**
 * Helper for tests: determine which tickers the engine will require EOD prices for
 * (Top 10 by predicted growth + INTC appended if not already present).
 *
 * This mirrors the engine behavior:
 * - if predicted_1day_growth_pct is missing, compute it from model_factors_43.
 */
function tickersRequiredByEngine(universe) {
  const normalized = universe.map((u) => {
    const t = String(u.ticker || "").toUpperCase();
    const hasDirect = typeof u.predicted_1day_growth_pct === "number" && Number.isFinite(u.predicted_1day_growth_pct);

    if (hasDirect) return { ticker: t, predicted_1day_growth_pct: u.predicted_1day_growth_pct };

    if (u && typeof u === "object" && u.model_factors_43 && typeof u.model_factors_43 === "object") {
      const { predicted_1day_growth_pct } = computePredicted1DayGrowthPctFromFactors(u.model_factors_43);
      return { ticker: t, predicted_1day_growth_pct };
    }

    // In these tests we always provide enough data; fail loudly if not.
    throw new Error(`Test universe missing predicted growth inputs for ${t || "(unknown)"}`);
  });

  normalized.sort((a, b) => {
    const dg = (b.predicted_1day_growth_pct ?? 0) - (a.predicted_1day_growth_pct ?? 0);
    if (dg !== 0) return dg;
    return String(a.ticker).localeCompare(String(b.ticker));
  });

  const top10 = normalized.slice(0, 10).map((r) => r.ticker);
  return top10.includes("INTC") ? top10 : [...top10, "INTC"];
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

test("A2. 43-Factor spec is locked: 43 factors and total weight 100%", () => {
  const spec = getModel43Spec();
  expect(spec.factors).toHaveLength(43);

  // Sum should be exactly 100.0 as per user_input_ref
  const total = spec.factors.reduce((s, f) => s + f.weightPct, 0);
  expect(total).toBeCloseTo(100.0, 8);

  // Spot-check a few weights (authoritative)
  const byId = new Map(spec.factors.map((f) => [f.id, f]));
  expect(byId.get("f04").weightPct).toBeCloseTo(2.5, 8); // 50-Day Trend Position
  expect(byId.get("f08").weightPct).toBeCloseTo(3.0, 8); // Breakout Velocity
  expect(byId.get("f40").weightPct).toBeCloseTo(1.5, 8); // Dollar Index Trend
  expect(byId.get("f43").weightPct).toBeCloseTo(0.5, 8); // Risk-On/Risk-Off Composite
});

test("A3. Factor compute is forward-honest: missing any factor throws", () => {
  const spec = getModel43Spec();
  const inputs = {};
  for (const f of spec.factors) inputs[f.id] = 0.5;
  delete inputs["f01"];

  expect(() => computePredicted1DayGrowthPctFromFactors(inputs)).toThrow(/Missing factor input: f01/);
});

test("B. Ranking Integrity Test: results top10 are sorted descending by predicted growth (rank engine)", () => {
  const universe = makeMockUniverse(250);
  const tickers = tickersRequiredByEngine(universe);

  const { output } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe,
    eodPrices: pricesForTickers(tickers),
  });

  const top10Growth = output.results.slice(0, 10).map((r) => r.predicted_1day_growth_pct);
  expect(isDesc(top10Growth)).toBe(true);
});

test("B2. Engine computes predicted_1day_growth_pct from model_factors_43 when direct field missing", () => {
  const spec = getModel43Spec();

  /**
   * Build a universe where we can *guarantee* which tickers are the engine's top10:
   * - 10 chosen tickers are forced to +3.0% predicted growth (the maximum possible from the factor model),
   * - every other ticker is forced to -3.0% (minimum),
   * so the engine's top10 are deterministic and independent of makeMockUniverse ordering.
   */
  const mkAllFactors = (v) => {
    const inputs = {};
    for (const f of spec.factors) inputs[f.id] = v;
    return inputs;
  };

  const TOP10 = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "AMD", "QCOM"];
  const MUST_COMPUTE = new Set(["AAPL", "MSFT"]); // force compute-path for two guaranteed-top10 tickers

  const universe = makeMockUniverse(250).map((u) => {
    const t = String(u.ticker || "").toUpperCase();

    if (TOP10.includes(t)) {
      // Ensure these are the top 10, and for two of them ensure compute path is used.
      const base = {
        ...u,
        sector: u.sector || "Tech",
      };

      if (MUST_COMPUTE.has(t)) {
        return {
          ...base,
          predicted_1day_growth_pct: undefined,
          model_factors_43: mkAllFactors(1.0), // => weighted score 1.0 => +3.0%
        };
      }

      // Direct field also fine; we just need deterministic membership in top10.
      return {
        ...base,
        predicted_1day_growth_pct: 3.0,
      };
    }

    // Force everyone else to be worse than any top10 candidate.
    return {
      ...u,
      predicted_1day_growth_pct: -3.0,
    };
  });

  const tickers = tickersRequiredByEngine(universe);

  const { output } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe,
    eodPrices: pricesForTickers(tickers),
  });

  const rAapl = output.results.find((r) => r.ticker === "AAPL");
  const rMsft = output.results.find((r) => r.ticker === "MSFT");

  expect(typeof rAapl?.predicted_1day_growth_pct).toBe("number");
  expect(typeof rMsft?.predicted_1day_growth_pct).toBe("number");
});

test("C. Trade Header Test: TRADE when avg>=0.50 and dispersion>=0.60, else NO TRADE; sector_warning when >=7 same sector", () => {
  const TOP10 = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "AMD", "QCOM"];

  // Make the engine's ranked top10 deterministic and satisfy TRADE rules:
  // avg = 0.55, dispersion = 0.9  => TRADE; also put all 10 into same sector => sector_warning true
  const desiredTop10Growth = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

  const universe = makeMockUniverse(250).map((u) => {
    const t = String(u.ticker || "").toUpperCase();
    const idx = TOP10.indexOf(t);

    if (idx >= 0) {
      return { ...u, predicted_1day_growth_pct: desiredTop10Growth[idx], sector: "Tech" };
    }

    // Ensure no other ticker can displace our intended top10.
    return { ...u, predicted_1day_growth_pct: -3.0 };
  });

  const tickers = tickersRequiredByEngine(universe);

  const { output } = runStockCheck({
    currentDate: "2026-02-14",
    predictionDate: "2026-02-15",
    universe,
    eodPrices: pricesForTickers(tickers),
  });

  expect(output.trade_header).toBe("TRADE");
  expect(output.sector_warning).toBe(true);

  // Force NO TRADE by failing dispersion (all equal across deterministic top10)
  const universe2 = makeMockUniverse(250).map((u) => {
    const t = String(u.ticker || "").toUpperCase();
    if (TOP10.includes(t)) return { ...u, predicted_1day_growth_pct: 0.6, sector: "Tech" };
    return { ...u, predicted_1day_growth_pct: -3.0 };
  });

  const tickers2 = tickersRequiredByEngine(universe2);

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

test("D. INTC Presence Test: INTC is appended even if outside top 10 (deterministic)", () => {
  const spec = getModel43Spec();

  const mkAllHalfFactors = (overrides = {}) => {
    const inputs = {};
    for (const f of spec.factors) inputs[f.id] = 0.5;
    return { ...inputs, ...overrides };
  };

  // Make INTC deterministically "bad" by setting all factors to 0 (=> predicted growth near -3.0),
  // and remove any direct predicted_1day_growth_pct field so the engine must compute from factors.
  const universe = makeMockUniverse(250).map((u) => {
    if (u.ticker.toUpperCase() !== "INTC") return u;

    return {
      ...u,
      predicted_1day_growth_pct: undefined,
      model_factors_43: mkAllHalfFactors(
        Object.fromEntries(spec.factors.map((f) => [f.id, 0.0]))
      ),
    };
  });

  // Sanity check: INTC should not be in the engine's top10 tickers after our forced factors.
  const tickers = tickersRequiredByEngine(universe);
  expect(tickers.slice(0, 10)).not.toContain("INTC");
  expect(tickers).toContain("INTC");

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
  const tickers = tickersRequiredByEngine(universe);

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
