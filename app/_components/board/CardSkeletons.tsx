export default function CardSkeletons({
  className = "h-24",
}: {
  className?: string;
}) {
  return (
    <>
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`animate-pulse rounded-[14px] bg-chip ${className}`}
          aria-hidden
        />
      ))}
    </>
  );
}
