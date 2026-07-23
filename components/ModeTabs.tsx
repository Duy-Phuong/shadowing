"use client";

import type { PracticeMode } from "@/lib/types";

interface Props {
  mode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}

const MODES: { key: PracticeMode; label: string }[] = [
  { key: "shadowing", label: "Shadowing" },
  { key: "dictation", label: "Dictation" },
];

export default function ModeTabs({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            mode === key
              ? "bg-indigo-600 text-white"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
