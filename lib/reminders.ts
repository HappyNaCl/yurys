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
  updateDoc,
} from "firebase/firestore";
import { getDb } from "./firebase";

// A reminder either fires once at `remindAt` or repeats from it on a cadence.
export type Recurrence = "once" | "daily" | "weekly" | "monthly";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export type NewReminder = {
  title: string;
  description: string;
  remindAt: Date; // first (or only) time it should fire, in local time
  recurrence: Recurrence;
};

export type Reminder = {
  id: string;
  title: string;
  description: string;
  remindAt: Date;
  recurrence: Recurrence;
  // Set once a one-time reminder has been delivered, so it isn't re-fired.
  // Recurring reminders leave this false and advance `remindAt` instead.
  fired: boolean;
  createdAt: Timestamp | null;
};

function reminderCollection(uid: string) {
  return collection(getDb(), "users", uid, "reminders");
}

// Ordered by when they fire, soonest first.
export function subscribeToReminders(
  uid: string,
  onChange: (reminders: Reminder[]) => void,
) {
  const q = query(reminderCollection(uid), orderBy("remindAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: (data.title as string) ?? "",
          description: (data.description as string) ?? "",
          remindAt:
            (data.remindAt as Timestamp | undefined)?.toDate() ?? new Date(),
          recurrence: (data.recurrence as Recurrence) ?? "once",
          fired: (data.fired as boolean) ?? false,
          createdAt: (data.createdAt as Timestamp | null) ?? null,
        };
      }),
    );
  });
}

export function addReminder(uid: string, data: NewReminder) {
  return addDoc(reminderCollection(uid), {
    title: data.title,
    description: data.description,
    remindAt: Timestamp.fromDate(data.remindAt),
    recurrence: data.recurrence,
    fired: false,
    createdAt: serverTimestamp(),
  });
}

export function updateReminder(uid: string, id: string, data: NewReminder) {
  return updateDoc(doc(getDb(), "users", uid, "reminders", id), {
    title: data.title,
    description: data.description,
    remindAt: Timestamp.fromDate(data.remindAt),
    recurrence: data.recurrence,
    // Editing re-arms the reminder — a rescheduled one-time can fire again.
    fired: false,
  });
}

export function deleteReminder(uid: string, id: string) {
  return deleteDoc(doc(getDb(), "users", uid, "reminders", id));
}

export const recurrenceLabel = (r: Recurrence) =>
  RECURRENCE_OPTIONS.find((o) => o.value === r)?.label ?? "One-time";

const REMIND_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatRemindAt = (date: Date) => REMIND_FMT.format(date);

// Value for a datetime-local <input> (local wall-clock, no timezone suffix).
export function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Sensible default when creating a reminder: the next full hour.
export function nextHour() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

// Next fire time for a recurring reminder strictly after `after`. Advancing in
// a loop (rather than a single step) keeps things correct if the dispatcher
// missed some windows — e.g. the worker was down for an hour.
export function nextOccurrence(
  from: Date,
  recurrence: Recurrence,
  after: Date,
): Date {
  const next = new Date(from);
  if (recurrence === "once") return next;

  let guard = 0;
  while (next.getTime() <= after.getTime() && guard < 100000) {
    if (recurrence === "daily") next.setDate(next.getDate() + 1);
    else if (recurrence === "weekly") next.setDate(next.getDate() + 7);
    else if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
    guard++;
  }
  return next;
}
