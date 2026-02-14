import React, { useMemo } from "react";

/**
 * Tiny chart using SVG to avoid external dependencies.
 */

function extent(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (!isFinite(min) || !isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

function scale(v, [min, max], size) {
  return ((v - min) / (max - min)) * size;
}

// PUBLIC_INTERFACE
export function MiniChart({ data, type = "line", height = 120, color = "var(--color-primary)" }) {
  /** Mini line/bar chart. data: [{t, v}] */
  const width = 520;
  const padding = 8;

  const values = useMemo(() => data.map((d) => d.v), [data]);
  const [min, max] = extent(values);

  const points = useMemo(() => {
    if (!data.length) return "";
    return data
      .map((d, i) => {
        const x = padding + (i * (width - padding * 2)) / Math.max(1, data.length - 1);
        const y = padding + (height - padding * 2) - scale(d.v, [min, max], height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, min, max, height]);

  if (!data.length) {
    return <div className="small">No data</div>;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Mini chart"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="fillGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {type === "bar" ? (
        data.map((d, i) => {
          const barW = (width - padding * 2) / data.length;
          const x = padding + i * barW + barW * 0.18;
          const h = scale(d.v, [0, max], height - padding * 2);
          const y = height - padding - h;
          return (
            <rect
              key={d.t}
              x={x}
              y={y}
              width={barW * 0.64}
              height={h}
              rx="6"
              fill={color}
              opacity="0.78"
            />
          );
        })
      ) : (
        <>
          <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" />
          <path
            d={`M ${points} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#fillGrad)"
          />
        </>
      )}
    </svg>
  );
}
