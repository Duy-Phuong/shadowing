"use client";

import { useState } from "react";
import type { Sense } from "@/lib/gemini";

export interface LookupFields {
  word: string;
  ipa: string;
  type: string;
  /** The row's own meaning — edited here and saved with the row. */
  meaning: string;
}

interface Props {
  /** Pre-filled editable values that get saved to the list. */
  initial: LookupFields;
  /** Vietnamese meaning from the AI — shown for reference only, never saved. */
  aiMeaning: string;
  /** Usage examples by part of speech — reference only, never saved. */
  senses: Sense[];
  /** "add" creates a new row, "update" fills the existing row. */
  mode: "add" | "update";
  onApply: (fields: LookupFields) => void;
  onCancel: () => void;
}

const COLUMNS: { key: keyof LookupFields; label: string; width: string }[] = [
  { key: "word", label: "Word", width: "w-44" },
  { key: "ipa", label: "IPA", width: "w-40" },
  { key: "type", label: "Type", width: "w-24" },
];

/** Preview of an AI lookup: editable Word/IPA/Type/Meaning + reference material. */
export default function LookupModal({
  initial,
  aiMeaning,
  senses,
  mode,
  onApply,
  onCancel,
}: Props) {
  const [fields, setFields] = useState<LookupFields>(initial);
  const set = (k: keyof LookupFields, v: string) =>
    setFields((f) => ({ ...f, [k]: v }));
  const canApply = fields.word.trim() !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">AI lookup result</h2>
            <p className="text-sm text-neutral-500">
              Review the fields below, then Apply to{" "}
              {mode === "add" ? "add it to the list" : "update this row"}. The
              AI meaning and examples are for reference and aren’t saved.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-neutral-400 transition hover:text-neutral-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`px-3 py-2 ${c.width}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-2 py-2 align-top">
                    <input
                      value={fields[c.key]}
                      onChange={(e) => set(c.key, e.target.value)}
                      aria-label={c.label}
                      className="w-full rounded-md border border-neutral-200 bg-transparent px-2 py-1 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <label
            htmlFor="lookup-meaning"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            Meaning · saved with the row
          </label>
          <textarea
            id="lookup-meaning"
            value={fields.meaning}
            onChange={(e) => set("meaning", e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700"
          />
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            AI meaning (Vietnamese) · reference only
          </span>
          <div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
            {aiMeaning || "—"}
          </div>
        </div>

        {senses.length > 0 && (
          <div className="mt-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Examples · reference only
            </span>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
              {senses.map((sense) => (
                <div key={sense.type}>
                  <p className="font-semibold">
                    {fields.word.trim() || initial.word}{" "}
                    <span className="italic text-neutral-500">{sense.type}</span>
                  </p>
                  <ul className="mt-1 space-y-1">
                    {sense.examples.map((ex, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden="true" className="text-neutral-400">
                          •
                        </span>
                        <span>
                          {ex.pattern && (
                            <span className="mr-2 font-medium text-indigo-600 dark:text-indigo-400">
                              {ex.pattern}
                            </span>
                          )}
                          <span className="text-neutral-600 dark:text-neutral-300">
                            {ex.sentence}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(fields)}
            disabled={!canApply}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
