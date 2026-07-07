import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { getDb } from "./firebase";

export type TxType = "expense" | "income";

export const CATEGORIES: Record<TxType, Record<string, string>> = {
  expense: {
    Food: "#dc2b54",
    Transport: "#e08a2e",
    Shopping: "#7c5cbf",
    Bills: "#5b4a9e",
    Health: "#38a186",
    Fun: "#c4497f",
    Other: "#9a8a92",
  },
  income: {
    Salary: "#38a186",
    Bonus: "#7c5cbf",
    Gift: "#dc2b54",
    Other: "#9a8a92",
  },
};

export function categoryColor(type: TxType, category: string) {
  return CATEGORIES[type][category] ?? "#9a8a92";
}

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

export function addTransaction(uid: string, data: NewTransaction) {
  return addDoc(txCollection(uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export function deleteTransaction(uid: string, id: string) {
  return deleteDoc(doc(getDb(), "users", uid, "transactions", id));
}
