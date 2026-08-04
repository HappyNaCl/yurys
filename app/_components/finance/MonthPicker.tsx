"use client";

import { useEffect, useState } from "react";
import { monthLabel, type MonthKey } from "@/lib/finance";
import Icon from "../Icon";

export default function MonthPicker({
  value,
  months,
  onChange,
}: {
  value: MonthKey;
  months: MonthKey[];
  onChange: (month: MonthKey) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-line bg-panel px-3.5 py-2.25 font-display text-[14px] font-semibold text-ink-soft transition-colors hover:bg-chip">
        <Icon name="calendar_month" size={17} />
        {monthLabel(value)}
        <Icon
          name="expand_more"
          size={17}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label="Month"
            className="absolute left-0 top-full z-50 mt-1.5 flex max-h-64 w-52 flex-col overflow-y-auto rounded-xl border-[1.5px] border-line-soft bg-card py-1 shadow-[0_16px_36px_-16px_rgba(43,30,44,0.4)]">
            {months.map((month) => {
              const selected = month === value;
              return (
                <button
                  key={month}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(month);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 text-left text-[13.5px] font-bold transition-colors hover:bg-panel ${
                    selected ? "text-primary" : "text-ink-soft"
                  }`}>
                  {monthLabel(month)}
                  {selected && (
                    <Icon name="check" size={16} className="ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
