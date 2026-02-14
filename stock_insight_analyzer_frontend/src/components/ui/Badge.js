import React from "react";

// PUBLIC_INTERFACE
export function Badge({ tone = "blue", children }) {
  /** Small pill badge. tone: blue | amber */
  const cls = tone === "amber" ? "badge badgeAmber" : "badge";
  return <span className={cls}>{children}</span>;
}
