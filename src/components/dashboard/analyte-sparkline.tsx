type Point = { date: string; value: number };

type Props = {
  points: Point[];
  className?: string;
  /** Optional height in px */
  height?: number;
};

/**
 * Lightweight SVG sparkline — no chart library.
 */
export function AnalyteSparkline({ points, className = "", height = 48 }: Props) {
  if (points.length < 2) {
    return (
      <div
        className={`flex h-12 items-center text-xs text-zinc-400 ${className}`}
        style={{ minHeight: height }}
      >
        {points.length === 1 ? "Need more results for a trend" : "No numeric points"}
      </div>
    );
  }

  const w = 200;
  const h = height;
  const pad = 4;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.value - min) / range) * (h - pad * 2);
    return { x, y };
  });

  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`w-full max-w-[240px] text-zinc-800 ${className}`}
      height={height}
      role="img"
      aria-label="Analyte trend sparkline"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 2.5 : 1.5} fill="currentColor" />
      ))}
    </svg>
  );
}
