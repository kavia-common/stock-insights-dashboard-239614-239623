import React from "react";

// PUBLIC_INTERFACE
export function Table({ columns, rows, rowKey }) {
  /** Render a simple table. columns: [{key, header, render?}] */
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={rowKey ? rowKey(r) : idx}>
            {columns.map((c) => (
              <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
