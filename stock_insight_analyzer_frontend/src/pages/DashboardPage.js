import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { getDashboard } from "../services/apiClient";
import { SummaryCard } from "../components/SummaryCard";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { MiniChart } from "../components/charts/MiniChart";

function formatTs(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function matchesQuery(row, q) {
  if (!q) return true;
  const s = `${row.symbol} ${row.signal}`.toUpperCase();
  return s.includes(q);
}

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Main dashboard page with summary, charts, and movers. */
  const { query, filters } = useOutletContext() || { query: "", filters: {} };
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    getDashboard().then((d) => mounted && setData(d));
    return () => {
      mounted = false;
    };
  }, []);

  const movers = useMemo(() => {
    const q = (query || "").trim().toUpperCase();
    const min = Number(filters?.minChangePct || "");
    return (data?.movers || [])
      .filter((m) => matchesQuery(m, q))
      .filter((m) => (Number.isFinite(min) ? Math.abs(m.changePct) >= min : true));
  }, [data, query, filters]);

  if (!data) {
    return (
      <div className="card">
        <div className="small">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Dashboard</h1>
          <p>
            Market pulse, portfolio trend and actionable movers. As of <span className="mono">{formatTs(data.market.asOf)}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Badge tone="blue">Sentiment: {data.market.sentiment}</Badge>
          <Badge tone="amber">VIX: {data.market.volatility}</Badge>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        {data.kpis.map((k) => (
          <div key={k.label} style={{ gridColumn: "span 3" }}>
            <SummaryCard label={k.label} value={k.value} deltaPct={k.deltaPct} />
          </div>
        ))}
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div style={{ gridColumn: "span 7" }}>
          <Card title="Portfolio trend" meta="5-day snapshot">
            <MiniChart data={data.series.portfolio} type="line" />
            <div className="small">Smooth transitions and subtle gradient fill reinforce the Ocean theme.</div>
          </Card>
        </div>
        <div style={{ gridColumn: "span 5" }}>
          <Card title="Volume activity" meta="5-day snapshot" actions={<Badge tone="amber">Activity</Badge>}>
            <MiniChart data={data.series.volume} type="bar" color="var(--color-accent)" />
            <div className="small">Use filters to focus on higher-magnitude movers.</div>
          </Card>
        </div>
      </div>

      <div className="grid">
        <div style={{ gridColumn: "span 12" }}>
          <Card
            title="Top movers"
            meta="Signals derived from short-term momentum & volatility"
            actions={<span className="small">Click a symbol to open details</span>}
          >
            <Table
              columns={[
                {
                  key: "symbol",
                  header: "Symbol",
                  render: (r) => (
                    <Link to={`/stocks/${encodeURIComponent(r.symbol)}`} className="mono" style={{ color: "var(--color-primary)" }}>
                      {r.symbol}
                    </Link>
                  ),
                },
                { key: "price", header: "Price", render: (r) => <span className="mono">{r.price.toFixed(2)}</span> },
                {
                  key: "changePct",
                  header: "Change",
                  render: (r) => (
                    <Badge tone={r.changePct >= 0 ? "blue" : "amber"}>
                      <span className="mono">{r.changePct >= 0 ? "+" : ""}{r.changePct.toFixed(2)}%</span>
                    </Badge>
                  ),
                },
                { key: "signal", header: "Signal" },
              ]}
              rows={movers}
              rowKey={(r) => r.symbol}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
