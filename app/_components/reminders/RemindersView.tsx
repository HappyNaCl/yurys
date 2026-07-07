"use client";

import { useEffect, useState } from "react";
import {
  addReminder,
  deleteReminder,
  formatRemindAt,
  recurrenceLabel,
  subscribeToReminders,
  updateReminder,
  type Reminder,
} from "@/lib/reminders";
import { disablePush, enablePush, pushEnabled, pushSupported } from "@/lib/push";
import CardSkeletons from "../board/CardSkeletons";
import Icon from "../Icon";
import { useUser } from "../UserContext";
import ReminderDialog from "./ReminderDialog";

function ReminderCard({
  reminder,
  now,
  onEdit,
  onDelete,
}: {
  reminder: Reminder;
  now: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const recurring = reminder.recurrence !== "once";
  // A one-time reminder that fired, or whose moment has simply passed, reads as
  // "done" — dimmed. `now` is 0 until the mount effect sets it, so nothing dims
  // before hydration.
  const past =
    reminder.fired ||
    (!recurring && now !== 0 && reminder.remindAt.getTime() < now);

  return (
    <div
      className={`flex items-start gap-3 rounded-[14px] border-[1.5px] border-line-soft bg-card p-3.5 ${
        past ? "opacity-60" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon name={recurring ? "repeat" : "notifications"} size={20} />
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="m-0 truncate text-[14.5px] font-bold text-ink">
          {reminder.title}
        </p>
        {reminder.description && (
          <p className="m-0 mt-0.5 line-clamp-2 text-[13px] font-semibold text-muted">
            {reminder.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-lg bg-chip px-2 py-[3px] text-[12px] font-extrabold text-muted">
            <Icon name="schedule" size={13} />
            {formatRemindAt(reminder.remindAt)}
          </span>
          <span className="rounded-lg bg-primary/10 px-2 py-[3px] text-[11.5px] font-extrabold uppercase tracking-[0.02em] text-primary">
            {recurrenceLabel(reminder.recurrence)}
          </span>
          {reminder.fired && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-chip px-2 py-[3px] text-[11.5px] font-extrabold uppercase tracking-[0.02em] text-muted">
              <Icon name="check" size={13} />
              Sent
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onEdit}
          aria-label={`Edit "${reminder.title}"`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-soft transition-colors hover:bg-chip hover:text-ink-soft"
        >
          <Icon name="edit" size={16} />
        </button>
        <button
          onClick={onDelete}
          aria-label={`Delete "${reminder.title}"`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-soft transition-colors hover:bg-primary/6 hover:text-primary"
        >
          <Icon name="delete" size={16} />
        </button>
      </div>
    </div>
  );
}

export default function RemindersView() {
  const user = useUser();
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [now, setNow] = useState(0);
  const supported = pushSupported();
  // Push toggle: null while we check an actual subscription, then boolean.
  // Unsupported browsers resolve to false immediately.
  const [pushOn, setPushOn] = useState<boolean | null>(() =>
    supported ? null : false,
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Refresh the "now" reference on every snapshot so past one-time reminders
  // dim without a synchronous setState-in-effect.
  useEffect(
    () =>
      subscribeToReminders(user.uid, (list) => {
        setReminders(list);
        setNow(Date.now());
      }),
    [user.uid],
  );

  useEffect(() => {
    if (!supported) return;
    pushEnabled()
      .then(setPushOn)
      .catch(() => setPushOn(false));
  }, [supported]);

  async function togglePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushOn) {
        await disablePush(user.uid);
        setPushOn(false);
      } else {
        await enablePush(user.uid);
        setPushOn(true);
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPushBusy(false);
    }
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(reminder: Reminder) {
    setEditing(reminder);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Page toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-4 pb-1 pt-[26px] sm:px-7">
        <div className="mr-1 flex flex-col gap-4 leading-[1.15]">
          <h1 className="m-0 font-display text-[26px] font-semibold text-ink">
            Reminders
          </h1>
          <span className="text-[13.5px] font-semibold text-muted">
            {reminders?.length ?? 0} active
          </span>
        </div>

        <div className="flex-1" />

        {supported && pushOn !== null && (
          <button
            onClick={togglePush}
            disabled={pushBusy}
            aria-pressed={pushOn}
            className={`flex items-center gap-[7px] rounded-xl border-[1.5px] px-[15px] py-[10px] font-display text-[14px] font-semibold transition-colors disabled:opacity-60 ${
              pushOn
                ? "border-line-soft bg-panel text-ink hover:bg-chip"
                : "border-transparent bg-chip text-muted hover:text-ink-soft"
            }`}
          >
            <Icon
              name={pushOn ? "notifications_active" : "notifications_off"}
              size={18}
            />
            {pushOn ? "Notifications on" : "Enable notifications"}
          </button>
        )}

        <button
          onClick={openNew}
          className="flex items-center gap-[7px] rounded-xl bg-primary px-[18px] py-[11px] font-display text-[14.5px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(220,43,84,0.6)] transition-colors hover:bg-primary-deep"
        >
          <Icon name="add" size={18} />
          New reminder
        </button>

        {pushError && (
          <p className="m-0 w-full text-[12.5px] font-bold text-primary">
            {pushError}
          </p>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+34px)] pt-[18px] sm:px-7">
        <div className="flex flex-col gap-2.5">
          {reminders === null && <CardSkeletons className="h-20" />}

          {reminders !== null && reminders.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[linear-gradient(150deg,#dc2b54,#7c5cbf)] text-white shadow-[0_12px_28px_-12px_rgba(220,43,84,0.6)]">
                <Icon name="notifications_off" size={28} />
              </span>
              <p className="m-0 max-w-xs text-[14.5px] font-semibold text-muted">
                No reminders yet. Add one and I&apos;ll keep it here for you.
              </p>
              <button
                onClick={openNew}
                className="rounded-xl bg-primary px-[18px] py-[11px] font-display text-[14px] font-semibold text-white transition-colors hover:bg-primary-deep"
              >
                Add your first reminder
              </button>
            </div>
          )}

          {reminders?.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              now={now}
              onEdit={() => openEdit(reminder)}
              onDelete={() => deleteReminder(user.uid, reminder.id)}
            />
          ))}
        </div>
      </div>

      {dialogOpen && (
        <ReminderDialog
          key={editing?.id ?? "new"}
          initial={editing}
          onClose={closeDialog}
          onSubmit={(data) =>
            editing
              ? updateReminder(user.uid, editing.id, data)
              : addReminder(user.uid, data)
          }
        />
      )}
    </div>
  );
}
