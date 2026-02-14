import React from "react";

// PUBLIC_INTERFACE
export function Card({ title, meta, actions, children, className = "" }) {
  /** Surface card wrapper with optional title/meta/actions header. */
  return (
    <section className={`card ${className}`.trim()}>
      {(title || meta || actions) && (
        <div className="cardHeader">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="cardTitle">{title}</h3>}
            {meta && <div className="cardMeta">{meta}</div>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
