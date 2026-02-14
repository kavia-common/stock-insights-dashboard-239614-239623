import React from "react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

function formatNum(n) {
  if (typeof n === "number") {
    if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(n);
}

// PUBLIC_INTERFACE
export function SummaryCard({ label, value, deltaPct }) {
  /** KPI card. */
  const up = typeof deltaPct === "number" ? deltaPct >= 0 : true;
  const tone = up ? "blue" : "amber";
  const sign = typeof deltaPct === "number" ? (deltaPct >= 0 ? "+" : "") : "";
  const badgeText =
    typeof deltaPct === "number" ? `${sign}${deltaPct.toFixed(2)}%` : typeof deltaPct === "string" ? deltaPct : "";

  return (
    <Card title={label} meta="Last close">
      <div className="kpiValue mono">{formatNum(value)}</div>
      <div className="kpiSub">
        <Badge tone={tone}>{badgeText || "—"}</Badge>
      </div>
    </Card>
  );
}
