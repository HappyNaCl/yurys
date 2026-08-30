export type DonutSegment = { label: string; value: number; color: string };

// Dependency-free donut chart: each segment is a circle stroke with
// pathLength-style math (r chosen so the circumference is exactly 100).
// Pass `onSelect` to make the segments clickable — the picked one keeps its
// colour while the rest fade back.
export default function Donut({
  segments,
  centerLabel,
  centerSub,
  selected = null,
  onSelect,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerSub: string;
  selected?: string | null;
  onSelect?: (label: string | null) => void;
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
            const picked = selected === s.label;
            const segment = (
              <circle
                key={s.label}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke={s.color}
                // The picked slice steps forward; the rest step back. With
                // nothing picked every slice stays at full strength.
                strokeWidth={picked ? "7" : "5.5"}
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={-acc}
                opacity={selected === null || picked ? 1 : 0.25}
                className={
                  onSelect
                    ? "cursor-pointer transition-[opacity,stroke-width] focus:outline-none"
                    : undefined
                }
                onClick={
                  onSelect && (() => onSelect(picked ? null : s.label))
                }
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onKeyDown={
                  onSelect &&
                  ((e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    onSelect(picked ? null : s.label);
                  })
                }
                aria-label={
                  onSelect
                    ? `${s.label}, ${Math.round(pct)}% of spending`
                    : undefined
                }
              >
                <title>{`${s.label} · ${Math.round(pct)}%`}</title>
              </circle>
            );
            acc += pct;
            return segment;
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="font-display text-[15px] font-semibold leading-tight text-ink">
          {centerLabel}
        </span>
        <span className="text-[11.5px] font-bold text-muted">{centerSub}</span>
      </div>
    </div>
  );
}
