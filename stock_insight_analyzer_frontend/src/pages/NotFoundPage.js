import React from "react";
import { Link } from "react-router-dom";

// PUBLIC_INTERFACE
export default function NotFoundPage() {
  /** 404 page. */
  return (
    <div className="card">
      <h1 style={{ margin: 0, fontSize: 18 }}>Page not found</h1>
      <p className="small">The page you requested doesn’t exist. Return to the dashboard.</p>
      <Link to="/" className="btn btnPrimary">Go to dashboard</Link>
    </div>
  );
}
