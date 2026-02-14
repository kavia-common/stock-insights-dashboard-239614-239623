import { computePredicted1DayGrowthPctFromFactors } from "./stockCheckModel43";

const MODEL_VERSION = "Stock Check v1.0";

// Locked canonical column order (must never change)
export const CANONICAL_COLUMNS = [
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
];

const REQUIRED_MIN_UNIVERSE = 100; // spec requires "full tradable ticker universe" (guardrail for partial fetches)
const INTC_TICKER = "INTC";

/**
 * Basic numeric guard for forward-honest behavior.
 */
function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function toPct(n) {
  // Keep pct as number (not string). Rounded to 4 decimals for stable UI + tests.
  return Math.round(n * 10000) / 10000;
}

function stableSortByPredictedGrowthDesc(items) {
  return [...items].sort((a, b) => {
    const dg = (b.predicted_1day_growth_pct ?? 0) - (a.predicted_1day_growth_pct ?? 0);
    if (dg !== 0) return dg;
    // Stable tie-break: ticker ascending
    return String(a.ticker).localeCompare(String(b.ticker));
  });
}

/**
 * Computes trade header and sector warning for top 10 only (post-model only).
 */
function computeTradeHeader(top10) {
  const avg =
    top10.reduce((sum, r) => sum + (r.predicted_1day_growth_pct ?? 0), 0) / Math.max(1, top10.length);
  const max = Math.max(...top10.map((r) => r.predicted_1day_growth_pct ?? -Infinity));
  const min = Math.min(...top10.map((r) => r.predicted_1day_growth_pct ?? Infinity));
  const dispersion = max - min;

  // Sector warning: if >= 7 of top 10 in same sector
  const sectorCounts = new Map();
  for (const r of top10) {
    const s = String(r.sector || "Unknown");
    sectorCounts.set(s, (sectorCounts.get(s) || 0) + 1);
  }
  let sectorWarning = false;
  for (const [, c] of sectorCounts.entries()) {
    if (c >= 7) {
      sectorWarning = true;
      break;
    }
  }

  const rule1 = avg >= 0.5;
  const rule2 = dispersion >= 0.6;

  return {
    trade_header: rule1 && rule2 ? "TRADE" : "NO TRADE",
    sector_warning: sectorWarning,
    _debug: { avg, dispersion },
  };
}

/**
 * Validates output JSON contract strictly.
 */
function validateOutputSchema(out) {
  if (!out || typeof out !== "object") throw new Error("Output must be an object");
  if (out.model_version !== MODEL_VERSION) throw new Error(`model_version must be "${MODEL_VERSION}"`);
  if (typeof out.current_date !== "string" || !out.current_date) throw new Error("current_date required");
  if (typeof out.prediction_date !== "string" || !out.prediction_date) throw new Error("prediction_date required");
  if (out.trade_header !== "TRADE" && out.trade_header !== "NO TRADE") throw new Error("trade_header invalid");
  if (typeof out.sector_warning !== "boolean") throw new Error("sector_warning must be boolean");
  if (!Array.isArray(out.results)) throw new Error("results must be array");

  for (const r of out.results) {
    const requiredKeys = [
      "rank",
      "ticker",
      "company_name",
      "sector",
      "current_price",
      "predicted_price",
      "predicted_1day_growth_pct",
      "3_month",
      "6_month",
      "12_month",
    ];
    for (const k of requiredKeys) {
      if (!(k in r)) throw new Error(`Result missing key: ${k}`);
    }
    if (!Number.isInteger(r.rank) || r.rank < 1) throw new Error("rank must be positive integer");
    if (typeof r.ticker !== "string" || !r.ticker) throw new Error("ticker required");
    if (typeof r.company_name !== "string" || !r.company_name) throw new Error("company_name required");
    if (typeof r.sector !== "string" || !r.sector) throw new Error("sector required");
    if (!isFiniteNumber(r.current_price) || r.current_price <= 0) throw new Error("current_price must be > 0");
    if (!isFiniteNumber(r.predicted_price)) throw new Error("predicted_price must be number");
    if (!isFiniteNumber(r.predicted_1day_growth_pct)) throw new Error("predicted_1day_growth_pct must be number");
    if (!isFiniteNumber(r["3_month"])) throw new Error("3_month must be number");
    if (!isFiniteNumber(r["6_month"])) throw new Error("6_month must be number");
    if (!isFiniteNumber(r["12_month"])) throw new Error("12_month must be number");
  }
}

/**
 * UI table row order: greens (positive growth) first, then reds; within each section strict descending.
 * Note: This sorting is for display; ranking uses predicted growth over the full universe and is immutable.
 */
function canonicalDisplaySort(rows) {
  const greens = rows.filter((r) => (r.predicted_1day_growth_pct ?? 0) >= 0);
  const reds = rows.filter((r) => (r.predicted_1day_growth_pct ?? 0) < 0);
  return [...stableSortByPredictedGrowthDesc(greens), ...stableSortByPredictedGrowthDesc(reds)];
}

