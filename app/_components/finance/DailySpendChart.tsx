"use client";

import { useMemo } from "react";
import {
  daysInMonth,
  formatMoney,
  formatMoneyShort,
  type MonthKey,
  type Transaction,
} from "@/lib/finance";

// Spending per calendar day of the selected month. Dependency-free bars: each
// column is a div sized as a percentage of the busiest day.
export default function DailySpendChart({
  month,
  txs,
  selectedDay,
  onSelectDay,
}: {
  month: MonthKey;
  txs: Transaction[] | null;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}) {
  const days = daysInMonth(month);

  const { totals, max, busiest } = useMemo(() => {
    const totals = new Array<number>(days).fill(0);
    for (const tx of txs ?? []) {
      const date = tx.createdAt?.toDate();
      if (!date || tx.type !== "expense") continue;
      totals[date.getDate() - 1] += tx.amount;
    }
    const max = Math.max(...totals);
    return {
      totals,
      max,
      busiest: max > 0 ? totals.indexOf(max) + 1 : null,
    };
  }, [txs, days]);

  const monthShort = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)) - 1,
    1,
  ).toLocaleDateString("en-US", { month: "short" });

  return (
    <section className="hidden rounded-[18px] border-[1.5px] border-line-soft bg-panel p-5 md:block">
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="m-0 font-display text-[15.5px] font-semibold text-ink">
          Spending by day
        </h2>
        {busiest !== null && (
          <span className="text-[12.5px] font-bold text-muted">
            Highest on {monthShort} {busiest} · {formatMoney(max)}
          </span>
        )}
      </div>

      {txs === null ? (
        <div className="h-44 animate-pulse rounded-[14px] bg-chip" />
      ) : max === 0 ? (
        <p className="m-0 py-12 text-center text-[13.5px] font-semibold text-muted">
          No spending recorded this month.
        </p>
      ) : (
        <>
          <div className="relative h-44">
            {/* Scale lines at the max and half the max. */}
            {[1, 0.5].map((fraction) => (
              <div
                key={fraction}
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line"
                style={{ bottom: `${fraction * 100}%` }}>
                <span className="absolute -top-4 right-0 bg-panel pl-1 text-[10px] font-bold text-faint">
                  {formatMoneyShort(max * fraction)}
                </span>
              </div>
            ))}

            <div className="absolute inset-0 flex items-end gap-[3px]">
              {totals.map((value, i) => {
                const day = i + 1;
                const picked = day === selectedDay;
                // Dim the rest once a day is picked; otherwise the busiest day
                // is the one that stands out.
                const solid = picked || (selectedDay === null && day === busiest);
                return (
                  <button
                    key={day}
                    type="button"
                    // The whole column is the hit area, so days with no
                    // spending are still clickable.
                    onClick={() => onSelectDay(picked ? null : day)}
                    aria-pressed={picked}
                    aria-label={`${monthShort} ${day}, ${formatMoney(value)}`}
                    title={`${monthShort} ${day} — ${formatMoney(value)}`}
                    className="group relative flex h-full flex-1 cursor-pointer items-end">
                    <div
                      className={`w-full rounded-t-[4px] transition-colors ${
                        value === 0
                          ? picked
                            ? "bg-primary"
                            : "bg-chip"
                          : solid
                            ? "bg-primary"
                            : selectedDay !== null
                              ? "bg-primary/25 group-hover:bg-primary/60"
                              : "bg-primary/45 group-hover:bg-primary/75"
                      }`}
                      style={{
                        height: value === 0 ? 3 : `${(value / max) * 100}%`,
                      }}
                    />
                    {value > 0 && (
                      <span
                        className={`pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-lg border-[1.5px] border-line-soft bg-card px-2 py-1 text-[11.5px] font-extrabold text-ink opacity-0 shadow-[0_10px_22px_-12px_rgba(43,30,44,0.5)] transition-opacity group-hover:opacity-100 ${
                          day <= 3
                            ? "left-0"
                            : day >= days - 2
                              ? "right-0"
                              : "left-1/2 -translate-x-1/2"
                        }`}>
                        {monthShort} {day} · {formatMoney(value)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex gap-[3px]">
            {totals.map((_, i) => {
              const day = i + 1;
              // At lg the card is half the grid, too narrow for 31 labels —
              // thin them out to every fifth day until xl gives the room back.
              const crowded = day !== 1 && day % 5 !== 0;
              return (
                <span
                  key={day}
                  className={`flex-1 text-center text-[9.5px] font-bold ${
                    day === selectedDay
                      ? "text-primary"
                      : day === busiest && selectedDay === null
                        ? "text-primary"
                        : "text-faint"
                  } ${
                    // The picked day keeps its label whatever the width.
                    crowded && day !== selectedDay
                      ? "lg:opacity-0 xl:opacity-100"
                      : ""
                  }`}>
                  {day}
                </span>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
