import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  sum,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "./firebase";

export type TxType = "expense" | "income";

export type NewTransaction = {
  type: TxType;
  amount: number;
  category: string;
  note: string;
};

export type Transaction = NewTransaction & {
  id: string;
  createdAt: Timestamp | null;
};

// A transaction imported from CSV carries its own date instead of the server
// clock, so a backlog can be uploaded with the dates it actually happened on.
export type ImportedTransaction = NewTransaction & { createdAt: Date };

const CURRENCY = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const CURRENCY_SHORT = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatMoney = (n: number) => CURRENCY.format(n);

// Compact form for chart axes, e.g. "Rp 250 rb".
export const formatMoneyShort = (n: number) => CURRENCY_SHORT.format(n);

export function formatTxDate(tx: Transaction) {
  const date = tx.createdAt?.toDate();
  if (!date) return "Just now";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* -------------------------------------------------------------------------
   Months. A month is addressed by its "YYYY-MM" key throughout the finance
   UI — comparable and sortable as a plain string.
   ---------------------------------------------------------------------- */

export type MonthKey = string;

export const monthKeyOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const currentMonthKey = () => monthKeyOf(new Date());

function monthParts(key: MonthKey) {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

export function monthLabel(key: MonthKey) {
  const { year, month } = monthParts(key);
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonth(key: MonthKey) {
  const { year, month } = monthParts(key);
  return new Date(year, month + 1, 0).getDate();
}

// Every month from `earliest` up to the current one, newest first. Capped so a
// stray far-past transaction can't produce an endless dropdown.
export function monthsSince(earliest: MonthKey | null, cap = 60): MonthKey[] {
  const now = new Date();
  const months: MonthKey[] = [];
  for (let i = 0; i < cap; i++) {
    const key = monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1));
    months.push(key);
    if (!earliest || key <= earliest) break;
  }
  return months;
}

/* --------------------------------------------------------------------------
   Weeks. The transaction list is grouped into weeks of the selected month so
   a long month stays skimmable.
   ----------------------------------------------------------------------- */

// Monday, matching how the week is counted locally. Flip to 0 for Sunday.
const WEEK_STARTS_ON = 1;

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() - WEEK_STARTS_ON + 7) % 7));
  return start;
}

const dayAndMonth = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// "Aug 3 – 9", or just "Aug 31" when the month cuts the week down to a day.
function formatRange(from: Date, to: Date) {
  if (from.getTime() === to.getTime()) return dayAndMonth(from);
  return from.getMonth() === to.getMonth()
    ? `${dayAndMonth(from)} – ${to.getDate()}`
    : `${dayAndMonth(from)} – ${dayAndMonth(to)}`;
}

export type TransactionWeek = {
  key: string;
  label: string;
  current: boolean; // contains today
  txs: Transaction[];
  spent: number;
  earned: number;
};

// Newest week first, with the range labels clipped to the month so a week
// spilling over either edge doesn't advertise days the view can't show.
export function groupByWeek(
  txs: Transaction[],
  month: MonthKey,
): TransactionWeek[] {
  const { year, month: m } = monthParts(month);
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const now = new Date();
  const today = startOfWeek(now).getTime();

  const weeks = new Map<
    number,
    { start: Date; txs: Transaction[]; spent: number; earned: number }
  >();

  for (const tx of txs) {
    // A write still waiting on the server clock belongs to the current week.
    const start = startOfWeek(tx.createdAt?.toDate() ?? now);
    let week = weeks.get(start.getTime());
    if (!week) {
      week = { start, txs: [], spent: 0, earned: 0 };
      weeks.set(start.getTime(), week);
    }
    week.txs.push(tx);
    if (tx.type === "income") week.earned += tx.amount;
    else week.spent += tx.amount;
  }

  return [...weeks.values()]
    .sort((a, b) => b.start.getTime() - a.start.getTime())
    .map(({ start, ...rest }) => {
      const end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 6,
      );
      return {
        key: String(start.getTime()),
        label: formatRange(
          start < firstDay ? firstDay : start,
          end > lastDay ? lastDay : end,
        ),
        current: start.getTime() === today,
        ...rest,
      };
    });
}

function txCollection(uid: string) {
  return collection(getDb(), "users", uid, "transactions");
}

// The month of the oldest transaction, so the picker only offers months the
// user could actually have data in. Null when there are no transactions yet.
export async function fetchEarliestMonth(uid: string) {
  const snap = await getDocs(
    query(txCollection(uid), orderBy("createdAt", "asc"), limit(1)),
  );
  const createdAt = snap.docs[0]?.data().createdAt as Timestamp | undefined;
  return createdAt ? monthKeyOf(createdAt.toDate()) : null;
}

// The finance view covers one calendar month at a time.
export function subscribeToTransactions(
  uid: string,
  month: MonthKey,
  onChange: (txs: Transaction[]) => void,
) {
  const { year, month: m } = monthParts(month);
  const q = query(
    txCollection(uid),
    where("createdAt", ">=", Timestamp.fromDate(new Date(year, m, 1))),
    where("createdAt", "<", Timestamp.fromDate(new Date(year, m + 1, 1))),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: (data.type as TxType) ?? "expense",
          amount: (data.amount as number) ?? 0,
          category: (data.category as string) ?? "Other",
          note: (data.note as string) ?? "",
          createdAt: (data.createdAt as Timestamp | null) ?? null,
        };
      }),
    );
  });
}

// All-time balance (income − spending), summed server-side so no transaction
// documents are downloaded. Aggregations can't be subscribed to — callers
// re-fetch when the month snapshot changes (i.e. after each add/delete).
export async function fetchBalance(uid: string) {
  const txs = txCollection(uid);
  const [income, expense] = await Promise.all([
    getAggregateFromServer(query(txs, where("type", "==", "income")), {
      total: sum("amount"),
    }),
    getAggregateFromServer(query(txs, where("type", "==", "expense")), {
      total: sum("amount"),
    }),
  ]);
  return income.data().total - expense.data().total;
}

export function addTransaction(uid: string, data: NewTransaction) {
  return addDoc(txCollection(uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

// Bulk insert from a CSV import. Firestore caps a batch at 500 writes, so the
// rows go up in chunks; a failing chunk leaves the earlier ones committed.
export async function importTransactions(
  uid: string,
  rows: ImportedTransaction[],
) {
  const txs = txCollection(uid);
  for (let i = 0; i < rows.length; i += 400) {
    const batch = writeBatch(getDb());
    for (const { createdAt, ...data } of rows.slice(i, i + 400)) {
      batch.set(doc(txs), { ...data, createdAt: Timestamp.fromDate(createdAt) });
    }
    await batch.commit();
  }
  return rows.length;
}

export function deleteTransaction(uid: string, id: string) {
  return deleteDoc(doc(getDb(), "users", uid, "transactions", id));
}
