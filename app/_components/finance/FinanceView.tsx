"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addTransaction,
  deleteTransaction,
  formatMoney,
  formatTxDate,
  subscribeToTransactions,
  type Transaction,
} from "@/lib/finance";
import {
  FALLBACK_TAG_COLOR,
  financeColorMap,
  useFinanceTags,
} from "@/lib/tags";
import CardSkeletons from "../board/CardSkeletons";
import Icon from "../Icon";
import { useUser } from "../UserContext";
import Donut from "./Donut";
import TransactionDialog from "./TransactionDialog";

function StatCard({
  label,
  icon,
  color,
  amount,
}: {
  label: string;
  icon: string;
  color: string;
  amount: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-line-soft bg-panel p-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: color }}
      >
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="m-0 text-[12.5px] font-bold text-muted">{label}</p>
        <p className="m-0 truncate font-display text-[17px] font-semibold text-ink">
          {formatMoney(amount)}
        </p>
      </div>
    </div>
  );
}

export default function FinanceView() {
  const user = useUser();
  const [txs, setTxs] = useState<Transaction[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => subscribeToTransactions(user.uid, setTxs), [user.uid]);

  const financeTags = useFinanceTags(user.uid);
  const expenseColors = useMemo(
    () => financeColorMap(financeTags, "expense"),
    [financeTags],
  );
  const incomeColors = useMemo(
    () => financeColorMap(financeTags, "income"),
    [financeTags],
  );

  const { incomeTotal, expenseTotal, segments } = useMemo(() => {
    const list = txs ?? [];
    let incomeTotal = 0;
    let expenseTotal = 0;
    const byCategory = new Map<string, number>();
    for (const tx of list) {
      if (tx.type === "income") {
        incomeTotal += tx.amount;
      } else {
        expenseTotal += tx.amount;
        byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + tx.amount);
      }
    }
    const segments = [...byCategory.entries()]
      .map(([label, value]) => ({
        label,
        value,
        color: expenseColors[label] ?? FALLBACK_TAG_COLOR,
      }))
      .sort((a, b) => b.value - a.value);
    return { incomeTotal, expenseTotal, segments };
  }, [txs, expenseColors]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Page toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-4 pb-1 pt-[26px] sm:px-7">
        <div className="mr-1 flex flex-col gap-4 leading-[1.15]">
          <h1 className="m-0 font-display text-[26px] font-semibold text-ink">
            Finance
          </h1>
          <span className="text-[13.5px] font-semibold text-muted">
            {txs?.length ?? 0} transactions this month
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-[7px] rounded-xl bg-primary px-[18px] py-[11px] font-display text-[14.5px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(220,43,84,0.6)] transition-colors hover:bg-primary-deep"
        >
          <Icon name="add" size={18} />
          Add transaction
        </button>
      </div>

      <div className="grid items-start gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+34px)] pt-[18px] sm:px-7 lg:grid-cols-2">
        {/* Left: stats + category chart */}
        <section className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <StatCard
              label="Income"
              icon="arrow_upward"
              color="#38a186"
              amount={incomeTotal}
            />
            <StatCard
              label="Spending"
              icon="arrow_downward"
              color="#dc2b54"
              amount={expenseTotal}
            />
          </div>

          <div className="rounded-[18px] border-[1.5px] border-line-soft bg-panel p-5">
            <h2 className="m-0 mb-4 font-display text-[15.5px] font-semibold text-ink">
              Spending by category
            </h2>
            {txs === null ? (
              <div className="h-44 animate-pulse rounded-[14px] bg-chip" />
            ) : segments.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 py-6">
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset, skip the optimizer */}
                <img src="/todo-not-found.webp" alt="" width={80} height={80} />
                <p className="m-0 text-center text-[13.5px] font-semibold text-muted">
                  No spending yet this month.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <Donut
                  segments={segments}
                  centerLabel={formatMoney(expenseTotal)}
                  centerSub="spent"
                />
                <ul className="m-0 flex w-full flex-1 list-none flex-col gap-2 p-0">
                  {segments.map((s) => (
                    <li
                      key={s.label}
                      className="flex items-center gap-2.5 text-[13px] font-bold"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="text-ink-soft">{s.label}</span>
                      <span className="ml-auto text-ink">
                        {formatMoney(s.value)}
                      </span>
                      <span className="w-11 text-right text-muted">
                        {Math.round((s.value / expenseTotal) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Right: transactions sorted by createdAt (newest first) */}
        <section className="rounded-[18px] border-[1.5px] border-line-soft bg-panel p-5">
          <h2 className="m-0 mb-4 font-display text-[15.5px] font-semibold text-ink">
            Transactions
          </h2>
          <div className="flex flex-col gap-2.5">
            {txs === null && <CardSkeletons className="h-16" />}

            {txs !== null && txs.length === 0 && (
              <div className="flex flex-col items-center gap-2.5 py-6">
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static asset, skip the optimizer */}
                <img src="/todo-not-found.webp" alt="" width={80} height={80} />
                <p className="m-0 text-center text-[13.5px] font-semibold text-muted">
                  No transactions yet this month.
                </p>
              </div>
            )}

            {txs?.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-line-soft bg-card p-3"
              >
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
                  }`}
                >
                  {tx.type === "income" ? "+" : "−"}
                  {formatMoney(tx.amount)}
                </span>
                <button
                  onClick={() => deleteTransaction(user.uid, tx.id)}
                  aria-label={`Delete "${tx.note || tx.category}"`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-soft transition-colors hover:bg-primary/6 hover:text-primary"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={(data) => addTransaction(user.uid, data)}
        tags={financeTags}
      />
    </div>
  );
}
