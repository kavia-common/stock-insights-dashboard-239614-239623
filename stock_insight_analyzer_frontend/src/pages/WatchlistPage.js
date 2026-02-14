import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getWatchlist } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

// PUBLIC_INTERFACE
export default function WatchlistPage() {
  /** Watchlist page. */
  const { query } = useOutletContext() || { query: "" };
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    getWatchlist().then((d) => mounted && setRows(d));
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toUpperCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.symbol} ${r.name}`.toUpperCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Watchlist</h1>
          <p>Track your core names and open a detail view with one click.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/" className="btn btnGhost">Dashboard</Link>
          <Link to="/news" className="btn btnPrimary">Read News</Link>
        </div>
      </div>

      <Card title="Symbols" meta={`${filtered.length} shown`}>
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
            { key: "name", header: "Name" },
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
            { key: "rating", header: "Rating" },
          ]}
          rows={filtered}
          rowKey={(r) => r.symbol}
        />
      </Card>
    </>
  );
}
