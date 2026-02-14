const MODEL43_SPEC_VERSION = "43-factor-spec@2026-02-14";

/**
 * Authoritative 43-factor definitions + weights sourced from user_input_ref attachment.
 * Total weight = 100%.
 *
 * Notes:
 * - This module ONLY defines the locked factor list and how to compute a weighted score.
 * - It does NOT fetch any data.
 */

/**
 * Factors are keyed with stable ids f01..f43 to avoid accidental renames.
 * `name` and `definition` are informational and can be shown in UI later if needed.
 */
const FACTORS_43 = [
  // I. Momentum & Price Structure (18%)
  { id: "f01", group: "Momentum & Price Structure", name: "5-Day Momentum", definition: "% change over 5 trading days", weightPct: 2.0 },
  { id: "f02", group: "Momentum & Price Structure", name: "10-Day Momentum", definition: "% change over 10 days", weightPct: 2.0 },
  { id: "f03", group: "Momentum & Price Structure", name: "20-Day Momentum", definition: "% change over 20 days", weightPct: 2.0 },
  { id: "f04", group: "Momentum & Price Structure", name: "50-Day Trend Position", definition: "% above/below 50DMA", weightPct: 2.5 },
  { id: "f05", group: "Momentum & Price Structure", name: "200-Day Trend Position", definition: "% above/below 200DMA", weightPct: 2.5 },
  { id: "f06", group: "Momentum & Price Structure", name: "RSI Compression", definition: "RSI normalized 0–100", weightPct: 2.0 },
  { id: "f07", group: "Momentum & Price Structure", name: "MACD Slope", definition: "Rate of change of MACD", weightPct: 2.0 },
  { id: "f08", group: "Momentum & Price Structure", name: "Breakout Velocity", definition: "Distance from 30-day high", weightPct: 3.0 },

  // II. Earnings & Revenue Acceleration (16%)
  { id: "f09", group: "Earnings & Revenue Acceleration", name: "EPS YoY Growth", definition: "Year-over-year EPS growth", weightPct: 3.0 },
  { id: "f10", group: "Earnings & Revenue Acceleration", name: "EPS QoQ Acceleration", definition: "Sequential acceleration", weightPct: 3.0 },
  { id: "f11", group: "Earnings & Revenue Acceleration", name: "Revenue YoY Growth", definition: "Revenue growth YoY", weightPct: 3.0 },
  { id: "f12", group: "Earnings & Revenue Acceleration", name: "Revenue QoQ Acceleration", definition: "Sequential revenue change", weightPct: 3.0 },
  { id: "f13", group: "Earnings & Revenue Acceleration", name: "Earnings Surprise", definition: "Last earnings beat %", weightPct: 2.0 },
  { id: "f14", group: "Earnings & Revenue Acceleration", name: "Forward Guidance Revision", definition: "Analyst upward revisions", weightPct: 2.0 },

  // III. Options & Flow Signals (14%)
  { id: "f15", group: "Options & Flow Signals", name: "Call/Put Volume Ratio", definition: "Relative bullish flow", weightPct: 3.0 },
  { id: "f16", group: "Options & Flow Signals", name: "Unusual Options Activity", definition: "Z-score vs 30-day avg", weightPct: 3.0 },
  { id: "f17", group: "Options & Flow Signals", name: "Open Interest Expansion", definition: "OI % increase", weightPct: 2.0 },
  { id: "f18", group: "Options & Flow Signals", name: "Dark Pool Flow Bias", definition: "Net institutional prints", weightPct: 3.0 },
  { id: "f19", group: "Options & Flow Signals", name: "Block Trade Accumulation", definition: "Large trade clustering", weightPct: 3.0 },

  // IV. Volatility Structure (10%)
  { id: "f20", group: "Volatility Structure", name: "Implied Volatility Rank", definition: "IV vs 1Y range", weightPct: 2.5 },
  { id: "f21", group: "Volatility Structure", name: "IV Skew", definition: "Call vs put skew", weightPct: 2.0 },
  { id: "f22", group: "Volatility Structure", name: "Volatility Compression", definition: "Bollinger Band width", weightPct: 2.5 },
  { id: "f23", group: "Volatility Structure", name: "ATR Expansion", definition: "ATR vs 20-day baseline", weightPct: 3.0 },

  // V. Relative Strength & Sector Rotation (12%)
  { id: "f24", group: "Relative Strength & Sector Rotation", name: "Relative Strength vs SPY", definition: "20-day relative return", weightPct: 3.0 },
  { id: "f25", group: "Relative Strength & Sector Rotation", name: "Relative Strength vs Sector ETF", definition: "Relative to sector", weightPct: 3.0 },
  { id: "f26", group: "Relative Strength & Sector Rotation", name: "Sector Momentum Rank", definition: "Sector percentile", weightPct: 3.0 },
  { id: "f27", group: "Relative Strength & Sector Rotation", name: "Cross-Sector Capital Rotation", definition: "ETF flow direction", weightPct: 3.0 },

  // VI. Liquidity & Institutional Behavior (10%)
  { id: "f28", group: "Liquidity & Institutional Behavior", name: "Volume Surge Ratio", definition: "Volume vs 30-day avg", weightPct: 3.0 },
  { id: "f29", group: "Liquidity & Institutional Behavior", name: "Institutional Ownership Change", definition: "QoQ change", weightPct: 2.5 },
  { id: "f30", group: "Liquidity & Institutional Behavior", name: "Insider Buying Activity", definition: "Net insider accumulation", weightPct: 2.5 },
  { id: "f31", group: "Liquidity & Institutional Behavior", name: "Short Interest Compression", definition: "Days-to-cover trend", weightPct: 2.0 },

  // VII. Risk Compression & Acceleration (10%)
  { id: "f32", group: "Risk Compression & Acceleration", name: "Beta Adjustment", definition: "Risk-normalized return", weightPct: 2.0 },
  { id: "f33", group: "Risk Compression & Acceleration", name: "Downside Deviation", definition: "30-day downside risk", weightPct: 2.0 },
  { id: "f34", group: "Risk Compression & Acceleration", name: "Price Gap Frequency", definition: "Positive gaps last 30d", weightPct: 2.0 },
  { id: "f35", group: "Risk Compression & Acceleration", name: "Accumulation/Distribution", definition: "Money flow trend", weightPct: 2.0 },
  { id: "f36", group: "Risk Compression & Acceleration", name: "Acceleration Curve Fit", definition: "2nd derivative momentum", weightPct: 2.0 },

  // VIII. Macro Overlay Inputs (10%)
  { id: "f37", group: "Macro Overlay Inputs", name: "Market Breadth", definition: "Adv/Decline ratio", weightPct: 2.0 },
  { id: "f38", group: "Macro Overlay Inputs", name: "VIX Direction", definition: "5-day VIX trend", weightPct: 2.0 },
  { id: "f39", group: "Macro Overlay Inputs", name: "Treasury Yield Trend", definition: "10Y rate direction", weightPct: 2.0 },
  { id: "f40", group: "Macro Overlay Inputs", name: "Dollar Index Trend", definition: "DXY direction", weightPct: 1.5 },
  { id: "f41", group: "Macro Overlay Inputs", name: "Fed Liquidity Proxy", definition: "Balance sheet change", weightPct: 1.5 },
  { id: "f42", group: "Macro Overlay Inputs", name: "Economic Surprise Index", definition: "Macro surprise score", weightPct: 0.5 },
  { id: "f43", group: "Macro Overlay Inputs", name: "Risk-On / Risk-Off Composite", definition: "Cross-asset signal", weightPct: 0.5 },
];

