export type DonutSegment = { label: string; value: number; color: string };

// Dependency-free donut chart: each segment is a circle stroke with
// pathLength-style math (r chosen so the circumference is exactly 100).
export default function Donut({
  segments,
  centerLabel,
  centerSub,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerSub: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let acc = 0;

  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="none"
          stroke="var(--chip)"
          strokeWidth="5.5"
        />
        {total > 0 &&
          segments.map((s) => {
            const pct = (s.value / total) * 100;
            const segment = (
              <circle
                key={s.label}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke={s.color}
                strokeWidth="5.5"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={-acc}
              />
            );
            acc += pct;
            return segment;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="font-display text-[15px] font-semibold leading-tight text-ink">
          {centerLabel}
        </span>
        <span className="text-[11.5px] font-bold text-muted">{centerSub}</span>
      </div>
    </div>
  );
}
