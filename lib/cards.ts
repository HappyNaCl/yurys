import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";

export const COLUMNS = [
  { id: "todo", title: "To Do", dot: "#dc2b54" },
  { id: "doing", title: "In Progress", dot: "#c4497f" },
  { id: "backlog", title: "Backlog", dot: "#9a8a92" },
  { id: "done", title: "Done", dot: "#7c5cbf" },
] as const;

export type ColumnId = (typeof COLUMNS)[number]["id"];

const COLUMN_IDS = COLUMNS.map((c) => c.id) as readonly string[];

export const TAGS: Record<string, [background: string, foreground: string]> = {
  Research: ["#efe6fb", "#6b45b8"],
  Marketing: ["#fce8ef", "#c21f5b"],
  Design: ["#fbe3ea", "#c61e48"],
  Bug: ["#fbe0de", "#c63a2e"],
  Docs: ["#eee9f6", "#5e4b8c"],
  Feature: ["#fce5ef", "#b32877"],
  Backend: ["#e9e4f4", "#5b4a9e"],
  Task: ["#f0e6ea", "#7a6b73"],
};

export type NewCardData = {
  title: string;
  desc: string;
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;
  tags: string[];
};

export type Card = NewCardData & {
  id: string;
  col: ColumnId;
  // Priority within a column — lower sorts first. Legacy docs without the
  // field fall back to -createdAt so newest still lands on top.
  order: number;
  createdAt: Timestamp | null;
};

function cardsCollection(uid: string) {
  return collection(getDb(), "users", uid, "todos");
}

export function subscribeToCards(
  uid: string,
  onChange: (cards: Card[]) => void,
) {
  // The board shows cards SCHEDULED this month: their start–end range
  // overlaps the current month. Undated cards fall back to their creation
  // month. Overlap needs ranges on two fields, which one Firestore query
  // can't express — fetch all and filter client-side (personal-scale data).
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStartDay = `${year}-${pad(month + 1)}-01`;
  const monthEndDay = `${year}-${pad(month + 1)}-${pad(monthEnd.getDate())}`;

  const inThisMonth = (card: Card) => {
    const start = card.startDate ?? card.endDate;
    const end = card.endDate ?? card.startDate;
    if (start && end) return start <= monthEndDay && end >= monthStartDay;
    const created = card.createdAt?.toDate();
    return !created || (created >= monthStart && created <= monthEnd);
  };

  const q = query(cardsCollection(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs
        .map((d) => {
        const data = d.data();
        // Legacy docs from the list era have { text, done } instead of
        // { title, tag, col } — map them into the board without migration.
        const col = COLUMN_IDS.includes(data.col)
          ? (data.col as ColumnId)
          : data.done
            ? "done"
            : "todo";
        const createdAt = (data.createdAt as Timestamp | null) ?? null;
        return {
          id: d.id,
          title: (data.title ?? data.text ?? "") as string,
          desc: (data.desc as string) ?? "",
          startDate: (data.startDate as string | null) ?? null,
          endDate: (data.endDate as string | null) ?? null,
          // Legacy docs stored a single `tag` string.
          tags: Array.isArray(data.tags)
            ? (data.tags as string[])
            : data.tag
              ? [data.tag as string]
              : ["Task"],
          col,
          order:
            typeof data.order === "number"
              ? data.order
              : createdAt
                ? -createdAt.seconds
                : 0,
          createdAt,
        };
        })
        .filter(inThisMonth),
    );
  });
}

// New cards always start in To Do; `order` is computed by the caller so it
// lands at the top of the column.
export function addCard(uid: string, data: NewCardData, order: number) {
  return addDoc(cardsCollection(uid), {
    ...data,
    col: "todo",
    order,
    createdAt: serverTimestamp(),
  });
}

export function moveCard(uid: string, id: string, col: ColumnId) {
  return updateDoc(doc(getDb(), "users", uid, "todos", id), { col });
}

// Move a card to a column at a specific priority slot.
export function placeCard(
  uid: string,
  id: string,
  col: ColumnId,
  order: number,
) {
  return updateDoc(doc(getDb(), "users", uid, "todos", id), { col, order });
}

export function deleteCard(uid: string, id: string) {
  return deleteDoc(doc(getDb(), "users", uid, "todos", id));
}

export function formatCardDate(card: Card) {
  const date = card.createdAt?.toDate();
  if (!date) return "Just now";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Schedule label for the card footer: date range, due date, start date, or
// (for cards with no dates) the creation date.
export function formatCardSchedule(card: Card) {
  if (card.startDate && card.endDate)
    return `${formatDay(card.startDate)} – ${formatDay(card.endDate)}`;
  if (card.endDate) return `Due ${formatDay(card.endDate)}`;
  if (card.startDate) return formatDay(card.startDate);
  return formatCardDate(card);
}
