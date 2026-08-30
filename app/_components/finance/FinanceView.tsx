"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addTransaction,
  currentMonthKey,
  deleteTransaction,
  fetchBalance,
  fetchEarliestMonth,
  formatMoney,
  importTransactions,
  monthKeyOf,
  monthLabel,
  monthsSince,
  subscribeToTransactions,
  type ImportedTransaction,
  type MonthKey,
  type Transaction,
} from "@/lib/finance";
import { downloadTemplateCsv } from "@/lib/financeCsv";
import {
  FALLBACK_TAG_COLOR,
  financeColorMap,
  useFinanceTags,
} from "@/lib/tags";
import Icon from "../Icon";
import { useUser } from "../UserContext";
import DailySpendChart from "./DailySpendChart";
import Donut from "./Donut";
import ImportDialog from "./ImportDialog";
import MonthPicker from "./MonthPicker";
import TransactionDialog from "./TransactionDialog";
import TransactionsPanel from "./TransactionsPanel";

// Toolbar buttons that sit next to the primary "Add transaction" action.
// Callers supply the display class so they can hide themselves responsively.
const secondaryButton =
  "items-center gap-1.5 rounded-xl border-[1.5px] border-line bg-panel px-3.5 py-2.75 font-display text-[14px] font-semibold text-ink-soft transition-colors hover:bg-chip";

function StatCard({
  label,
  icon,
  color,
  amount,
}: {
  label: string;
  icon: string;
  color: string;
  amount: number | null; // null while still loading
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border-[1.5px] border-line-soft bg-panel p-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: color }}>
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="m-0 text-[12.5px] font-bold text-muted">{label}</p>
        <p
          className={`m-0 truncate font-display text-[17px] font-semibold ${
            amount !== null && amount < 0 ? "text-primary" : "text-ink"
          }`}>
          {amount === null ? "…" : formatMoney(amount)}
        </p>
      </div>
    </div>
  );
}

