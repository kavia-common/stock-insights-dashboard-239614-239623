import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { getStockDetails } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { MiniChart } from "../components/charts/MiniChart";

function fmt(n) {
  if (typeof n !== "number") return String(n ?? "—");
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// PUBLIC_INTERFACE
export default function DetailsPage() {
  /** Stock details page for a ticker symbol. */
  const { symbol } = useParams();
  const { query } = useOutletContext() || { query: "" };
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    getStockDetails(symbol).then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, [symbol]);

  const title = useMemo(() => (data ? `${data.symbol} — ${data.name}` : `${symbol}`), [data, symbol]);

  if (!data) {
    return (
      <div className="card">
        <div className="small">Loading details for <span className="mono">{symbol}</span>…</div>
      </div>
    );
  }

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>{title}</h1>
          <p>
            Price <span className="mono">{fmt(data.price)}</span> • Change{" "}
            <Badge tone={data.changePct >= 0 ? "blue" : "amber"}>
              <span className="mono">{data.changePct >= 0 ? "+" : ""}{data.changePct.toFixed(2)}%</span>
            </Badge>
            {query ? <span className="small"> • Search: “{query}”</span> : null}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/" className="btn">← Dashboard</Link>
          <Link to="/watchlist" className="btn btnPrimary">View Watchlist</Link>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div style={{ gridColumn: "span 8" }}>
          <Card title="30-day trend" meta="Simulated when offline">
            <MiniChart data={data.series} type="line" />
          </Card>
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card title="Key stats" meta="Snapshot">
            <div style={{ display: "grid", gap: 10 }}>
              <div className="small">P/E <span className="mono" style={{ float: "right" }}>{data.stats.pe}</span></div>
              <div className="small">EPS <span className="mono" style={{ float: "right" }}>{data.stats.eps}</span></div>
              <div className="small">Beta <span className="mono" style={{ float: "right" }}>{data.stats.beta}</span></div>
              <div className="small">Market cap <span className="mono" style={{ float: "right" }}>{data.stats.marketCap}</span></div>
              <div className="small">Div. yield <span className="mono" style={{ float: "right" }}>{data.stats.divYield}</span></div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid">
        <div style={{ gridColumn: "span 12" }}>
          <Card title="Insights" meta="Actionable signals">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
              {data.insights.map((i) => (
                <div key={i.label} className="card" style={{ padding: 12, boxShadow: "none" }}>
                  <div className="small">{i.label}</div>
                  <div className="mono" style={{ fontSize: 16, marginTop: 6 }}>{String(i.value)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