function sumWeightsPct() {
  return FACTORS_43.reduce((s, f) => s + f.weightPct, 0);
}

/**
 * Basic numeric guard for forward-honest behavior.
 */
function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Converts a weightPct (0..100) to a weight unit (0..1).
 */
function pctToUnit(pct) {
  return pct / 100;
}

/**
 * Default normalization:
 * - Accepts already-normalized factor inputs in [0,1]
 * - Also accepts z-scores and clamps to [0,1] using a sigmoid
 *
 * Rationale: user_input_ref allows "z-score or 0–1". We must remain deterministic and avoid
 * needing historical distributions.
 */
function normalizeFactorValue(v) {
  if (!isFiniteNumber(v)) return NaN;

  // If value appears to already be in [0,1], keep it.
  if (v >= 0 && v <= 1) return v;

  // Otherwise treat as a z-score-like value and compress to (0,1) via sigmoid.
  // Clamp z-score magnitude to avoid floating overflow.
  const z = Math.max(-12, Math.min(12, v));
  const sigmoid = 1 / (1 + Math.exp(-z));
  // Numerically stable: sigmoid is already in (0,1)
  return sigmoid;
}

/**
 * Deterministic mapping from weighted normalized score in [0,1] to predicted % growth.
 * This is a calibration choice (not specified in user_input_ref) but is required to produce
 * the engine's Predicted_1Day_Growth_% value.
 *
 * We keep it conservative and symmetric:
 * - score 0.5 => 0.0%
 * - score 1.0 => +3.0%
 * - score 0.0 => -3.0%
 */
