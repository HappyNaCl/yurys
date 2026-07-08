import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getAggregateFromServer,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  sum,
  Timestamp,
  where,
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

const CURRENCY = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const formatMoney = (n: number) => CURRENCY.format(n);

export function formatTxDate(tx: Transaction) {
  const date = tx.createdAt?.toDate();
  if (!date) return "Just now";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function txCollection(uid: string) {
  return collection(getDb(), "users", uid, "transactions");
}

// The finance view covers the current month.
export function subscribeToTransactions(
  uid: string,
  onChange: (txs: Transaction[]) => void,
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const q = query(
    txCollection(uid),
    where("createdAt", ">=", Timestamp.fromDate(monthStart)),
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

export function deleteTransaction(uid: string, id: string) {
  return deleteDoc(doc(getDb(), "users", uid, "transactions", id));
}
