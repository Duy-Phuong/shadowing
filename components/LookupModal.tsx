"use client";

import { useState } from "react";

export interface LookupFields {
  word: string;
  ipa: string;
  type: string;
  meaning: string;
}

interface Props {
  /** Pre-filled values from the AI lookup. */
  initial: LookupFields;
  /** "add" creates a new row, "update" fills the existing row. */
  mode: "add" | "update";
  onApply: (fields: LookupFields) => void;
  onCancel: () => void;
}

const COLUMNS: { key: keyof LookupFields; label: string; width: string }[] = [
  { key: "word", label: "Word", width: "w-40" },
  { key: "ipa", label: "IPA", width: "w-36" },
  { key: "type", label: "Type", width: "w-24" },
  { key: "meaning", label: "Meaning (Vietnamese)", width: "min-w-56" },
];

/** Preview of an AI lookup: editable columns + Apply to save to the list. */
export default function LookupModal({ initial, mode, onApply, onCancel }: Props) {
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
        className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">AI lookup result</h2>
            <p className="text-sm text-neutral-500">
              Review and edit, then Apply to{" "}
              {mode === "add" ? "add it to the list" : "update this row"}.
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
                    {c.key === "meaning" ? (
                      <textarea
                        value={fields[c.key]}
                        onChange={(e) => set(c.key, e.target.value)}
                        rows={2}
                        aria-label={c.label}
                        className="w-full resize-none rounded-md border border-neutral-200 bg-transparent px-2 py-1 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700"
                      />
                    ) : (
                      <input
                        value={fields[c.key]}
                        onChange={(e) => set(c.key, e.target.value)}
                        aria-label={c.label}
                        className="w-full rounded-md border border-neutral-200 bg-transparent px-2 py-1 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700"
                      />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

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
