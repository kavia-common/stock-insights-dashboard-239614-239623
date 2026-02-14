import React from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

// PUBLIC_INTERFACE
export function TopNav({ query, onQueryChange, onToggleSidebar }) {
  /** Top navigation bar with global search and sidebar toggle. */
  return (
    <header className="topNav">
      <div className="brand">
        <div className="brandMark" aria-hidden="true" />
        <div className="brandText">
          <strong>Stock Insights</strong>
          <span>Ocean Professional</span>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 620 }}>
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search ticker (e.g., AAPL, NVDA) or keyword…"
          aria-label="Global search"
        />
      </div>

      <div className="navActions">
        <Button variant="ghost" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          Filters
        </Button>
        <Button variant="primary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Overview
        </Button>
      </div>
    </header>
  );
}
