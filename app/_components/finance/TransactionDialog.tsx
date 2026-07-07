"use client";

import { useState } from "react";
import { CATEGORIES, type NewTransaction, type TxType } from "@/lib/finance";
import Dialog, { FieldLabel, inputClasses } from "../Dialog";

export default function TransactionDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: NewTransaction) => void;
}) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");

  const value = Number(amount);
  const valid = amount !== "" && Number.isFinite(value) && value > 0;

  function switchType(t: TxType) {
    setType(t);
    setCategory(Object.keys(CATEGORIES[t])[0]);
  }

  function reset() {
    setType("expense");
    setAmount("");
    setCategory("Food");
    setNote("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    onCreate({ type, amount: value, category, note: note.trim() });
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Add transaction">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <div className="flex rounded-[13px] bg-chip p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchType(t)}
              aria-pressed={type === t}
              className={`flex-1 rounded-[10px] py-2 text-[13.5px] font-bold transition-colors ${
                type === t
                  ? "bg-card text-ink shadow-[0_2px_6px_-3px_rgba(43,30,44,0.2)]"
                  : "text-muted"
              }`}
            >
              {t === "expense" ? "Spending" : "Income"}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-[7px]">
          <FieldLabel>Amount</FieldLabel>
          <input
            autoFocus
            required
            type="number"
            inputMode="numeric"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50000"
            className={inputClasses}
          />
        </label>

        <div className="flex flex-col gap-[7px]">
          <FieldLabel>Category</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CATEGORIES[type]).map(([name, color]) => {
              const selected = category === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  aria-pressed={selected}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-[5px] text-[12px] font-extrabold tracking-[0.02em] transition-colors ${
                    selected ? "text-white" : "bg-chip text-muted"
                  }`}
                  style={selected ? { background: color } : undefined}
                >
                  {!selected && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: color }}
                    />
                  )}
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-[7px]">
          <FieldLabel>Note</FieldLabel>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was it for? (optional)"
            className={inputClasses}
          />
        </label>

        <button
          type="submit"
          disabled={!valid}
          className="mt-1 rounded-[13px] bg-primary p-3.5 font-display text-base font-semibold text-white shadow-[0_12px_26px_-12px_rgba(220,43,84,0.75)] transition-colors hover:bg-primary-deep active:translate-y-px disabled:opacity-50"
        >
          {type === "expense" ? "Add spending" : "Add income"}
        </button>
      </form>
    </Dialog>
  );
}
