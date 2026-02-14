import React from "react";

// PUBLIC_INTERFACE
export function Button({ variant = "default", className = "", ...props }) {
  /** Themed button component. Variants: default | primary | ghost */
  const variantClass =
    variant === "primary" ? "btn btnPrimary" : variant === "ghost" ? "btn btnGhost" : "btn";
  return <button className={`${variantClass} ${className}`.trim()} {...props} />;
}
