"use client";

import { useRef, useState } from "react";
import { COLUMNS, type Card, type ColumnId } from "@/lib/cards";
import Icon from "./Icon";
import CardSkeletons from "./board/CardSkeletons";
import ColumnHeader from "./board/ColumnHeader";
import EmptyColumn from "./board/EmptyColumn";
import TaskCard from "./board/TaskCard";

// One-tap flow on mobile: cards advance a step, except backlog items which
// complete directly.
const NEXT_STEP: Record<ColumnId, ColumnId | null> = {
  backlog: "done",
  todo: "doing",
  doing: "done",
  done: null,
};

const columnTitle = (id: ColumnId) => COLUMNS.find((c) => c.id === id)!.title;

type Column = (typeof COLUMNS)[number] & { cards: Card[] };

export default function MobileBoard({
  columns,
  tagColors,
  loading,
  onMove,
  onDelete,
}: {
  columns: Column[];
  tagColors: Record<string, string>;
  loading: boolean;
  onMove: (id: string, col: ColumnId) => void;
  onDelete: (id: string) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.offsetWidth + 12; // panel width + gap-3
    setActiveIdx(
      Math.max(
        0,
        Math.min(columns.length - 1, Math.round(el.scrollLeft / step)),
      ),
    );
  }

  function scrollToPanel(idx: number) {
    trackRef.current?.children[idx]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }

  return (
    <div className="flex flex-1 flex-col md:hidden">
      {/* Stage pager — one panel per stage, swipe left/right */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3">
        {columns.map((col) => {
          const nextStep = NEXT_STEP[col.id];
          return (
            <section
              key={col.id}
              className="flex w-[calc(100%-1.5rem)] shrink-0 snap-center snap-always flex-col rounded-[18px] border-[1.5px] border-line-soft bg-panel">
              <ColumnHeader
                title={col.title}
                dot={col.dot}
                count={col.cards.length}
              />

              <div className="flex flex-col gap-3 px-3 pb-3.5 pt-1">
                {loading && <CardSkeletons className="h-28" />}

                {!loading && col.cards.length === 0 && (
                  <EmptyColumn stage={col.id} title={col.title} />
                )}

                {col.cards.map((card) => (
                  <TaskCard
                    key={card.id}
                    card={card}
                    tagColors={tagColors}
                    corner={
                      <button
                        onClick={() => onDelete(card.id)}
                        aria-label={`Delete "${card.title}"`}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-soft transition-colors hover:bg-primary/6 hover:text-primary">
                        <Icon name="close" size={16} />
                      </button>
                    }
                    footer={
                      nextStep && (
                        <button
                          onClick={() => onMove(card.id, nextStep)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-line bg-card py-[10px] text-[13.5px] font-bold text-ink-soft transition-colors active:bg-chip">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              background: COLUMNS.find(
                                (c) => c.id === nextStep,
                              )!.dot,
                            }}
                          />
                          Move to {columnTitle(nextStep)}
                          <Icon name="arrow_forward" size={15} />
                        </button>
                      )
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {/* Stage indicator dots */}
      <div className="flex items-center justify-center gap-2 pb-10">
        {columns.map((col, i) => (
          <button
            key={col.id}
            onClick={() => scrollToPanel(i)}
            aria-label={`Go to ${col.title}`}
            className={`h-2 rounded-full transition-all ${
              i === activeIdx ? "w-5" : "w-2 opacity-35"
            }`}
            style={{ background: col.dot }}
          />
        ))}
      </div>
    </div>
  );
}
