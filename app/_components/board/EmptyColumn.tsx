import type { ColumnId } from "@/lib/cards";

// Per-stage empty-state mascot. Each column has its own artwork.
const MASCOT: Record<ColumnId, string> = {
  todo: "/todo-todo-not-found.png",
  doing: "/inprogress-todo-not-found.png",
  backlog: "/backlog-todo-not-found.png",
  done: "/done-todo-not-found.png",
};

// Empty-state mascot for a stage with no cards. `size="sm"` fits the tighter
// desktop columns; default suits the full-width mobile panels.
export default function EmptyColumn({
  stage,
  title,
  size = "md",
}: {
  stage: ColumnId;
  title: string;
  size?: "sm" | "md";
}) {
  const img = size === "sm" ? 80 : 96;
  return (
    <div
      className={`flex flex-col items-center gap-2.5 ${size === "sm" ? "py-6" : "py-8"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset, skip the optimizer */}
      <img
        src={MASCOT[stage]}
        alt=""
        width={img}
        height={img}
        className="rounded-[18px]"
      />
      <p
        className={`m-0 text-center font-semibold text-muted ${
          size === "sm" ? "text-[13.5px]" : "text-[14.5px]"
        }`}>
        No cards in {title}.
      </p>
    </div>
  );
}
