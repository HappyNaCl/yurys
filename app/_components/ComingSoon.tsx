export default function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[linear-gradient(150deg,#dc2b54,#7c5cbf)] text-white shadow-[0_12px_28px_-12px_rgba(220,43,84,0.6)]">
        {icon}
      </div>
      <div>
        <h1 className="m-0 font-display text-[26px] font-semibold text-ink">
          {title}
        </h1>
        <p className="m-0 mt-1.5 max-w-xs text-[14.5px] font-semibold text-muted">
          {description}
        </p>
      </div>
      <span className="rounded-full bg-chip px-3.5 py-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-muted">
        Coming soon
      </span>
    </main>
  );
}