export default function FinanceView() {
  const user = useUser();
  const [month, setMonth] = useState<MonthKey>(currentMonthKey);
  // The snapshot is tagged with the month it belongs to, so switching months
  // falls back to the loading state instead of flashing the old month's rows.
  const [snapshot, setSnapshot] = useState<{
    month: MonthKey;
    txs: Transaction[];
  } | null>(null);
  const txs = snapshot?.month === month ? snapshot.txs : null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Day of the month picked from the chart; narrows the transaction list only.
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Expense category picked from the donut. Composes with the day filter:
  // both narrow the day chart and the transaction list.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Bumped after an import, which can add months (and balance) the live
  // month snapshot below wouldn't notice.
  const [imported, setImported] = useState(0);

  useEffect(
    () =>
      subscribeToTransactions(user.uid, month, (list) =>
        setSnapshot({ month, txs: list }),
      ),
    [user.uid, month],
  );

  // Months the user actually has data in, newest first.
  const [earliest, setEarliest] = useState<MonthKey | null>(null);
  useEffect(() => {
    let stale = false;
    fetchEarliestMonth(user.uid)
      .then((m) => {
        if (!stale) setEarliest(m);
      })
      .catch(() => {}); // offline — fall back to the current month only
    return () => {
      stale = true;
    };
  }, [user.uid, imported]);

  const months = useMemo(() => {
    const list = monthsSince(earliest);
    // Keep the selected month reachable even if it predates the oldest doc.
    return list.includes(month) ? list : [...list, month].sort().reverse();
  }, [earliest, month]);

  // All-time balance. Aggregations aren't realtime, so re-fetch whenever the
  // month snapshot changes — i.e. right after every add/delete here.
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (txs === null) return;
    let stale = false;
    fetchBalance(user.uid)
      .then((b) => {
        if (!stale) setBalance(b);
      })
      .catch(() => {}); // offline etc. — keep the last known balance
    return () => {
      stale = true;
    };
  }, [user.uid, txs, imported]);

  // A day number only means something within its month, and a category can
  // disappear from one month to the next.
  function changeMonth(next: MonthKey) {
    setMonth(next);
    setSelectedDay(null);
    setSelectedCategory(null);
  }

  async function handleImport(rows: ImportedTransaction[]) {
    await importTransactions(user.uid, rows);
    setImported((n) => n + 1);
    // Jump to the month the imported rows landed in so they're visible.
    changeMonth(monthKeyOf(rows[0].createdAt));
  }

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
        byCategory.set(
          tx.category,
          (byCategory.get(tx.category) ?? 0) + tx.amount,
        );
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

  const selectedSegment =
    segments.find((s) => s.label === selectedCategory) ?? null;

  // What the day chart and the transaction list actually show. The stat cards
  // above stay on the whole month, so the filter reads as a zoom-in, not as
  // the month's numbers changing.
  const visibleTxs = useMemo(() => {
    if (txs === null || selectedCategory === null) return txs;
    return txs.filter(
      (tx) => tx.type === "expense" && tx.category === selectedCategory,
    );
  }, [txs, selectedCategory]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Page toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-4 pb-1 pt-6.5 sm:px-7">
        <h1 className="m-0 mr-1 font-display text-[26px] font-semibold text-ink">
          Finance
        </h1>

        <MonthPicker value={month} months={months} onChange={changeMonth} />

        <div className="flex-1" />

        {/* Bulk import is desktop-only — picking files and reading a preview
            table doesn't work well on a phone. */}
        <button
          onClick={() => downloadTemplateCsv(financeTags)}
          className={`hidden md:flex ${secondaryButton}`}>
          <Icon name="download" size={17} />
          Template
        </button>
        <button
          onClick={() => setImportOpen(true)}
          className={`hidden md:flex ${secondaryButton}`}>
          <Icon name="upload_file" size={17} />
          Import CSV
        </button>

        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.75 rounded-xl bg-primary px-4.5 py-2.75 font-display text-[14.5px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(220,43,84,0.6)] transition-colors hover:bg-primary-deep">
          <Icon name="add" size={18} />
          Add transaction
        </button>
      </div>

      <div className="grid items-start gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+34px)] pt-4.5 sm:px-7 lg:grid-cols-2">
        {/* Left: stats + category chart */}
        <section className="flex flex-col gap-5">
          <div className="grid grid-rows-3 gap-5">
            <StatCard
              label="Balance"
              icon="account_balance_wallet"
              color="#7c5cbf"
              amount={balance}
            />
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
                <img
                  src="/spending-not-found.png"
                  alt=""
                  width={80}
                  height={80}
                  className="rounded-[18px]"
                />
                <p className="m-0 text-center text-[13.5px] font-semibold text-muted">
                  No spending in {monthLabel(month)}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <Donut
                  segments={segments}
                  centerLabel={formatMoney(
                    selectedSegment ? selectedSegment.value : expenseTotal,
                  )}
                  centerSub={selectedSegment ? selectedSegment.label : "spent"}
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
                <ul className="m-0 flex w-full flex-1 list-none flex-col gap-0.5 p-0">
                  {segments.map((s) => {
                    const picked = selectedCategory === s.label;
                    return (
                      <li key={s.label}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCategory(picked ? null : s.label)
                          }
                          aria-pressed={picked}
                          className={`flex w-full items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left text-[13px] font-bold transition-colors hover:bg-chip ${
                            picked ? "bg-chip" : ""
                          } ${
                            selectedCategory !== null && !picked
                              ? "opacity-45"
                              : ""
                          }`}>
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: s.color }}
                          />
                          <span className="truncate text-ink-soft">
                            {s.label}
                          </span>
                          <span className="ml-auto shrink-0 text-ink">
                            {formatMoney(s.value)}
                          </span>
                          <span className="w-11 shrink-0 text-right text-muted">
                            {Math.round((s.value / expenseTotal) * 100)}%
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Day-by-day breakdown, right under the category donut so it stays
              above the fold no matter how long the transaction list gets. */}
          <DailySpendChart
            month={month}
            txs={visibleTxs}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </section>

        {/* Right: transactions by week, newest first */}
        <TransactionsPanel
          txs={visibleTxs}
          month={month}
          selectedDay={selectedDay}
          onClearDay={() => setSelectedDay(null)}
          selectedCategory={selectedCategory}
          onClearCategory={() => setSelectedCategory(null)}
          expenseColors={expenseColors}
          incomeColors={incomeColors}
          onDelete={(id) => deleteTransaction(user.uid, id)}
        />
      </div>

      <TransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={(data) => addTransaction(user.uid, data)}
        tags={financeTags}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        tags={financeTags}
        onImport={handleImport}
      />
    </div>
  );
}
