"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { rankSuggestions, type VocabRow } from "@/lib/vocabulary";
import type { LookupResult, Sense } from "@/lib/gemini";
import { speakWord } from "@/lib/speak";
import { oxfordUrl } from "@/lib/oxford";
import ConfirmDialog from "./ConfirmDialog";
import LookupModal, { type LookupFields } from "./LookupModal";
import { useToast } from "./Toast";

/** A pending AI lookup awaiting the user's Apply confirmation. */
interface Pending {
  mode: "add" | "update";
  rowKey?: string;
  initial: LookupFields;
  /** Vietnamese meaning, shown for reference in the popup but not saved. */
  aiMeaning: string;
  /** Usage examples by part of speech, shown for reference but not saved. */
  senses: Sense[];
}

type Row = VocabRow & { _k: string };
type Field = keyof VocabRow;
type SortDir = "asc" | "desc";

const FIELDS: { key: Field; label: string; width: string }[] = [
  { key: "id", label: "ID", width: "w-20" },
  { key: "name", label: "Name", width: "w-72" },
  { key: "ipa", label: "IPA", width: "w-36" },
  { key: "type", label: "Type", width: "w-28" },
  { key: "description", label: "Description", width: "min-w-72" },
  { key: "unit", label: "Unit", width: "w-20" },
];

const PAGE_SIZE = 50;

const key = () => crypto.randomUUID();
const withKeys = (rows: VocabRow[]): Row[] =>
  rows.map((r) => ({ ...r, _k: key() }));
const strip = (rows: Row[]): VocabRow[] =>
  rows.map(({ _k, ...r }) => {
    void _k;
    return r;
  });

const unitKey = (u: string) => (u.trim() === "" ? "none" : u.trim());

function compareField(a: string, b: string, dir: SortDir): number {
  const av = a.trim();
  const bv = b.trim();
  if (av === "" && bv === "") return 0;
  if (av === "") return 1; // empties always last
  if (bv === "") return -1;
  const an = Number(av);
  const bn = Number(bv);
  const numeric = !Number.isNaN(an) && !Number.isNaN(bn);
  const base = numeric
    ? an - bn
    : av.localeCompare(bv, undefined, { sensitivity: "base" });
  return dir === "desc" ? -base : base;
}

