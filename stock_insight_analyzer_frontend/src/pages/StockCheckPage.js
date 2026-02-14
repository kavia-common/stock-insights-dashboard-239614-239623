import React, { useMemo, useState } from "react";
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
    } catch (e) {
      setLastOutput(null);
      setLastTable(null);
      setError(e?.message || String(e));
    }
  };

  const columns = useMemo(() => {
    // Locked order in spec; map to keys
    const map = {
      Rank: { key: "rank", header: "Rank", render: (r) => <span className="mono">{r.rank}</span> },
      Ticker: { key: "ticker", header: "Ticker", render: (r) => <span className="mono">{r.ticker}</span> },
      "Company Name": { key: "company_name", header: "Company Name" },
      Sector: { key: "sector", header: "Sector" },
      "Current Price": { key: "current_price", header: "Current Price", render: (r) => <span className="mono">{fmtMoney(r.current_price)}</span> },
      "Predicted Price": { key: "predicted_price", header: "Predicted Price", render: (r) => <span className="mono">{fmtMoney(r.predicted_price)}</span> },
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

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Stock Check</h1>
          <p>
            <span className="mono">Stock Check (43-Factor Model) — v1.0</span> • Locked spec execution UI (forward-honest).
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {lastOutput?.trade_header ? (
            <Badge tone={lastOutput.trade_header === "TRADE" ? "blue" : "amber"}>
              {lastOutput.trade_header}
            </Badge>
          ) : (
            <Badge tone="amber">Not run</Badge>
          )}
          {lastOutput?.sector_warning ? <Badge tone="amber">Sector Warning</Badge> : null}
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div style={{ gridColumn: "span 12" }}>
          <Card
            title="Inputs (required)"
            meta="System must NOT fetch or hallucinate price data."
            actions={
              <Button variant="ghost" onClick={prepareTickers}>
                Prepare tickers
              </Button>
            }
          >
            <div className="small" style={{ marginBottom: 10, lineHeight: 1.5 }}>
              Required inputs: <span className="mono">Current_Date</span>, <span className="mono">Prediction_Date</span>, and
              user-supplied <span className="mono">EOD_Prices</span> for each output ticker.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
              <label className="small" style={{ gridColumn: "span 3" }}>
                Current Date
                <Input value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </label>
              <label className="small" style={{ gridColumn: "span 3" }}>
                Prediction Date
                <Input value={predictionDate} onChange={(e) => setPredictionDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </label>
              <label className="small" style={{ gridColumn: "span 4", display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={macroOverrideNoTrade}
                  onChange={(e) => setMacroOverrideNoTrade(e.target.checked)}
                />
                Optional Macro Override (force NO TRADE)
              </label>

              <div style={{ gridColumn: "span 2", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                <Button variant="primary" onClick={onRun} disabled={runTickers.length === 0}>
                  Run
                </Button>
              </div>
            </div>

            {runTickers.length === 0 ? (
              <div className="small" style={{ marginTop: 10 }}>
                Click <strong>Prepare tickers</strong> to determine the output tickers (Top 10 + INTC) and enter EOD prices.
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div className="small" style={{ marginBottom: 8 }}>
                  Enter EOD prices (required). Missing any price will produce an error (forward-honest).
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
                  {runTickers.map((t) => (
                    <label key={t} className="small">
                      <span className="mono">{t}</span> EOD
                      <Input
                        value={priceInputs[t] ?? ""}
                        onChange={(e) => setPriceInputs((p) => ({ ...p, [t]: e.target.value }))}
                        placeholder="e.g., 123.45"
                        inputMode="decimal"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error ? (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(239, 68, 68, 0.06)" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Error (forward-honest)</div>
                <div className="mono" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
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
            {lastTable?.rows?.length ? (
              <Table columns={columns} rows={lastTable.rows} rowKey={(r) => `${r.rank}-${r.ticker}`} />
            ) : (
              <div className="small">No results yet. Prepare tickers, enter EOD prices, and Run.</div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid">
        <div style={{ gridColumn: "span 12" }}>
          <Card title="Strict JSON Output" meta="Exact schema required by Stock Check v1.0 (locked).">
            {lastOutput ? (
              <pre
                className="mono"
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "rgba(17, 24, 39, 0.02)",
                  overflow: "auto",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {JSON.stringify(lastOutput, null, 2)}
              </pre>
            ) : (
              <div className="small">Run the model to generate the strict JSON output object.</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
