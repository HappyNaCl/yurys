"use client";

import { useState } from "react";
import {
  nextHour,
  RECURRENCE_OPTIONS,
  toDateTimeLocal,
  type NewReminder,
  type Recurrence,
  type Reminder,
} from "@/lib/reminders";
import Dialog, { FieldLabel, inputClasses } from "../Dialog";

// One dialog for both creating and editing. The parent mounts it (with a key)
// only while open, so the fields seed cleanly from `initial` each time.
export default function ReminderDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Reminder | null;
  onClose: () => void;
  onSubmit: (data: NewReminder) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [remindAt, setRemindAt] = useState(
    toDateTimeLocal(initial?.remindAt ?? nextHour()),
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(
    initial?.recurrence ?? "once",
  );

  const valid = title.trim() !== "" && remindAt !== "";

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      remindAt: new Date(remindAt),
      recurrence,
    });
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial ? "Edit reminder" : "New reminder"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <label className="flex flex-col gap-[7px]">
          <FieldLabel>Title</FieldLabel>
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should I remind you about?"
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, links, notes… (optional)"
            rows={3}
            className={`${inputClasses} resize-none`}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <FieldLabel>Remind me at</FieldLabel>
          <input
            required
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            className={inputClasses}
          />
        </label>

        <div className="flex flex-col gap-[7px]">
          <FieldLabel>Repeat</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {RECURRENCE_OPTIONS.map(({ value, label }) => {
              const selected = recurrence === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecurrence(value)}
                  aria-pressed={selected}
                  className={`rounded-lg px-3 py-[7px] text-[13px] font-bold transition-colors ${
                    selected
                      ? "bg-primary text-white"
                      : "bg-chip text-muted hover:text-ink-soft"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="mt-1 rounded-[13px] bg-primary p-3.5 font-display text-base font-semibold text-white shadow-[0_12px_26px_-12px_rgba(220,43,84,0.75)] transition-colors hover:bg-primary-deep active:translate-y-px disabled:opacity-50"
        >
          {initial ? "Save changes" : "Add reminder"}
        </button>
      </form>
    </Dialog>
  );
}