export default function Vocabulary() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ col: Field; dir: SortDir } | null>(null);
  const [unitFilter, setUnitFilter] = useState<Set<string> | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const [lookingUp, setLookingUp] = useState<Set<string>>(new Set());
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const toast = useToast();

  // Warn before leaving/reloading with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    fetch("/api/vocabulary")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: VocabRow[]) => setRows(withKeys(data)))
      .catch(() => {})
      .finally(() => setLoading(false));

    let stored = "";
    try {
      stored = localStorage.getItem("shadowing:geminiModel") ?? "";
    } catch {
      // ignore storage errors
    }
    fetch("/api/vocabulary/models")
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d: { models: string[] }) => {
        const list = d.models ?? [];
        setModels(list);
        setModel(stored || list[0] || "gemini-flash-latest");
      })
      .catch(() => setModel(stored || "gemini-flash-latest"));
  }, []);

  const unitValues = useMemo(() => {
    const nums = new Set<string>();
    let hasNone = false;
    for (const r of rows) {
      if (r.unit.trim() === "") hasNone = true;
      else nums.add(r.unit.trim());
    }
    const sorted = [...nums].sort((a, b) => compareField(a, b, "asc"));
    return { sorted, hasNone };
  }, [rows]);

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? rows.filter((r) =>
          `${r.id} ${r.name} ${r.type} ${r.description} ${r.unit}`
            .toLowerCase()
            .includes(q),
        )
      : rows;
    if (unitFilter) list = list.filter((r) => unitFilter.has(unitKey(r.unit)));
    if (sort) {
      list = [...list].sort((a, b) =>
        compareField(a[sort.col], b[sort.col], sort.dir),
      );
    }
    return list;
  }, [rows, query, unitFilter, sort]);

  const names = useMemo(() => rows.map((r) => r.name), [rows]);
  const suggestions = useMemo(
    () => rankSuggestions(names, query, 8),
    [names, query],
  );
  const showSuggestions = suggestOpen && suggestions.length > 0;

  const pickSuggestion = (name: string) => {
    setQuery(name);
    setPage(0);
    setSuggestOpen(false);
    setActiveSuggestion(-1);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setSuggestOpen(false);
      setActiveSuggestion(-1);
    }
  };

  const pageCount = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = view.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  // Keep the active model selectable even if the live list doesn't include it
  // (e.g. a value restored from localStorage or set via GEMINI_MODEL).
  const modelOptions =
    model && !models.includes(model) ? [model, ...models] : models;

  const toggleSort = (col: Field) =>
    setSort((cur) =>
      cur && cur.col === col
        ? { col, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );
  const sortMark = (col: Field) =>
    !sort || sort.col !== col ? "↕" : sort.dir === "asc" ? "▲" : "▼";

  const totalUnitOptions = unitValues.sorted.length + (unitValues.hasNone ? 1 : 0);
  const toggleUnit = (k: string) =>
    setUnitFilter((cur) => {
      if (cur === null) return new Set([k]);
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      if (next.size === 0 || next.size === totalUnitOptions) return null;
      return next;
    });

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vocabulary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: strip(rows) }),
      });
      if (!res.ok) {
        toast("Couldn't save changes", "error");
        return;
      }
      setDirty(false);
      toast("Saved", "success");
    } catch {
      toast("Couldn't save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const editCell = (k: string, field: Field, value: string) => {
    setDirty(true);
    setRows((rs) => rs.map((r) => (r._k === k ? { ...r, [field]: value } : r)));
  };

  const changeModel = (m: string) => {
    setModel(m);
    try {
      localStorage.setItem("shadowing:geminiModel", m);
    } catch {
      // ignore storage errors
    }
  };

  /** Calls the Gemini lookup route; throws with a user-facing message. */
  const fetchLookup = async (word: string): Promise<LookupResult> => {
    const res = await fetch("/api/vocabulary/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, model }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? data.message ?? "Couldn't look that word up.");
    }
    return (await res.json()) as LookupResult;
  };

  // Look up an existing row's Name via Gemini, then preview before updating it.
  const lookupRow = async (row: Row) => {
    const word = row.name.trim();
    if (word === "" || lookingUp.has(row._k)) return;
    setLookingUp((s) => new Set(s).add(row._k));
    try {
      const result = await fetchLookup(word);
      setPending({
        mode: "update",
        rowKey: row._k,
        // The row keeps its own meaning to edit; the AI's stays alongside it.
        initial: {
          word: row.name,
          ipa: result.ipa,
          type: result.type,
          meaning: row.description,
        },
        aiMeaning: result.meaning,
        senses: result.senses,
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Lookup failed", "error");
    } finally {
      setLookingUp((s) => {
        const next = new Set(s);
        next.delete(row._k);
        return next;
      });
    }
  };

  // Look up a fresh word from the top box, then preview before adding a row.
  const lookupNew = async () => {
    const word = newWord.trim();
    if (word === "" || addingWord) return;
    setAddingWord(true);
    try {
      const result = await fetchLookup(word);
      setPending({
        mode: "add",
        // A new word has no meaning of its own yet, so the AI's is offered as a
        // starting point — editable, and only saved if it's still there on Apply.
        initial: {
          word: result.word,
          ipa: result.ipa,
          type: result.type,
          meaning: result.meaning,
        },
        aiMeaning: result.meaning,
        senses: result.senses,
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Lookup failed", "error");
    } finally {
      setAddingWord(false);
    }
  };

  // Commit the previewed lookup: add a new row, or update the looked-up row.
  const applyPending = (fields: LookupFields) => {
    if (!pending) return;
    if (pending.mode === "add") {
      // Word/IPA/type and the meaning as edited; examples stay reference-only.
      const next: Row[] = [
        ...rows,
        {
          _k: key(),
          id: "",
          name: fields.word,
          ipa: fields.ipa,
          type: fields.type,
          description: fields.meaning,
          unit: "",
        },
      ];
      setRows(next);
      setNewWord("");
      setQuery("");
      setUnitFilter(null);
      setSort(null);
      setPage(Math.floor((next.length - 1) / PAGE_SIZE));
      toast(`Added “${fields.word}”`, "success");
    } else {
      // Fill word/IPA/type and the row's own Description as edited.
      setRows((rs) =>
        rs.map((r) =>
          r._k === pending.rowKey
            ? {
                ...r,
                name: fields.word,
                ipa: fields.ipa,
                type: fields.type,
                description: fields.meaning,
              }
            : r,
        ),
      );
      toast(`Updated “${fields.word}”`, "success");
    }
    setDirty(true);
    setPending(null);
  };

  const addRow = () => {
    const next: Row[] = [
      ...rows,
      { _k: key(), id: "", name: "", ipa: "", type: "", description: "", unit: "" },
    ];
    setRows(next);
    setQuery("");
    setUnitFilter(null);
    setSort(null);
    setPage(Math.floor((next.length - 1) / PAGE_SIZE));
    setDirty(true);
  };

  const removeRow = (k: string) => {
    setRows((rs) => rs.filter((r) => r._k !== k));
    setDirty(true);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const res = await fetch("/api/vocabulary/import", {
        method: "POST",
        body: await file.arrayBuffer(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message ?? "Import failed", "error");
        return;
      }
      setRows(withKeys(data as VocabRow[]));
      setQuery("");
      setUnitFilter(null);
      setSort(null);
      setPage(0);
      setDirty(false); // import already persists on the server
      toast(`Imported ${data.length} rows`, "success");
    } catch {
      toast("Import failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vocabulary</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length.toLocaleString()} {rows.length === 1 ? "row" : "rows"} ·
            import & edit from Excel
            {dirty && (
              <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                · unsaved changes
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={saveAll}
            disabled={!dirty || saving}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed ${
              dirty
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
            }`}
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onImport}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {busy ? "Importing…" : "Import Excel"}
          </button>
          <a
            href="/api/vocabulary/export"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Export Excel
          </a>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          ✨ AI lookup
        </span>
        <input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void lookupNew();
          }}
          disabled={addingWord}
          placeholder="Type a word, e.g. serendipity"
          className="min-w-48 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={() => void lookupNew()}
          disabled={addingWord || newWord.trim() === ""}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {addingWord ? "Looking up…" : "Look up & add"}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          Model
          <select
            value={model}
            onChange={(e) => changeModel(e.target.value)}
            title="Switch model if you hit a rate limit"
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="relative mb-4 w-full max-w-sm">
        <input
          type="text"
          role="combobox"
          aria-controls="vocab-suggestions"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
            setSuggestOpen(true);
            setActiveSuggestion(-1);
          }}
          onFocus={() => setSuggestOpen(true)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search vocabulary…"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {showSuggestions && (
          <>
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setSuggestOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <ul
              id="vocab-suggestions"
              role="listbox"
              className="absolute left-0 right-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            >
              {suggestions.map((name, i) => (
                <li key={name} role="option" aria-selected={i === activeSuggestion}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(name)}
                    onMouseEnter={() => setActiveSuggestion(i)}
                    className={`block w-full truncate px-3 py-2 text-left text-sm ${
                      i === activeSuggestion
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm dark:border-neutral-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
                {FIELDS.map((f) => (
                  <th key={f.key} className={`p-0 ${f.width}`}>
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleSort(f.key)}
                        className="flex flex-1 items-center gap-1 px-3 py-3 transition-colors hover:text-neutral-900 dark:hover:text-white"
                      >
                        {f.label}
                        <span
                          className={`text-xs ${
                            sort?.col === f.key
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-neutral-300 dark:text-neutral-600"
                          }`}
                        >
                          {sortMark(f.key)}
                        </span>
                      </button>
                      {f.key === "unit" && (
                        <div className="relative">
                          <button
                            onClick={() => setFilterOpen((o) => !o)}
                            aria-label="Filter by unit"
                            title="Filter by unit"
                            className={`px-2 py-3 hover:text-neutral-900 dark:hover:text-white ${
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
                              <div className="absolute right-0 z-40 mt-1 max-h-64 w-36 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 font-normal normal-case tracking-normal shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                  <input
                                    type="checkbox"
                                    checked={unitFilter === null}
                                    onChange={() => setUnitFilter(null)}
                                  />
                                  All
                                </label>
                                {unitValues.sorted.map((n) => (
                                  <label
                                    key={n}
                                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        unitFilter === null || unitFilter.has(n)
                                      }
                                      onChange={() => toggleUnit(n)}
                                    />
                                    Unit {n}
                                  </label>
                                ))}
                                {unitValues.hasNone && (
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
                <th className="px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr>
                  <td
                    colSpan={FIELDS.length + 1}
                    className="px-4 py-10 text-center text-neutral-400"
                  >
                    {rows.length === 0
                      ? "No rows yet. Import an Excel file or add a row."
                      : "No rows match your search or filter."}
                  </td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr
                  key={row._k}
                  className="transition-colors even:bg-neutral-100/70 hover:bg-indigo-50 dark:even:bg-neutral-800/50 dark:hover:bg-neutral-800/80"
                >
                  {FIELDS.map((f) => (
                    <td key={f.key} className="px-2 py-1.5">
                      <input
                        value={row[f.key]}
                        title={row[f.key]}
                        aria-label={`${f.label} for row ${row.id || "new"}`}
                        onChange={(e) => editCell(row._k, f.key, e.target.value)}
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition hover:border-neutral-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:hover:border-neutral-700"
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => void lookupRow(row)}
                        disabled={row.name.trim() === "" || lookingUp.has(row._k)}
                        aria-label={`AI lookup for ${row.name}`}
                        title="AI lookup — IPA, type & Vietnamese meaning"
                        className="inline-flex items-center justify-center rounded-md p-2 text-indigo-500 transition hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-30 dark:hover:bg-indigo-500/15"
                      >
                        {lookingUp.has(row._k) ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          >
                            <path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round" />
                          </svg>
                        ) : (
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
                            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => speakWord(row.name)}
                        aria-label={`Pronounce ${row.name}`}
                        title="Pronounce"
                        className="inline-flex items-center justify-center rounded-md px-2 py-1 text-base transition hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70"
                      >
                        🔊
                      </button>
                      <a
                        href={oxfordUrl(row.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${row.name} in Oxford Learner's Dictionaries`}
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
                      <button
                        onClick={() => setConfirmDelete(row)}
                        aria-label={`Delete row ${row.id || row.name}`}
                        title="Delete row"
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add row
        </button>

        {pageCount > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setPage(0)}
              disabled={current === 0}
              className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Prev
            </button>
            <span className="tabular-nums text-neutral-500">
              Page {current + 1} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={current >= pageCount - 1}
              className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Next
            </button>
            <button
              onClick={() => setPage(pageCount - 1)}
              disabled={current >= pageCount - 1}
              className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Last
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete row?"
        message={
          confirmDelete
            ? `Delete “${confirmDelete.name || confirmDelete.id || "this row"}” from the vocabulary?`
            : ""
        }
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) removeRow(confirmDelete._k);
          setConfirmDelete(null);
        }}
      />

      {pending && (
        <LookupModal
          initial={pending.initial}
          aiMeaning={pending.aiMeaning}
          senses={pending.senses}
          mode={pending.mode}
          onApply={applyPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