function scoreToPredictedGrowthPct(score01) {
  const s = Math.max(0, Math.min(1, score01));
  const centered = s - 0.5; // [-0.5, +0.5]
  return centered * 6.0; // [-3.0, +3.0]
}

/**
 * PUBLIC_INTERFACE
 * Returns the locked factor definitions and weights.
 */
export function getModel43Spec() {
  /** Returns the locked 43-factor definitions and weights. */
  return {
    spec_version: MODEL43_SPEC_VERSION,
    total_weight_pct: sumWeightsPct(),
    factors: FACTORS_43.map((f) => ({ ...f })), // defensive copy
  };
}

/**
 * PUBLIC_INTERFACE
 * Computes weighted normalized score and Predicted_1Day_Growth_% given per-factor inputs.
 *
 * factorInputs format:
 * {
 *   f01: number, f02: number, ... f43: number
 * }
 *
 * Forward-honest rules:
 * - Missing any factor input throws an error (no partial computation).
 * - Non-finite inputs throw an error.
 *
 * Returns:
 * {
 *   predicted_1day_growth_pct: number,
 *   weighted_score_01: number
 * }
 */
export function computePredicted1DayGrowthPctFromFactors(factorInputs) {
  /** Compute predicted 1-day growth % from the locked 43-factor model, forward-honest. */
  if (!factorInputs || typeof factorInputs !== "object") {
    throw new Error("factorInputs must be an object keyed by f01..f43.");
  }

  let weightedScore = 0;
  let weightSum = 0;

  for (const f of FACTORS_43) {
    if (!(f.id in factorInputs)) {
      throw new Error(`Missing factor input: ${f.id} (${f.name}). Forward-honest: cannot compute partial model.`);
    }
    const raw = factorInputs[f.id];
    if (!isFiniteNumber(raw)) {
      throw new Error(`Invalid factor input for ${f.id} (${f.name}): must be a finite number.`);
    }
    const norm01 = normalizeFactorValue(raw);
    if (!isFiniteNumber(norm01)) {
      throw new Error(`Normalization failed for ${f.id} (${f.name}).`);
    }

    const w = pctToUnit(f.weightPct);
    weightedScore += norm01 * w;
    weightSum += w;
  }

  // Weight sum should be 1.0, but guard for floating error.
  if (!(weightSum > 0.999 && weightSum < 1.001)) {
    throw new Error(`Model weights do not sum to 100%. Got ${(weightSum * 100).toFixed(4)}%.`);
  }

  const score01 = Math.max(0, Math.min(1, weightedScore));
  const predictedPct = scoreToPredictedGrowthPct(score01);

  // Keep to 4 decimals for stability with existing engine behavior.
  const round4 = (n) => Math.round(n * 10000) / 10000;

  return {
    weighted_score_01: round4(score01),
    predicted_1day_growth_pct: round4(predictedPct),
  };
}
