"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addCard,
  COLUMNS,
  deleteCard,
  moveCard,
  placeCard,
  subscribeToCards,
  type Card,
  type ColumnId,
  type NewCardData,
} from "@/lib/cards";
import Icon from "./Icon";
import CardSkeletons from "./board/CardSkeletons";
import ColumnHeader from "./board/ColumnHeader";
import EmptyColumn from "./board/EmptyColumn";
import TaskCard from "./board/TaskCard";
import MobileBoard from "./MobileBoard";
import NewTaskDialog from "./NewTaskDialog";
import { useUser } from "./UserContext";

export default function KanbanBoard() {
  const user = useUser();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => subscribeToCards(user.uid, setCards), [user.uid]);

  const columns = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        cards: (cards ?? [])
          .filter((c) => c.col === col.id)
          .sort((a, b) => a.order - b.order),
      })),
    [cards],
  );

  function createTodo(data: NewCardData) {
    // New tasks enter at the top of To Do.
    const todoCards = columns.find((c) => c.id === "todo")!.cards;
    const minOrder = todoCards.length
      ? Math.min(...todoCards.map((c) => c.order))
      : 0;
    addCard(user.uid, data, minOrder - 1);
  }

  function resetDrag() {
    setDragId(null);
    setDragOverCol(null);
    setDragOverCardId(null);
  }

  // Drop on a column body: append at the bottom (lowest priority).
  function handleDropOnColumn(colId: ColumnId) {
    const id = dragId;
    resetDrag();
    if (!id) return;
    const colCards = columns
      .find((c) => c.id === colId)!
      .cards.filter((c) => c.id !== id);
    const last = colCards[colCards.length - 1];
    placeCard(user.uid, id, colId, last ? last.order + 1 : 0);
  }

  // Drop on a card: insert above it (take its priority slot).
  function handleDropOnCard(colId: ColumnId, target: Card) {
    const id = dragId;
    resetDrag();
    if (!id || id === target.id) return;
    const colCards = columns.find((c) => c.id === colId)!.cards;
    const idx = colCards.findIndex((c) => c.id === target.id);
    const prev = colCards[idx - 1];
    if (prev?.id === id) return; // already directly above the target
    const order = prev ? (prev.order + target.order) / 2 : target.order - 1;
    placeCard(user.uid, id, colId, order);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Page toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-4 pb-1 pt-[26px] sm:px-7">
        <div className="mr-1 flex flex-col leading-[1.15] gap-4">
          <h1 className="m-0 font-display text-[26px] font-semibold text-ink">
            To-do list
          </h1>
          <span className="text-[13.5px] font-semibold text-muted">
            {cards?.length ?? 0} tasks this month
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-[7px] rounded-xl bg-primary px-[18px] py-[11px] font-display text-[14.5px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(220,43,84,0.6)] transition-colors hover:bg-primary-deep">
          <Icon name="add" size={18} />
          New task
        </button>
      </div>

      {/* Board (desktop: drag-and-drop columns) */}
      <main className="hidden flex-1 items-start gap-5 overflow-x-auto px-4 pb-[calc(env(safe-area-inset-bottom)+34px)] pt-[18px] sm:px-7 md:flex">
        {columns.map((col) => (
          <section
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDragEnter={() => setDragOverCol(col.id)}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOverCol((c) => (c === col.id ? null : c));
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnColumn(col.id);
            }}
            className={`flex max-h-full min-w-[280px] flex-[1_1_280px] flex-col rounded-[18px] border-[1.5px] transition-colors ${
              dragOverCol === col.id
                ? "border-[#f0b7c6] bg-primary/6"
                : "border-line-soft bg-panel"
            }`}>
            <ColumnHeader
              title={col.title}
              dot={col.dot}
              count={col.cards.length}
            />

            <div className="flex flex-col gap-[11px] overflow-y-auto px-3 pb-3.5 pt-1">
              {cards === null && <CardSkeletons className="h-24" />}

              {cards !== null && col.cards.length === 0 && (
                <EmptyColumn title={col.title} size="sm" />
              )}

              {col.cards.map((card) => (
                <TaskCard
                  key={card.id}
                  card={card}
                  draggable
                  onDragStart={(e) => {
                    setDragId(card.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", card.id);
                  }}
                  onDragEnd={resetDrag}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCardId(card.id);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node))
                      return;
                    setDragOverCardId((c) => (c === card.id ? null : c));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropOnCard(col.id, card);
                  }}
                  className={`cursor-grab transition-[box-shadow,transform,opacity] hover:-translate-y-px hover:shadow-[0_10px_22px_-10px_rgba(43,30,44,0.28)] ${
                    dragId === card.id ? "opacity-35" : ""
                  } ${
                    dragOverCardId === card.id && dragId && dragId !== card.id
                      ? "ring-2 ring-primary/50"
                      : ""
                  }`}
                  dateRowExtra={
                    <button
                      onClick={() =>
                        setMenuId((m) => (m === card.id ? null : card.id))
                      }
                      aria-label={`Actions for "${card.title}"`}
                      className="ml-auto rounded-lg px-1.5 py-0.5 text-muted-soft transition-colors hover:bg-chip hover:text-ink-soft">
                      <Icon name="more_horiz" size={18} />
                    </button>
                  }
                  footer={
                    menuId === card.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setMenuId(null)}
                        />
                        <div className="absolute right-2 top-full z-40 -mt-1 flex w-44 flex-col overflow-hidden rounded-xl border-[1.5px] border-line-soft bg-card py-1 shadow-[0_16px_36px_-16px_rgba(43,30,44,0.4)]">
                          {COLUMNS.filter((c) => c.id !== card.col).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                moveCard(user.uid, card.id, c.id);
                                setMenuId(null);
                              }}
                              className="flex items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] font-bold text-ink-soft transition-colors hover:bg-panel">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: c.dot }}
                              />
                              Move to {c.title}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              deleteCard(user.uid, card.id);
                              setMenuId(null);
                            }}
                            className="px-3.5 py-2 text-left text-[13.5px] font-bold text-primary transition-colors hover:bg-primary/6">
                            Delete
                          </button>
                        </div>
                      </>
                    )
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Board (mobile: swipeable stage pager) */}
      <MobileBoard
        columns={columns}
        loading={cards === null}
        onMove={(id, col) => moveCard(user.uid, id, col)}
        onDelete={(id) => deleteCard(user.uid, id)}
      />

      <NewTaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createTodo}
      />
    </div>
  );
}
