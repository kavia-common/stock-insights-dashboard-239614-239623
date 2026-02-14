import React, { useMemo, useRef, useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Table } from "../components/ui/Table";
import { CANONICAL_COLUMNS, makeMockUniverse, runStockCheck } from "../services/stockCheck";

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextDayISO(iso) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtMoney(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return v.toFixed(2);
}

function fmtPct(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

/**
 * PUBLIC_INTERFACE
 */
export default function StockCheckPage() {
  /** Stock Check v1.0 page: locked-spec execution + canonical output/table rendering. */
  const [currentDate, setCurrentDate] = useState(todayISO());
  const [predictionDate, setPredictionDate] = useState(nextDayISO(todayISO()));
  const [macroOverrideNoTrade, setMacroOverrideNoTrade] = useState(false);

  const universe = useMemo(() => makeMockUniverse(250), []);

  // User-supplied EOD prices per output ticker. We do NOT fetch prices.
  const [priceInputs, setPriceInputs] = useState({});
  const [lastOutput, setLastOutput] = useState(null);
  const [lastTable, setLastTable] = useState(null);
  const [error, setError] = useState("");

  const [runTickers, setRunTickers] = useState([]); // tickers required for the current run (Top 10 + INTC)

  const errorRef = useRef(null);
  const resultsRef = useRef(null);
  const jsonRef = useRef(null);

  const prepareTickers = () => {
    // derive the required output tickers deterministically from the ranked universe (top10 + INTC)
    // we intentionally do not compute headers here; just identify required tickers for EOD price input UX.
    const sorted = [...universe].sort((a, b) => b.predicted_1day_growth_pct - a.predicted_1day_growth_pct);
    const top10 = sorted.slice(0, 10).map((r) => r.ticker.toUpperCase());
    const tickers = top10.includes("INTC") ? top10 : [...top10, "INTC"];
    setRunTickers(tickers);
    // keep existing inputs; do not autofill (forward-honest).
  };

  const onRun = () => {
    setError("");
    try {
      const eodPrices = {};
      for (const t of runTickers) {
        const raw = priceInputs[t];
        const n = typeof raw === "string" ? Number(raw) : raw;
        eodPrices[t] = n;
      }
      const { output, table } = runStockCheck({
        currentDate,
        predictionDate,
        universe,
        eodPrices,
        macroOverrideNoTrade,
      });
      setLastOutput(output);
      setLastTable(table);

      // UX: after a successful run, move focus to results for screen readers / keyboard users.
      // (No effect on locked-spec logic.)
      setTimeout(() => resultsRef.current?.focus?.(), 0);
    } catch (e) {
      setLastOutput(null);
      setLastTable(null);
      setError(e?.message || String(e));

      // UX: bring attention to the error message.
      setTimeout(() => errorRef.current?.focus?.(), 0);
    }
  };

  const columns = useMemo(() => {
    // Locked order in spec; map to keys
    const map = {
      Rank: { key: "rank", header: "Rank", render: (r) => <span className="mono">{r.rank}</span> },
      Ticker: { key: "ticker", header: "Ticker", render: (r) => <span className="mono">{r.ticker}</span> },
      "Company Name": { key: "company_name", header: "Company Name" },
      Sector: { key: "sector", header: "Sector" },
      "Current Price": {
        key: "current_price",
        header: "Current Price",
        render: (r) => <span className="mono">{fmtMoney(r.current_price)}</span>,
      },
      "Predicted Price": {
        key: "predicted_price",
        header: "Predicted Price",
        render: (r) => <span className="mono">{fmtMoney(r.predicted_price)}</span>,
      },
      "Predicted 1-Day % Growth": {
        key: "predicted_1day_growth_pct",
        header: "Predicted 1-Day % Growth",
        render: (r) => (
          <Badge tone={r.predicted_1day_growth_pct >= 0 ? "blue" : "amber"}>
            <span className="mono">{fmtPct(r.predicted_1day_growth_pct)}</span>
          </Badge>
        ),
      },
      "3-Month": { key: "3_month", header: "3-Month", render: (r) => <span className="mono">{fmtPct(r["3_month"])}</span> },
      "6-Month": { key: "6_month", header: "6-Month", render: (r) => <span className="mono">{fmtPct(r["6_month"])}</span> },
      "12-Month": { key: "12_month", header: "12-Month", render: (r) => <span className="mono">{fmtPct(r["12_month"])}</span> },
    };

    return CANONICAL_COLUMNS.map((c) => map[c]);
  }, []);

  const statusTone = lastOutput?.trade_header === "TRADE" ? "blue" : "amber";
  const statusText = lastOutput?.trade_header ? lastOutput.trade_header : "Not run";

  const prepareHelperId = "stockcheck-prepare-helper";
  const pricesHelperId = "stockcheck-prices-helper";

  return (
    <>
      <div className="pageHeader">
        <div style={{ minWidth: 0 }}>
          <h1>Stock Check</h1>
          <p style={{ maxWidth: 980 }}>
            <span className="mono">Stock Check (43-Factor Model) — v1.0</span> • Locked spec execution UI (forward-honest). This page
            never fetches EOD prices; all prices must be entered by the user.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Badge tone={statusTone}>{statusText}</Badge>
          {lastOutput?.sector_warning ? <Badge tone="amber">Sector Warning</Badge> : null}
          <Button
            variant="ghost"
            onClick={() => jsonRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" })}
            aria-label="Jump to strict JSON output"
          >
            View JSON
          </Button>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div style={{ gridColumn: "span 12" }}>
          <Card
            title="Inputs (required)"
            meta="System must NOT fetch or hallucinate price data."
            actions={
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={prepareTickers} aria-describedby={prepareHelperId}>
                  Prepare tickers
                </Button>
                <Button variant="primary" onClick={onRun} disabled={runTickers.length === 0} aria-disabled={runTickers.length === 0}>
                  Run
                </Button>
              </div>
            }
          >
            <div id={prepareHelperId} className="small" style={{ marginBottom: 12, lineHeight: 1.6 }}>
              Required inputs: <span className="mono">Current_Date</span>, <span className="mono">Prediction_Date</span>, and user-supplied{" "}
              <span className="mono">EOD_Prices</span> for each output ticker (Top 10 + INTC). This is intentionally forward-honest.
            </div>

            <div className="stockCheckInputsGrid">
              <label className="small">
                <span style={{ display: "inline-block", marginBottom: 6 }}>Current Date</span>
                <Input
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  aria-label="Current Date (YYYY-MM-DD)"
                />
              </label>

              <label className="small">
                <span style={{ display: "inline-block", marginBottom: 6 }}>Prediction Date</span>
                <Input
                  value={predictionDate}
                  onChange={(e) => setPredictionDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  aria-label="Prediction Date (YYYY-MM-DD)"
                />
              </label>

              <label className="small stockCheckMacroRow">
                <input
                  type="checkbox"
                  checked={macroOverrideNoTrade}
                  onChange={(e) => setMacroOverrideNoTrade(e.target.checked)}
                />
                <span>Optional Macro Override (force NO TRADE)</span>
              </label>
            </div>

            {runTickers.length === 0 ? (
              <div
                className="small"
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px dashed var(--border)",
                  background: "rgba(17, 24, 39, 0.02)",
                }}
              >
                Click <strong>Prepare tickers</strong> to determine the output tickers (Top 10 + INTC), then enter EOD prices to enable{" "}
                <strong>Run</strong>.
              </div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <div id={pricesHelperId} className="small" style={{ marginBottom: 10, lineHeight: 1.5 }}>
                  Enter EOD prices (required). Missing any price will produce an error (forward-honest).
                </div>

                <div className="stockCheckPricesGrid" role="group" aria-describedby={pricesHelperId}>
                  {runTickers.map((t) => (
                    <label key={t} className="small">
                      <span className="mono" style={{ display: "inline-block", marginBottom: 6 }}>
                        {t}
                      </span>
                      <Input
                        value={priceInputs[t] ?? ""}
                        onChange={(e) => setPriceInputs((p) => ({ ...p, [t]: e.target.value }))}
                        placeholder="e.g., 123.45"
                        inputMode="decimal"
                        aria-label={`${t} end-of-day price`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error ? (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                aria-live="polite"
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  background: "rgba(239, 68, 68, 0.06)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Error (forward-honest)</div>
                <div className="mono" style={{ fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {error}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div style={{ gridColumn: "span 12" }}>
          <Card
            title="Canonical Output Table"
            meta="Column order is permanently locked. Greens (positive) shown first; reds below; strict descending inside each."
          >
            <div
              ref={resultsRef}
              tabIndex={-1}
              aria-label="Canonical output table results"
              style={{ outline: "none" }}
            >
              {lastTable?.rows?.length ? (
                <div className="tableWrap" aria-label="Scrollable table container">
                  <Table columns={columns} rows={lastTable.rows} rowKey={(r) => `${r.rank}-${r.ticker}`} />
                </div>
              ) : (
                <div className="small">No results yet. Prepare tickers, enter EOD prices, and Run.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid">
        <div style={{ gridColumn: "span 12" }}>
          <Card title="Strict JSON Output" meta="Exact schema required by Stock Check v1.0 (locked).">
            <div ref={jsonRef}>
              {lastOutput ? (
                <pre className="mono stockCheckJson">{JSON.stringify(lastOutput, null, 2)}</pre>
              ) : (
                <div className="small">Run the model to generate the strict JSON output object.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
