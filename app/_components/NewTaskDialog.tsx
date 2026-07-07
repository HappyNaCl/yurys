"use client";

import { useState } from "react";
import { TAGS, type NewCardData } from "@/lib/cards";
import Dialog, { FieldLabel, inputClasses } from "./Dialog";

export default function NewTaskDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: NewCardData) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setTags((t) =>
      t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag],
    );
  }

  function reset() {
    setTitle("");
    setDesc("");
    setStartDate("");
    setEndDate("");
    setTags([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate({
      title: trimmed,
      desc: desc.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      tags: tags.length ? tags : ["Task"],
    });
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="New task">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <label className="flex flex-col gap-[7px]">
          <FieldLabel>Title</FieldLabel>
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Details, links, notes… (optional)"
            rows={3}
            className={`${inputClasses} resize-none`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-[7px]">
            <FieldLabel>Start date</FieldLabel>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClasses}
            />
          </label>
          <label className="flex flex-col gap-[7px]">
            <FieldLabel>End date</FieldLabel>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClasses}
            />
          </label>
        </div>

        <div className="flex flex-col gap-[7px]">
          <FieldLabel>Tags</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TAGS).map(([tag, [bg, fg]]) => {
              const selected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selected}
                  className={`rounded-lg px-2.5 py-[5px] text-[12px] font-extrabold tracking-[0.02em] transition-[background,color,box-shadow] ${
                    selected ? "shadow-[0_0_0_2px_currentColor]" : ""
                  }`}
                  style={selected ? { background: bg, color: fg } : undefined}
                >
                  <span className={selected ? "" : "text-muted"}>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!title.trim()}
          className="mt-1 rounded-[13px] bg-primary p-3.5 font-display text-base font-semibold text-white shadow-[0_12px_26px_-12px_rgba(220,43,84,0.75)] transition-colors hover:bg-primary-deep active:translate-y-px disabled:opacity-50"
        >
          Add task
        </button>
      </form>
    </Dialog>
  );
}
