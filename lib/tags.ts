"use client";

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
  writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "./firebase";
import type { TxType } from "./finance";

export type TagOption = { name: string; color: string };
export type TodoTag = TagOption & { id: string; order: number };
export type FinanceTag = TodoTag & { type: TxType };

export const FALLBACK_TAG_COLOR = "#9a8a92";

// Translucent tint of the tag color — chip background that reads on both the
// light and dark card surfaces.
export const tagBg = (color: string) => `${color}1f`;

// Built-in tags, used until the user customizes theirs (and as the color
// fallback for names still on old cards after a tag is renamed or deleted).
export const DEFAULT_TODO_TAGS: readonly TagOption[] = [
  { name: "Research", color: "#6b45b8" },
  { name: "Marketing", color: "#c21f5b" },
  { name: "Design", color: "#c61e48" },
  { name: "Bug", color: "#c63a2e" },
  { name: "Docs", color: "#5e4b8c" },
  { name: "Feature", color: "#b32877" },
  { name: "Backend", color: "#5b4a9e" },
  { name: "Task", color: "#7a6b73" },
];

export const DEFAULT_FINANCE_TAGS: readonly (TagOption & { type: TxType })[] =
  [
    { name: "Food", color: "#dc2b54", type: "expense" },
    { name: "Transport", color: "#e08a2e", type: "expense" },
    { name: "Shopping", color: "#7c5cbf", type: "expense" },
    { name: "Bills", color: "#5b4a9e", type: "expense" },
    { name: "Health", color: "#38a186", type: "expense" },
    { name: "Fun", color: "#c4497f", type: "expense" },
    { name: "Other", color: "#9a8a92", type: "expense" },
    { name: "Salary", color: "#38a186", type: "income" },
    { name: "Bonus", color: "#7c5cbf", type: "income" },
    { name: "Gift", color: "#dc2b54", type: "income" },
    { name: "Other", color: "#9a8a92", type: "income" },
  ];

type TagKind = "todoTags" | "financeTags";

function tagsCollection(uid: string, kind: TagKind) {
  return collection(getDb(), "users", uid, kind);
}

// Todo tags simply ignore the `type` field they never store.
function subscribeToTags(
  uid: string,
  kind: TagKind,
  onChange: (tags: FinanceTag[]) => void,
) {
  const q = query(tagsCollection(uid, kind), orderBy("order", "asc"));
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: (data.name as string) ?? "",
          color: (data.color as string) ?? FALLBACK_TAG_COLOR,
          order: (data.order as number) ?? 0,
          type: (data.type as TxType) ?? "expense",
        };
      }),
    );
  });
}

export function subscribeToTodoTags(
  uid: string,
  onChange: (tags: TodoTag[]) => void,
) {
  return subscribeToTags(uid, "todoTags", onChange);
}

export function subscribeToFinanceTags(
  uid: string,
  onChange: (tags: FinanceTag[]) => void,
) {
  return subscribeToTags(uid, "financeTags", onChange);
}

export function addTodoTag(uid: string, data: TagOption, order: number) {
  return addDoc(tagsCollection(uid, "todoTags"), {
    ...data,
    order,
    createdAt: serverTimestamp(),
  });
}

export function addFinanceTag(
  uid: string,
  data: TagOption & { type: TxType },
  order: number,
) {
  return addDoc(tagsCollection(uid, "financeTags"), {
    ...data,
    order,
    createdAt: serverTimestamp(),
  });
}

export function updateTag(
  uid: string,
  kind: TagKind,
  id: string,
  data: Partial<TagOption>,
) {
  return updateDoc(doc(getDb(), "users", uid, kind, id), data);
}

export function deleteTag(uid: string, kind: TagKind, id: string) {
  return deleteDoc(doc(getDb(), "users", uid, kind, id));
}

// Copy the built-in defaults into Firestore so every tag is a real, editable
// doc. Called by the tags page when a collection is empty — which also means
// deleting every tag brings the defaults back.
export function seedDefaultTodoTags(uid: string) {
  const batch = writeBatch(getDb());
  DEFAULT_TODO_TAGS.forEach((tag, order) => {
    batch.set(doc(tagsCollection(uid, "todoTags")), {
      ...tag,
      order,
      createdAt: serverTimestamp(),
    });
  });
  return batch.commit();
}

export function seedDefaultFinanceTags(uid: string) {
  const batch = writeBatch(getDb());
  DEFAULT_FINANCE_TAGS.forEach((tag, order) => {
    batch.set(doc(tagsCollection(uid, "financeTags")), {
      ...tag,
      order,
      createdAt: serverTimestamp(),
    });
  });
  return batch.commit();
}

export function useTodoTags(uid: string) {
  const [tags, setTags] = useState<TodoTag[] | null>(null);
  useEffect(() => subscribeToTodoTags(uid, setTags), [uid]);
  return tags;
}

export function useFinanceTags(uid: string) {
  const [tags, setTags] = useState<FinanceTag[] | null>(null);
  useEffect(() => subscribeToFinanceTags(uid, setTags), [uid]);
  return tags;
}

// Tags offered in pickers: the user's own once any exist, defaults otherwise.
export function todoTagOptions(tags: TodoTag[] | null): readonly TagOption[] {
  return tags?.length ? tags : DEFAULT_TODO_TAGS;
}

export function financeTagOptions(
  tags: FinanceTag[] | null,
  type: TxType,
): readonly TagOption[] {
  const custom = (tags ?? []).filter((t) => t.type === type);
  return custom.length
    ? custom
    : DEFAULT_FINANCE_TAGS.filter((t) => t.type === type);
}

// Name → color for rendering saved items. Defaults sit underneath the user's
// tags so items still tagged with a renamed/deleted default keep its color.
export function todoColorMap(tags: TodoTag[] | null): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of DEFAULT_TODO_TAGS) map[t.name] = t.color;
  for (const t of tags ?? []) map[t.name] = t.color;
  return map;
}

export function financeColorMap(
  tags: FinanceTag[] | null,
  type: TxType,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of DEFAULT_FINANCE_TAGS) if (t.type === type) map[t.name] = t.color;
  for (const t of tags ?? []) if (t.type === type) map[t.name] = t.color;
  return map;
}
