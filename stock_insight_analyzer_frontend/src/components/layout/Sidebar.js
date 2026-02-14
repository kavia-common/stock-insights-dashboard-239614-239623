import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

const linkStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 10px",
  borderRadius: "12px",
  border: `1px solid var(--border)`,
  background: isActive ? "rgba(37, 99, 235, 0.10)" : "rgba(255,255,255,0.65)",
  boxShadow: isActive ? "var(--shadow-sm)" : "none",
  marginBottom: 8,
  transition: "background 120ms ease, transform 120ms ease",
});

// PUBLIC_INTERFACE
export function Sidebar({ collapsed, filters, onChangeFilters, counts }) {
  /** Collapsible sidebar with primary nav and filter controls. */
  return (
    <aside className={`sidebar ${collapsed ? "sidebarCollapsed" : ""}`.trim()}>
      <div className="sidebarSection">
        <div className="sidebarTitle">Navigation</div>

        <NavLink to="/" style={linkStyle} end>
          <span>Dashboard</span>
          {!collapsed && <Badge>{counts?.dashboard ?? "•"}</Badge>}
        </NavLink>
        <NavLink to="/watchlist" style={linkStyle}>
          <span>Watchlist</span>
          {!collapsed && <Badge tone="amber">{counts?.watchlist ?? 0}</Badge>}
        </NavLink>
        <NavLink to="/news" style={linkStyle}>
          <span>News</span>
          {!collapsed && <Badge>{counts?.news ?? 0}</Badge>}
        </NavLink>
        <NavLink to="/settings" style={linkStyle}>
          <span>Settings</span>
          {!collapsed && <Badge tone="amber">New</Badge>}
        </NavLink>
      </div>

      {!collapsed && (
        <div className="sidebarSection">
          <div className="sidebarTitle">Filters</div>

          <div style={{ display: "grid", gap: 10 }}>
            <label className="small">
              Sector
              <Input
                value={filters.sector}
                onChange={(e) => onChangeFilters({ ...filters, sector: e.target.value })}
                placeholder="e.g., Tech"
              />
            </label>

            <label className="small">
              Min. change %
              <Input
                value={filters.minChangePct}
                onChange={(e) => onChangeFilters({ ...filters, minChangePct: e.target.value })}
                placeholder="e.g., 0.5"
                inputMode="decimal"
              />
            </label>

            <Button variant="ghost" onClick={() => onChangeFilters({ sector: "", minChangePct: "" })}>
              Reset filters
            </Button>
          </div>
        </div>
      )}

      {!collapsed && (
        <Card
          title="Tip"
          meta="Keyboard"
          className="sidebarSection"
          actions={<span className="small">⌘K</span>}
        >
          <div className="small">Use global search to jump to a ticker detail page quickly.</div>
        </Card>
      )}
    </aside>
  );
}
