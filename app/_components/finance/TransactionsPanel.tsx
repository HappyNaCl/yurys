"use client";

import { useMemo, useState } from "react";
import {
  formatMoney,
  formatTxDate,
  groupByWeek,
  monthLabel,
  type MonthKey,
  type Transaction,
} from "@/lib/finance";
import { FALLBACK_TAG_COLOR } from "@/lib/tags";
import CardSkeletons from "../board/CardSkeletons";
import Icon from "../Icon";

export default function TransactionsPanel({
  txs,
  month,
  selectedDay,
  onClearDay,
  expenseColors,
  incomeColors,
  onDelete,
}: {
  txs: Transaction[] | null; // null while loading
  month: MonthKey;
  selectedDay: number | null; // set by clicking a bar in the day chart
  onClearDay: () => void;
  expenseColors: Record<string, string>;
  incomeColors: Record<string, string>;
  onDelete: (id: string) => void;
}) {
  // Only weeks the user has actually toggled live here; the rest fall back to
  // `defaultOpen` below, so switching months needs no resetting.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    if (txs === null || selectedDay === null) return txs;
    return txs.filter((tx) => tx.createdAt?.toDate().getDate() === selectedDay);
  }, [txs, selectedDay]);

  // A day filter narrows things to a single date, so the week headings would
  // only repeat what the filter chip already says.
  const weeks = useMemo(
    () => (visible && selectedDay === null ? groupByWeek(visible, month) : []),
    [visible, month, selectedDay],
  );

  const dayLabel =
    selectedDay === null
      ? ""
      : new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5)) - 1,
          selectedDay,
        ).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <section className="rounded-[18px] border-[1.5px] border-line-soft bg-panel p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="m-0 font-display text-[15.5px] font-semibold text-ink">
          Transactions
        </h2>
        {selectedDay !== null && (
          <button
            onClick={onClearDay}
            aria-label={`Clear the ${dayLabel} filter`}
            className="flex items-center gap-1 rounded-lg bg-primary/10 py-[3px] pl-2.5 pr-1.5 text-[12px] font-extrabold tracking-[0.02em] text-primary transition-colors hover:bg-primary/16">
            {dayLabel}
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {visible === null && <CardSkeletons className="h-16" />}

        {visible !== null && visible.length === 0 && selectedDay !== null && (
          <div className="flex flex-col items-center gap-2.5 py-6">
            <p className="m-0 text-center text-[13.5px] font-semibold text-muted">
              Nothing on {dayLabel}.
            </p>
            <button
              onClick={onClearDay}
              className="rounded-xl border-[1.5px] border-line bg-card px-3.5 py-2 font-display text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-chip">
              Show the whole month
            </button>
          </div>
        )}

        {visible !== null && visible.length === 0 && selectedDay === null && (
          <div className="flex flex-col items-center gap-2.5 py-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset, skip the optimizer */}
            <img
              src="/income-not-found.png"
              alt=""
              width={80}
              height={80}
              className="rounded-[18px]"
            />
            <p className="m-0 text-center text-[13.5px] font-semibold text-muted">
              No transactions in {monthLabel(month)}.
            </p>
          </div>
        )}

        {/* Filtered to one day: a flat list. Otherwise: one block per week. */}
        {selectedDay !== null
          ? visible?.map((tx) => (
              <Row
                key={tx.id}
                tx={tx}
                expenseColors={expenseColors}
                incomeColors={incomeColors}
                onDelete={onDelete}
              />
            ))
          : weeks.map((week, i) => {
              // The week in progress starts open — or the most recent one when
              // looking at a month that's already over.
              const defaultOpen = week.current || i === 0;
              const open = toggled[week.key] ?? defaultOpen;
              return (
                <div key={week.key} className="flex flex-col">
                  <button
                    onClick={() =>
                      setToggled((t) => ({ ...t, [week.key]: !open }))
                    }
                    aria-expanded={open}
                    aria-controls={`week-${week.key}`}
                    className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] px-1.5 py-2 text-left transition-colors hover:bg-chip">
                    <Icon
                      name="expand_more"
                      size={16}
                      className={`shrink-0 text-muted-soft transition-transform ${
                        open ? "" : "-rotate-90"
                      }`}
                    />
                    <span className="text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-muted">
                      {week.label}
                    </span>
                    {week.current && (
                      <span className="rounded-md bg-chip px-1.5 py-px text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-muted">
                        This week
                      </span>
                    )}
                    <span className="ml-auto flex items-baseline gap-2 text-[12.5px] font-extrabold">
                      {week.earned > 0 && (
                        <span className="text-[#38a186]">
                          +{formatMoney(week.earned)}
                        </span>
                      )}
                      <span className="text-ink">
                        −{formatMoney(week.spent)}
                      </span>
                    </span>
                  </button>

                  {/* 0fr → 1fr animates cleanly without measuring heights.
                      `inert` keeps collapsed rows out of the tab order. */}
                  <div
                    id={`week-${week.key}`}
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}>
                    <div className="overflow-hidden" inert={!open}>
                      <div className="flex flex-col gap-2.5 pt-1.5">
                        {week.txs.map((tx) => (
                          <Row
                            key={tx.id}
                            tx={tx}
                            expenseColors={expenseColors}
                            incomeColors={incomeColors}
                            onDelete={onDelete}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}

function Row({
  tx,
  expenseColors,
  incomeColors,
  onDelete,
}: {
  tx: Transaction;
  expenseColors: Record<string, string>;
  incomeColors: Record<string, string>;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-line-soft bg-card p-3">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background:
            (tx.type === "income" ? incomeColors : expenseColors)[
              tx.category
            ] ?? FALLBACK_TAG_COLOR,
        }}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="m-0 truncate text-[14px] font-bold text-ink">
          {tx.note || tx.category}
        </p>
        <p className="m-0 text-[12px] font-bold text-muted">
          {tx.category} · {formatTxDate(tx)}
        </p>
      </div>
      <span
        className={`shrink-0 text-[14px] font-extrabold ${
          tx.type === "income" ? "text-[#38a186]" : "text-ink"
        }`}>
        {tx.type === "income" ? "+" : "−"}
        {formatMoney(tx.amount)}
      </span>
      <button
        onClick={() => onDelete(tx.id)}
        aria-label={`Delete "${tx.note || tx.category}"`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-soft transition-colors hover:bg-primary/6 hover:text-primary">
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
