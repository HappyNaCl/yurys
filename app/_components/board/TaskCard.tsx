import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { formatCardSchedule, TAGS, type Card } from "@/lib/cards";
import Icon from "../Icon";

// Shared card shell for both boards. Slots:
// - `corner`: absolutely-positioned control in the top-right (mobile's X);
//   its presence adds right padding so content doesn't run under it.
// - `dateRowExtra`: rendered inline after the date (desktop's ⋯ menu button).
// - `footer`: rendered after the date row (mobile's advance button, desktop's
//   menu popover).
// Remaining props (draggable, drag handlers, className) spread onto <article>.
export default function TaskCard({
  card,
  corner,
  dateRowExtra,
  footer,
  className = "",
  ...articleProps
}: {
  card: Card;
  corner?: ReactNode;
  dateRowExtra?: ReactNode;
  footer?: ReactNode;
} & ComponentPropsWithoutRef<"article">) {
  const padRight = corner ? "pr-8" : "";
  return (
    <article
      className={`relative rounded-[14px] border-[1.5px] border-line-soft bg-card p-3.5 shadow-[0_2px_6px_-3px_rgba(43,30,44,0.12)] ${className}`}
      {...articleProps}
    >
      {corner}
      <div className={`mb-[9px] flex flex-wrap gap-1.5 ${padRight}`}>
        {card.tags.map((tag) => {
          const [tagBg, tagFg] = TAGS[tag] ?? TAGS.Task;
          return (
            <span
              key={tag}
              className="rounded-lg px-2.5 py-[3px] text-[11.5px] font-extrabold tracking-[0.02em]"
              style={{ background: tagBg, color: tagFg }}
            >
              {tag}
            </span>
          );
        })}
      </div>
      <p
        className={`m-0 text-[15px] font-bold leading-[1.35] text-ink ${
          card.desc ? "mb-1" : "mb-3"
        } ${padRight}`}
      >
        {card.title}
      </p>
      {card.desc && (
        <p
          className={`m-0 mb-3 line-clamp-2 text-[13px] font-semibold leading-snug text-muted ${padRight}`}
        >
          {card.desc}
        </p>
      )}
      <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-muted">
        <Icon name="calendar_month" size={15} />
        {formatCardSchedule(card)}
        {dateRowExtra}
      </div>
      {footer}
    </article>
  );
}
