import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getNews } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

function timeAgo(ts) {
  const delta = Math.max(0, Date.now() - ts);
  const m = Math.round(delta / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

// PUBLIC_INTERFACE
export default function NewsPage() {
  /** News feed page. */
  const { query } = useOutletContext() || { query: "" };
  const [items, setItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    getNews().then((d) => mounted && setItems(d));
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toUpperCase();
    if (!q) return items;
    return items.filter((n) => `${n.title} ${n.summary} ${(n.symbols || []).join(" ")}`.toUpperCase().includes(q));
  }, [items, query]);

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>News</h1>
          <p>Curated headlines with symbol context. Use search to filter by ticker or keyword.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/watchlist" className="btn btnPrimary">Watchlist</Link>
        </div>
      </div>

      <div className="grid">
        {filtered.map((n) => (
          <div key={n.id} style={{ gridColumn: "span 6" }}>
            <Card
              title={n.title}
              meta={`${n.source} • ${timeAgo(n.ts)}`}
              actions={<Badge tone="amber">{(n.symbols || []).length} symbols</Badge>}
            >
              <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>{n.summary}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {(n.symbols || []).map((s) => (
                  <Link key={s} to={`/stocks/${encodeURIComponent(s)}`} className="badge">
                    <span className="mono">{s}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}
