export default function ColumnHeader({
  title,
  dot,
  count,
}: {
  title: string;
  dot: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-[9px] px-[18px] pb-3 pt-4">
      <span
        className="h-[11px] w-[11px] rounded-full"
        style={{ background: dot }}
      />
      <span className="font-display text-[15.5px] font-semibold text-ink">
        {title}
      </span>
      <span className="ml-auto min-w-6 rounded-[20px] bg-chip px-2 py-0.5 text-center text-[12.5px] font-bold text-muted">
        {count}
      </span>
    </div>
  );
}
