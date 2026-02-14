import React, { useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";

// PUBLIC_INTERFACE
export function AppLayout({ counts }) {
  /** Application layout with top nav, global search, and collapsible sidebar. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ sector: "", minChangePct: "" });

  const navigate = useNavigate();

  const normalizedQuery = useMemo(() => query.trim().toUpperCase(), [query]);

  // A simple behavior: if user types a ticker-like query and presses Enter, route to details.
  const onQueryChange = (v) => setQuery(v);

  const onKeyDownCapture = (e) => {
    if (e.key === "Enter" && normalizedQuery) {
      // Route to details for single token tickers.
      const token = normalizedQuery.split(/\s+/)[0];
      if (/^[A-Z.]{1,8}$/.test(token)) {
        navigate(`/stocks/${encodeURIComponent(token)}`);
      }
    }
  };

  return (
    <div className="appShell" onKeyDownCapture={onKeyDownCapture}>
      <TopNav query={query} onQueryChange={onQueryChange} onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
      <div className="shellBody">
        <Sidebar
          collapsed={sidebarCollapsed}
          filters={filters}
          onChangeFilters={setFilters}
          counts={counts}
        />
        <main className="main">
          <Outlet context={{ query, filters }} />
          <footer style={{ padding: "18px 4px", color: "var(--text-muted)", fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span>© {new Date().getFullYear()} Stock Insights Dashboard</span>
              <span>
                Data may be simulated when backend is unavailable. Theme: Ocean Professional.
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
