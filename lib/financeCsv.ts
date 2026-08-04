import type { ImportedTransaction, TxType } from "./finance";
import { financeTagOptions, type FinanceTag } from "./tags";

export const CSV_COLUMNS = ["date", "type", "amount", "category", "note"];

export type CsvRowError = { line: number; message: string };

export type CsvParseResult = {
  rows: ImportedTransaction[];
  errors: CsvRowError[];
};

// Guardrail so a wrong file (or a runaway export) can't fire thousands of
// writes at Firestore in one go.
export const MAX_IMPORT_ROWS = 2000;

/* ------------------------------------------------------------------ parsing */

// RFC-4180-ish reader: quoted fields may contain the delimiter, newlines and
// doubled quotes. Returns raw cells; blank lines are dropped.
function readCsv(text: string, delimiter: string): string[][] {
  // Excel prefixes its CSV exports with a byte-order mark.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (src[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Spreadsheets on a comma-decimal locale (id-ID included) export with
// semicolons, so pick whichever separator the header actually uses.
function detectDelimiter(text: string) {
  const header = text.slice(0, text.indexOf("\n") + 1 || undefined);
  const count = (sep: string) => header.split(sep).length;
  return count(";") > count(",") ? ";" : ",";
}

// Accepts plain digits as well as grouped money like "50.000", "50,000" or
// "Rp 1.250.000,50". The last separator wins as the decimal point — unless it
// is the only kind present and either repeats or sits exactly three digits
// from the end, which makes it a thousands group.
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalized = cleaned;

  if (lastDot !== -1 || lastComma !== -1) {
    const decimalAt = Math.max(lastDot, lastComma);
    const decimalSep = cleaned[decimalAt];
    const groupSep = decimalSep === "." ? "," : ".";
    const repeated = cleaned.split(decimalSep).length > 2;
    const decimals = cleaned.length - decimalAt - 1;
    const isGroup =
      !cleaned.includes(groupSep) && (repeated || decimals === 3);

    normalized = isGroup
      ? cleaned.split(decimalSep).join("")
      : cleaned.split(groupSep).join("").replace(decimalSep, ".");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// Only ISO dates — "2026-08-04", optionally with "14:30" after a space or "T".
// Day/month-first formats are rejected rather than guessed at, since 03/04 is
// two different days depending on where you live. Times default to midday so a
// timezone shift can't push a row into the neighbouring month.
export function parseTxDate(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?$/.exec(
    raw.trim(),
  );
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;
  const date = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    hh ? Number(hh) : 12,
    mm ? Number(mm) : 0,
  );
  // Rejects overflow like 2026-02-31, which the Date constructor would roll over.
  return date.getMonth() === Number(m) - 1 && date.getDate() === Number(d)
    ? date
    : null;
}

function parseType(raw: string): TxType | null {
  const value = raw.trim().toLowerCase();
  if (value === "expense" || value === "spending") return "expense";
  if (value === "income") return "income";
  return null;
}

export function parseTransactionsCsv(text: string): CsvParseResult {
  const table = readCsv(text, detectDelimiter(text));
  const rows: ImportedTransaction[] = [];
  const errors: CsvRowError[] = [];

  if (table.length === 0) return { rows, errors };

  // The header is optional and may reorder columns; without one the cells are
  // read in template order.
  const first = table[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader = first.includes("date") && first.includes("amount");
  const order = hasHeader
    ? CSV_COLUMNS.map((name) => first.indexOf(name))
    : CSV_COLUMNS.map((_, i) => i);

  table.slice(hasHeader ? 1 : 0).forEach((cells, index) => {
    const line = index + (hasHeader ? 2 : 1);
    const cell = (i: number) => (order[i] === -1 ? "" : (cells[order[i]] ?? ""));

    if (rows.length >= MAX_IMPORT_ROWS) {
      if (errors.length === 0 || errors[errors.length - 1].line !== line) {
        errors.push({
          line,
          message: `Stopped at the ${MAX_IMPORT_ROWS}-row limit — split the file and import the rest separately.`,
        });
      }
      return;
    }

    const createdAt = parseTxDate(cell(0));
    if (!createdAt) {
      errors.push({
        line,
        message: `Date "${cell(0).trim()}" isn't YYYY-MM-DD.`,
      });
      return;
    }

    const type = parseType(cell(1));
    if (!type) {
      errors.push({
        line,
        message: `Type "${cell(1).trim()}" must be expense or income.`,
      });
      return;
    }

    const amount = parseAmount(cell(2));
    if (amount === null || amount <= 0) {
      errors.push({
        line,
        message: `Amount "${cell(2).trim()}" isn't a positive number.`,
      });
      return;
    }

    rows.push({
      type,
      amount,
      category: cell(3).trim() || "Other",
      note: cell(4).trim(),
      createdAt,
    });
  });

  return { rows, errors };
}

/* ----------------------------------------------------------------- template */

const quote = (value: string) =>
  /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

// A ready-to-fill file: the header plus three example rows using the user's
// own categories, dated in the current month.
export function buildTemplateCsv(tags: FinanceTag[] | null) {
  const expense = financeTagOptions(tags, "expense");
  const income = financeTagOptions(tags, "income");
  const day = (n: number) => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
  };

  const samples = [
    [day(1), "expense", "50000", expense[0]?.name ?? "Other", "Lunch"],
    [day(2), "expense", "25000", expense[1]?.name ?? "Other", "Bus fare"],
    [day(3), "income", "5000000", income[0]?.name ?? "Other", "Monthly pay"],
  ];

  return [CSV_COLUMNS, ...samples]
    .map((cells) => cells.map(quote).join(","))
    .join("\r\n");
}

export function downloadTemplateCsv(tags: FinanceTag[] | null) {
  const blob = new Blob([buildTemplateCsv(tags)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "transactions-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