/**
 * If predicted_1day_growth_pct is missing but model_factors_43 is present, compute it deterministically.
 * Forward-honest: if both are missing -> throw.
 */
function ensurePredictedGrowthPct(u) {
  if (isFiniteNumber(u?.predicted_1day_growth_pct)) return u;

  if (u && typeof u === "object" && u.model_factors_43 && typeof u.model_factors_43 === "object") {
    const computed = computePredicted1DayGrowthPctFromFactors(u.model_factors_43);
    return { ...u, predicted_1day_growth_pct: computed.predicted_1day_growth_pct };
  }

  throw new Error(
    `Missing predicted_1day_growth_pct for ${u?.ticker || "(unknown ticker)"}. Forward-honest: provide predicted_1day_growth_pct or model_factors_43.`
  );
}

/**
 * PUBLIC_INTERFACE
 * Executes the Stock Check v1.0 locked-spec flow.
 *
 * Inputs:
 * - currentDate (YYYY-MM-DD)
 * - predictionDate (YYYY-MM-DD)
 * - universe: full tradable ticker universe with required fields for ranking.
 *   Each entry must include:
 *     - ticker, company_name, sector, 3_month, 6_month, 12_month, and either:
 *         a) predicted_1day_growth_pct (number), OR
 *         b) model_factors_43 (object with f01..f43 factor inputs)
 * - eodPrices: user-supplied mapping { TICKER: price }. No fetching/hallucination permitted.
 * - macroOverrideNoTrade: optional manual override flag; if true => trade_header forced to "NO TRADE" (post-model).
 *
 * Returns:
 * - output: strict JSON contract as per spec.
 * - table: { columns: CANONICAL_COLUMNS, rows: canonical display rows }
 */
