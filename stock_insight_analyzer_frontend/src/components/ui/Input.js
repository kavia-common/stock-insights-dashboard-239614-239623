import React from "react";

// PUBLIC_INTERFACE
export function Input({ className = "", ...props }) {
  /** Themed input control. */
  return <input className={`input ${className}`.trim()} {...props} />;
}
