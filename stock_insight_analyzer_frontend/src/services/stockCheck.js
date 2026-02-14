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
 * PUBLIC_INTERFACE
 * Executes the Stock Check v1.0 locked-spec flow.
 *
 * Inputs:
 * - currentDate (YYYY-MM-DD)
 * - predictionDate (YYYY-MM-DD)
 * - universe: full tradable ticker universe with required fields for ranking.
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
  // We do NOT compute the factor model here; we assume backend/inputs provide predicted_1day_growth_pct (locked weights).
  for (const u of universe) {
    if (typeof u?.ticker !== "string" || !u.ticker) throw new Error("Universe entries must include ticker");
    if (!isFiniteNumber(u.predicted_1day_growth_pct)) {
      throw new Error(
        `Missing predicted_1day_growth_pct for ${u.ticker}. Forward-honest: cannot rank on partial data.`
      );
    }
    if (typeof u.company_name !== "string" || !u.company_name) throw new Error(`Missing company_name for ${u.ticker}`);
    if (typeof u.sector !== "string" || !u.sector) throw new Error(`Missing sector for ${u.ticker}`);
    // 3/6/12 month returns required for output table
    if (!isFiniteNumber(u["3_month"])) throw new Error(`Missing 3_month for ${u.ticker}`);
    if (!isFiniteNumber(u["6_month"])) throw new Error(`Missing 6_month for ${u.ticker}`);
    if (!isFiniteNumber(u["12_month"])) throw new Error(`Missing 12_month for ${u.ticker}`);
  }

  const ranked = stableSortByPredictedGrowthDesc(universe);
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
  const universe = [];
  for (let i = 0; i < size; i++) {
    const ticker = i === 50 ? "INTC" : `T${String(i).padStart(3, "0")}`;
    const sector = sectors[i % sectors.length];
    const growth = toPct(2.2 - i * 0.01); // descending (some negative)
    universe.push({
      ticker,
      company_name: ticker === "INTC" ? "Intel" : `Company ${ticker}`,
      sector,
      predicted_1day_growth_pct: growth,
      "3_month": toPct(4.5 - i * 0.02),
      "6_month": toPct(8.2 - i * 0.03),
      "12_month": toPct(16.4 - i * 0.05),
    });
  }
  return universe;
}