export function runStockCheck({
  currentDate,
  predictionDate,
  universe,
  eodPrices,
  macroOverrideNoTrade = false,
}) {
  if (!currentDate || !predictionDate) {
    throw new Error("Current_Date and Prediction_Date are required inputs.");
  }
  if (!Array.isArray(universe)) throw new Error("Universe must be an array.");
  if (universe.length < REQUIRED_MIN_UNIVERSE) {
    throw new Error(
      `Universe size (${universe.length}) is below required minimum (${REQUIRED_MIN_UNIVERSE}). Refusing partial-universe ranking.`
    );
  }
  if (!eodPrices || typeof eodPrices !== "object") {
    throw new Error("EOD_Prices are required (user-supplied mapping).");
  }

  // Ranking engine (immutable): sort full universe by predicted growth desc and take top 10.
  // If predicted_1day_growth_pct isn't present, compute it from the locked 43-factor model inputs.
  const normalizedUniverse = universe.map((u) => {
    if (typeof u?.ticker !== "string" || !u.ticker) throw new Error("Universe entries must include ticker");
    if (typeof u.company_name !== "string" || !u.company_name) throw new Error(`Missing company_name for ${u.ticker}`);
    if (typeof u.sector !== "string" || !u.sector) throw new Error(`Missing sector for ${u.ticker}`);
    // 3/6/12 month returns required for output table
    if (!isFiniteNumber(u["3_month"])) throw new Error(`Missing 3_month for ${u.ticker}`);
    if (!isFiniteNumber(u["6_month"])) throw new Error(`Missing 6_month for ${u.ticker}`);
    if (!isFiniteNumber(u["12_month"])) throw new Error(`Missing 12_month for ${u.ticker}`);

    return ensurePredictedGrowthPct(u);
  });

  const ranked = stableSortByPredictedGrowthDesc(normalizedUniverse);
  const top10 = ranked.slice(0, 10);

  // Append INTC regardless of ranking (if not already present)
  const hasINTC = top10.some((r) => r.ticker.toUpperCase() === INTC_TICKER);
  const intcFromUniverse = ranked.find((r) => r.ticker.toUpperCase() === INTC_TICKER) || null;

  const outputRowsUniverseOrder = [...top10];
  if (!hasINTC) {
    if (!intcFromUniverse) {
      throw new Error("INTC must be appended, but INTC is not present in the universe data.");
    }
    outputRowsUniverseOrder.push(intcFromUniverse);
  }

  // Enforce forward-honest pricing: require user-supplied EOD price for each output ticker.
  const results = outputRowsUniverseOrder.map((r, idx) => {
    const t = r.ticker.toUpperCase();
    const current_price = eodPrices[t];
    if (!isFiniteNumber(current_price) || current_price <= 0) {
      throw new Error(
        `Missing/invalid user-supplied EOD price for ${t}. System must not fetch or hallucinate price data.`
      );
    }

    const growthPct = toPct(r.predicted_1day_growth_pct);
    const predicted_price = Number((current_price * (1 + growthPct / 100)).toFixed(2));

    return {
      rank: idx + 1,
      ticker: t,
      company_name: r.company_name,
      sector: r.sector,
      current_price: Number(current_price.toFixed(2)),
      predicted_price,
      predicted_1day_growth_pct: growthPct,
      "3_month": toPct(r["3_month"]),
      "6_month": toPct(r["6_month"]),
      "12_month": toPct(r["12_month"]),
    };
  });

  // Trade/No Trade header logic computed on Top 10 only (post-model). INTC append does not affect header.
  const headerCalc = computeTradeHeader(results.slice(0, 10));

  const output = {
    model_version: MODEL_VERSION,
    current_date: currentDate,
    prediction_date: predictionDate,
    trade_header: macroOverrideNoTrade ? "NO TRADE" : headerCalc.trade_header,
    sector_warning: headerCalc.sector_warning,
    results,
  };

  validateOutputSchema(output);

  return {
    output,
    table: {
      columns: CANONICAL_COLUMNS,
      rows: canonicalDisplaySort(results),
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * Utility: creates a minimal mock universe for local/offline demo and tests.
 * This is NOT the factor model. Values are deterministic and intended for UI/test scaffolding only.
 */
export function makeMockUniverse(size = 250) {
  const sectors = ["Tech", "Healthcare", "Industrials", "Financials", "Consumer", "Energy", "Utilities"];

  // A small but recognizable tradable universe seed. We cycle through these for mock-only demos.
  // INTC must always exist in-universe.
  const tradableSeed = [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "GOOGL",
    "META",
    "TSLA",
    "AVGO",
    "AMD",
    "INTC",
    "QCOM",
    "ADBE",
    "CRM",
    "ORCL",
    "NFLX",
    "CSCO",
    "IBM",
    "UBER",
    "SHOP",
    "PYPL",
    "SNOW",
    "PLTR",
    "JPM",
    "BAC",
    "WFC",
    "GS",
    "V",
    "MA",
    "AXP",
    "XOM",
    "CVX",
    "COP",
    "CAT",
    "DE",
    "BA",
    "GE",
    "UNH",
    "JNJ",
    "PFE",
    "LLY",
    "MRK",
    "COST",
    "WMT",
    "HD",
    "LOW",
    "NKE",
    "DIS",
  ];

  /**
   * Deterministic pseudo-random generator (LCG) so results are stable across runs and tests.
   */
  const mkRng = (seed) => {
    let state = seed >>> 0;
    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296; // [0,1)
    };
  };

  /**
   * Create representative 43-factor inputs.
   * We purposely provide model_factors_43 for every ticker so mock-only mode exercises the
   * full-universe ranking compute path (computePredicted1DayGrowthPctFromFactors).
   */
  const mkFactors43 = (ticker, idx) => {
    // Mix ticker chars into a stable seed.
    let s = 2166136261;
    for (let i = 0; i < ticker.length; i++) {
      s ^= ticker.charCodeAt(i);
      s = Math.imul(s, 16777619);
    }
    s ^= idx * 2654435761;
    const rnd = mkRng(s >>> 0);

    // Base "quality" centered near 0.5; add gentle dispersion.
    const base = 0.42 + rnd() * 0.16; // [0.42, 0.58]

    // Ensure INTC is present and not an outlier: slightly under 0.5 to make it often outside top10.
    const intcBias = ticker.toUpperCase() === "INTC" ? -0.03 : 0;

    const inputs = {};
    for (let f = 1; f <= 43; f++) {
      const id = `f${String(f).padStart(2, "0")}`;

      // A smooth factor profile: base + small jitter + mild trend by factor id.
      const jitter = (rnd() - 0.5) * 0.14; // [-0.07, +0.07]
      const factorTrend = ((f - 22) / 44) * 0.06; // approx [-0.03, +0.03]
      let v = base + jitter + factorTrend + intcBias;

      // Clamp to [0,1] since model supports already-normalized inputs.
      v = Math.max(0, Math.min(1, v));

      // Round for stable snapshots and to avoid tiny float diffs.
      inputs[id] = Math.round(v * 10000) / 10000;
    }
    return inputs;
  };

  const universe = [];
  for (let i = 0; i < size; i++) {
    // Use recognizable tickers first; then fill with synthetic tickers.
    const ticker =
      i < tradableSeed.length ? tradableSeed[i] : `T${String(i - tradableSeed.length).padStart(4, "0")}`;

    const sector = sectors[i % sectors.length];

    // Keep 3/6/12 month returns deterministic and plausible.
    // These are not used for ranking but are required in the canonical output schema.
    const baseRet = 6.5 - i * 0.015; // slow drift downward
    universe.push({
      ticker,
      company_name: ticker === "INTC" ? "Intel" : `Company ${ticker}`,
      sector,
      model_factors_43: mkFactors43(ticker, i),
      "3_month": toPct(baseRet + 1.2),
      "6_month": toPct(baseRet + 3.4),
      "12_month": toPct(baseRet + 7.9),
    });
  }

  // Guarantee INTC exists even if caller requests a very small size.
  if (!universe.some((u) => u.ticker.toUpperCase() === "INTC")) {
    universe.push({
      ticker: "INTC",
      company_name: "Intel",
      sector: "Tech",
      model_factors_43: mkFactors43("INTC", size + 999),
      "3_month": toPct(2.1),
      "6_month": toPct(4.2),
      "12_month": toPct(8.8),
    });
  }

  return universe;
}
