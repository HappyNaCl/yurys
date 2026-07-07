// Empty-state mascot for a stage with no cards. `size="sm"` fits the tighter
// desktop columns; default suits the full-width mobile panels.
export default function EmptyColumn({
  title,
  size = "md",
}: {
  title: string;
  size?: "sm" | "md";
}) {
  const img = size === "sm" ? 80 : 96;
  return (
    <div
      className={`flex flex-col items-center gap-2.5 ${size === "sm" ? "py-6" : "py-8"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset, skip the optimizer */}
      <img src="/todo-not-found.webp" alt="" width={img} height={img} />
      <p
        className={`m-0 text-center font-semibold text-muted ${
          size === "sm" ? "text-[13.5px]" : "text-[14.5px]"
        }`}
      >
        No cards in {title}.
      </p>
    </div>
  );
}
