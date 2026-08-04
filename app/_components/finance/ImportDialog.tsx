"use client";

import { useRef, useState } from "react";
import { formatMoney, type ImportedTransaction } from "@/lib/finance";
import {
  CSV_COLUMNS,
  downloadTemplateCsv,
  parseTransactionsCsv,
  type CsvParseResult,
} from "@/lib/financeCsv";
import type { FinanceTag } from "@/lib/tags";
import Dialog from "../Dialog";
import Icon from "../Icon";

const isCsv = (file: File) =>
  file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");

export default function ImportDialog({
  open,
  onClose,
  tags,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  tags: FinanceTag[] | null;
  onImport: (rows: ImportedTransaction[]) => Promise<unknown>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  function reset() {
    setFileName("");
    setParsed(null);
    setDragging(false);
    setBusy(false);
    setFailure("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function handleClose() {
    if (busy) return; // don't walk away mid-write
    reset();
    onClose();
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFailure("");
    setFileName(file.name);
    if (!isCsv(file)) {
      setParsed(null);
      setFailure("That isn't a .csv file.");
      return;
    }
    setParsed(parseTransactionsCsv(await file.text()));
  }

  async function handleImport() {
    if (!parsed?.rows.length) return;
    setBusy(true);
    setFailure("");
    try {
      await onImport(parsed.rows);
      reset();
      onClose();
    } catch {
      setBusy(false);
      setFailure("Import failed. Check your connection and try again.");
    }
  }

  const rows = parsed?.rows ?? [];
  const errors = parsed?.errors ?? [];

  return (
    <Dialog open={open} onClose={handleClose} title="Import transactions">
      <div className="flex flex-col gap-[18px]">
        <div className="rounded-[14px] border-[1.5px] border-line-soft bg-panel p-3.5">
          <p className="m-0 text-[13px] font-bold text-ink-soft">
            Columns: {CSV_COLUMNS.join(", ")}
          </p>
          <p className="m-0 mt-1 text-[12.5px] font-semibold text-muted">
            Dates are <code className="font-mono">YYYY-MM-DD</code> (a{" "}
            <code className="font-mono">HH:MM</code> after the date is
            optional), type is <em>expense</em> or <em>income</em>, and note may
            be left blank.
          </p>
          <button
            type="button"
            onClick={() => downloadTemplateCsv(tags)}
            className="mt-3 flex items-center gap-1.5 rounded-xl border-[1.5px] border-line bg-card px-3.5 py-2 font-display text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-chip">
            <Icon name="download" size={17} />
            Download template
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            readFile(e.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center gap-2 rounded-[14px] border-[1.5px] border-dashed p-6 text-center transition-colors ${
            dragging ? "border-primary bg-primary/6" : "border-line bg-panel"
          }`}>
          <Icon name="upload_file" size={26} className="text-muted-soft" />
          <p className="m-0 text-[13px] font-bold text-ink-soft">
            {fileName || "Drop a CSV here"}
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => readFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-xl border-[1.5px] border-line bg-card px-3.5 py-2 font-display text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-chip">
            {fileName ? "Choose another file" : "Choose file"}
          </button>
        </div>

        {failure && (
          <p className="m-0 text-[13px] font-bold text-primary">{failure}</p>
        )}

        {parsed && (
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-[13.5px] font-extrabold text-ink">
              {rows.length} transaction{rows.length === 1 ? "" : "s"} ready
              {errors.length > 0 && (
                <span className="font-bold text-muted">
                  {" "}
                  · {errors.length} row{errors.length === 1 ? "" : "s"} skipped
                </span>
              )}
            </p>

            {rows.length > 0 && (
              <ul className="m-0 flex max-h-40 list-none flex-col gap-1.5 overflow-y-auto p-0">
                {rows.slice(0, 50).map((row, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2.5 rounded-[10px] bg-panel px-3 py-2 text-[12.5px] font-bold">
                    <span className="w-20 shrink-0 text-muted">
                      {row.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">
                      {row.note || row.category}
                    </span>
                    <span
                      className={
                        row.type === "income" ? "text-[#38a186]" : "text-ink"
                      }>
                      {row.type === "income" ? "+" : "−"}
                      {formatMoney(row.amount)}
                    </span>
                  </li>
                ))}
                {rows.length > 50 && (
                  <li className="px-3 text-[12px] font-bold text-muted">
                    + {rows.length - 50} more
                  </li>
                )}
              </ul>
            )}

            {errors.length > 0 && (
              <ul className="m-0 flex max-h-28 list-none flex-col gap-1 overflow-y-auto rounded-[10px] bg-primary/6 p-3">
                {errors.slice(0, 20).map((error, i) => (
                  <li
                    key={i}
                    className="text-[12.5px] font-bold text-primary-deep">
                    Line {error.line}: {error.message}
                  </li>
                ))}
                {errors.length > 20 && (
                  <li className="text-[12px] font-bold text-muted">
                    + {errors.length - 20} more
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleImport}
          disabled={busy || rows.length === 0}
          className="mt-1 rounded-[13px] bg-primary p-3.5 font-display text-base font-semibold text-white shadow-[0_12px_26px_-12px_rgba(220,43,84,0.75)] transition-colors hover:bg-primary-deep active:translate-y-px disabled:opacity-50">
          {busy
            ? "Importing…"
            : rows.length === 0
              ? "Import transactions"
              : `Import ${rows.length} transaction${rows.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </Dialog>
  );
}
