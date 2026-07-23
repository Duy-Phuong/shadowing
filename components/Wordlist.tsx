"use client";

import { useState } from "react";
import { speakWord } from "@/lib/speak";
import { oxfordUrl } from "@/lib/oxford";
import {
  sortEntries,
  type SortColumn,
  type SortDir,
  type WordEntry,
} from "@/lib/wordlist";
import ConfirmDialog from "./ConfirmDialog";
import Flashcards from "./Flashcards";

interface Props {
  entries: WordEntry[];
  loading: boolean;
  onRemove: (word: string) => void;
  onSetUnit: (word: string, unit: number | null) => void;
}

type WordRow = WordEntry & { id: number };

// "id" is the stable insertion order; the rest map to WordEntry fields.
type Column = SortColumn | "id";

const COLUMNS: { key: Column; label: string }[] = [
  { key: "id", label: "#" },
  { key: "word", label: "Name" },
  { key: "partOfSpeech", label: "Type" },
  { key: "ipa", label: "IPA" },
  { key: "definition", label: "Description" },
  { key: "unit", label: "Unit" },
];

export default function Wordlist({
  entries,
  loading,
  onRemove,
  onSetUnit,
}: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<WordEntry | null>(null);
  const [sort, setSort] = useState<{ column: Column; dir: SortDir } | null>(
    null,
  );
  // null = show all units (default); a Set = show only those unit keys.
  const [unitFilter, setUnitFilter] = useState<Set<string> | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  if (reviewing && entries.length > 0) {
    return <Flashcards entries={entries} onExit={() => setReviewing(false)} />;
  }

  const unitKey = (u: number | null | undefined) =>
    u == null ? "none" : String(u);

  // Distinct units present, for the filter menu.
  const numberUnits = Array.from(
    new Set(entries.map((e) => e.unit).filter((u): u is number => u != null)),
  ).sort((x, y) => x - y);
  const hasNoUnit = entries.some((e) => e.unit == null);
  const totalUnitOptions = numberUnits.length + (hasNoUnit ? 1 : 0);

  const showAllUnits = () => setUnitFilter(null);
  const toggleUnit = (key: string) =>
    setUnitFilter((cur) => {
      if (cur === null) return new Set([key]); // was "all" → restrict to one
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // Empty or everything selected both mean "show all".
      if (next.size === 0 || next.size === totalUnitOptions) return null;
      return next;
    });

  const rows: WordRow[] = entries.map((e, i) => ({ ...e, id: i + 1 }));
  const shownRows = unitFilter
    ? rows.filter((r) => unitFilter.has(unitKey(r.unit)))
    : rows;
  const displayed: WordRow[] = !sort
    ? shownRows
    : sort.column === "id"
      ? sort.dir === "desc"
        ? [...shownRows].reverse()
        : shownRows
      : (sortEntries(shownRows, sort.column, sort.dir) as WordRow[]);

  const toggleSort = (column: Column) =>
    setSort((cur) =>
      cur && cur.column === column
        ? { column, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { column, dir: "asc" },
    );

  const sortMark = (column: Column) => {
    if (!sort || sort.column !== column) return "↕";
    return sort.dir === "asc" ? "▲" : "▼";
  };

  const commitUnit = (row: WordRow, raw: string) => {
    const trimmed = raw.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && Number.isNaN(next)) return;
    if ((row.unit ?? null) !== next) onSetUnit(row.word, next);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Wordlist</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {entries.length} {entries.length === 1 ? "word" : "words"} saved
          </p>
        </div>
        <button
          onClick={() => setReviewing(true)}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <rect x="3" y="8" width="13" height="13" rx="2" />
            <path d="M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3" />
          </svg>
          Review
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-neutral-400">
          No saved words yet. In Shadowing, tap a word and use “＋ Save word”.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
                {COLUMNS.map((c) => (
                  <th key={c.key} className="p-0">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="flex flex-1 items-center gap-1 px-4 py-3 transition-colors hover:text-neutral-900 dark:hover:text-white"
                      >
                        {c.label}
                        <span
                          className={`text-xs ${
                            sort?.column === c.key
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-neutral-300 dark:text-neutral-600"
                          }`}
                        >
                          {sortMark(c.key)}
                        </span>
                      </button>
                      {c.key === "unit" && (
                        <div className="relative">
                          <button
                            onClick={() => setFilterOpen((o) => !o)}
                            aria-label="Filter by unit"
                            title="Filter by unit"
                            className={`px-2 py-2 hover:text-neutral-900 dark:hover:text-white ${
                              unitFilter
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-neutral-300 dark:text-neutral-600"
                            }`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill={unitFilter ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            >
                              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                            </svg>
                          </button>
                          {filterOpen && (
                            <>
                              <button
                                aria-hidden="true"
                                tabIndex={-1}
                                onClick={() => setFilterOpen(false)}
                                className="fixed inset-0 z-30 cursor-default"
                              />
                              <div className="absolute right-0 z-40 mt-1 w-36 rounded-lg border border-neutral-200 bg-white p-1 font-normal shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                  <input
                                    type="checkbox"
                                    checked={unitFilter === null}
                                    onChange={showAllUnits}
                                  />
                                  All
                                </label>
                                {numberUnits.map((n) => {
                                  const key = String(n);
                                  return (
                                    <label
                                      key={key}
                                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          unitFilter === null ||
                                          unitFilter.has(key)
                                        }
                                        onChange={() => toggleUnit(key)}
                                      />
                                      Unit {n}
                                    </label>
                                  );
                                })}
                                {hasNoUnit && (
                                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    <input
                                      type="checkbox"
                                      checked={
                                        unitFilter === null ||
                                        unitFilter.has("none")
                                      }
                                      onChange={() => toggleUnit("none")}
                                    />
                                    No unit
                                  </label>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3" colSpan={3}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-neutral-400"
                  >
                    No words match this filter.
                  </td>
                </tr>
              )}
              {displayed.map((row) => (
                <tr
                  key={row.word}
                  className="transition-colors even:bg-neutral-100/70 hover:bg-indigo-50 dark:even:bg-neutral-800/50 dark:hover:bg-neutral-800/80"
                >
                  <td className="px-4 py-3 tabular-nums text-neutral-400">
                    {row.id}
                  </td>
                  <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                    {row.word}
                  </td>
                  <td className="px-4 py-3">
                    {row.partOfSpeech ? (
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {row.partOfSpeech}
                      </span>
                    ) : (
                      <span className="text-neutral-300 dark:text-neutral-600">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {row.ipa ? (
                      <span className="font-mono text-[13px]">{row.ipa}</span>
                    ) : (
                      <span className="text-neutral-300 dark:text-neutral-600">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {row.definition || (
                      <span className="text-neutral-300 dark:text-neutral-600">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      key={`${row.word}-${row.unit ?? ""}`}
                      defaultValue={row.unit ?? ""}
                      aria-label={`Unit for ${row.word}`}
                      onBlur={(e) => commitUnit(row, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="w-14 rounded-md border border-neutral-200 bg-white/60 px-2 py-1 text-center text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900/40"
                    />
                  </td>
                  <td className="px-1 py-3 text-center">
                    <button
                      onClick={() => speakWord(row.word)}
                      aria-label={`Pronounce ${row.word}`}
                      title="Pronounce"
                      className="inline-flex items-center justify-center rounded-md p-2 text-lg leading-none transition hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70"
                    >
                      🔊
                    </button>
                  </td>
                  <td className="px-1 py-3 text-center">
                    <a
                      href={oxfordUrl(row.word)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${row.word} in Oxford Learner's Dictionaries`}
                      title="Open in Oxford Learner's Dictionaries"
                      className="inline-flex items-center justify-center rounded-md p-2 text-neutral-400 transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:hover:bg-neutral-700/70 dark:hover:text-white"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
                      </svg>
                    </a>
                  </td>
                  <td className="px-1 py-3 pr-3 text-center">
                    <button
                      onClick={() => setConfirmRemove(row)}
                      aria-label={`Remove ${row.word}`}
                      title={`Remove ${row.word}`}
                      className="inline-flex items-center justify-center rounded-md p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove word?"
        message={
          confirmRemove ? `Remove “${confirmRemove.word}” from your wordlist?` : ""
        }
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) onRemove(confirmRemove.word);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}
