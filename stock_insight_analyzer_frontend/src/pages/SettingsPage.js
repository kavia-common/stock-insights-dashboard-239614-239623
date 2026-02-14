import React, { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { getApiBaseUrl, getWsUrl } from "../config/env";

// PUBLIC_INTERFACE
export default function SettingsPage() {
  /** Settings page. */
  const [reducedMotion, setReducedMotion] = useState(false);

  const env = useMemo(
    () => ({
      apiBase: getApiBaseUrl() || "(not set — using mock fallback)",
      wsUrl: getWsUrl() || "(not set)",
      nodeEnv: process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || "(unknown)",
    }),
    []
  );

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Settings</h1>
          <p>Configure connectivity and UI preferences.</p>
        </div>
        <Badge tone="blue">Ocean Professional</Badge>
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div style={{ gridColumn: "span 7" }}>
          <Card title="Connectivity" meta="Environment variables">
            <div style={{ display: "grid", gap: 10 }}>
              <div className="small">
                API base <span className="mono" style={{ float: "right" }}>{env.apiBase}</span>
              </div>
              <div className="small">
                WS URL <span className="mono" style={{ float: "right" }}>{env.wsUrl}</span>
              </div>
              <div className="small">
                Environment <span className="mono" style={{ float: "right" }}>{env.nodeEnv}</span>
              </div>
            </div>
            <div className="small" style={{ marginTop: 12 }}>
              Note: if the backend is unavailable, the app automatically uses mock data so the UI remains usable.
            </div>
          </Card>
        </div>

        <div style={{ gridColumn: "span 5" }}>
          <Card title="Preferences" meta="Accessibility">
            <div style={{ display: "grid", gap: 10 }}>
              <label className="small" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
                Reduce motion (local demo)
              </label>

              <Button
                variant="ghost"
                onClick={() => {
                  document.documentElement.style.scrollBehavior = reducedMotion ? "smooth" : "auto";
                }}
              >
                Apply
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Card title="About" meta="Build info">
        <div className="small" style={{ lineHeight: 1.6 }}>
          This dashboard is a frontend-only experience with resilient API calls. Configure <span className="mono">REACT_APP_API_BASE</span>{" "}
          or <span className="mono">REACT_APP_BACKEND_URL</span> to connect to a backend; otherwise mock data is used.
        </div>
      </Card>
    </>
  );
}
