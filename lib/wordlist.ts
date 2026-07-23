export interface WordEntry {
  word: string;
  ipa: string | null;
  definition: string;
  /** Part of speech (e.g. "noun", "verb"); absent for words saved before this existed. */
  partOfSpeech?: string | null;
  /** User-assigned difficulty; absent until the user sets it. */
  unit?: number | null;
}

/** Data columns of the wordlist table that support sorting. */
export type SortColumn = "word" | "partOfSpeech" | "ipa" | "definition" | "unit";
export type SortDir = "asc" | "desc";

// CSV storage so the saved file opens directly in Excel/Sheets. Columns map
// to the wordlist table (Name/Type/IPA/Description/Unit).
const CSV_HEADER = "Name,Type,IPA,Description,Unit";

/** Wraps a cell in quotes (doubling internal quotes) when it needs escaping. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Splits CSV text into rows of fields, honoring quoted commas/newlines. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseWordlist(text: string): WordEntry[] {
  const rows = parseCsvRows(text);
  const result: WordEntry[] = [];
  for (let i = 0; i < rows.length; i++) {
    const [word = "", type = "", ipa = "", definition = "", unit = ""] = rows[i];
    // Skip the header row and any row missing a word.
    if (i === 0 && word.toLowerCase() === "name") continue;
    if (word.trim() === "") continue;
    const unitNum = unit.trim() === "" ? null : Number(unit);
    result.push({
      word,
      ipa: ipa === "" ? null : ipa,
      definition,
      partOfSpeech: type === "" ? null : type,
      unit: unitNum === null || Number.isNaN(unitNum) ? null : unitNum,
    });
  }
  return result;
}

export function serializeWordlist(entries: WordEntry[]): string {
  const rows = entries.map((e) =>
    [
      e.word,
      e.partOfSpeech ?? "",
      e.ipa ?? "",
      e.definition ?? "",
      e.unit == null ? "" : String(e.unit),
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_HEADER, ...rows].join("\r\n");
}

export function addWord(entries: WordEntry[], entry: WordEntry): WordEntry[] {
  const key = entry.word.toLowerCase();
  if (entries.some((e) => e.word.toLowerCase() === key)) return entries;
  return [...entries, entry];
}

export function removeWord(entries: WordEntry[], word: string): WordEntry[] {
  const key = word.toLowerCase();
  return entries.filter((e) => e.word.toLowerCase() !== key);
}

/** Merges a partial patch into the entry whose word matches (case-insensitive). */
export function updateWord(
  entries: WordEntry[],
  word: string,
  patch: Partial<WordEntry>,
): WordEntry[] {
  const key = word.toLowerCase();
  return entries.map((e) =>
    e.word.toLowerCase() === key ? { ...e, ...patch } : e,
  );
}

const isMissing = (v: unknown): boolean =>
  v === null || v === undefined || v === "";

/**
 * Returns a sorted copy of the entries by a single column. Missing values
 * (null/undefined/empty) always sort last, regardless of direction. Text
 * columns compare case-insensitively; `unit` compares numerically.
 */
export function sortEntries(
  entries: WordEntry[],
  column: SortColumn,
  dir: SortDir,
): WordEntry[] {
  return [...entries].sort((a, b) => {
    const av = a[column];
    const bv = b[column];
    const am = isMissing(av);
    const bm = isMissing(bv);
    if (am && bm) return 0;
    if (am) return 1;
    if (bm) return -1;
    const base =
      column === "unit"
        ? (av as number) - (bv as number)
        : String(av).localeCompare(String(bv), undefined, {
            sensitivity: "base",
          });
    return dir === "desc" ? -base : base;
  });
}
