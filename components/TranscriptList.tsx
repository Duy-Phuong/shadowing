"use client";

import { useEffect, useRef, useState } from "react";
import { maskText } from "@/lib/maskText";
import type { Sentence } from "@/lib/types";

interface Props {
  sentences: Sentence[];
  selectedId: number;
  masked: boolean;
  onSelect: (id: number) => void;
}

function EyeIcon({ off }: { off: boolean }) {
  return (
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

export default function TranscriptList({
  sentences,
  selectedId,
  masked,
  onSelect,
}: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // Not smooth-scrolled: with auto-next the selection moves on its own, and a
  // queued animation can be dropped, leaving the active line off-screen.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const toggleReveal = (id: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
        {sentences.length} sentences
      </div>
      <ol className="flex-1 space-y-1 overflow-y-auto pr-1">
        {sentences.map((s) => {
          const active = s.id === selectedId;
          const show = !masked || revealed.has(s.id);
          return (
            <li key={s.id}>
              <div
                className={`flex items-center gap-1 rounded-md pr-1 transition ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <button
                  ref={active ? activeRef : undefined}
                  onClick={() => onSelect(s.id)}
                  className="flex flex-1 gap-3 px-3 py-2 text-left text-sm"
                >
                  <span
                    className={`shrink-0 tabular-nums ${
                      active ? "opacity-70" : "text-neutral-400"
                    }`}
                  >
                    {s.id + 1}
                  </span>
                  <span
                    className={
                      show ? "" : `tracking-wide ${active ? "" : "text-neutral-400"}`
                    }
                  >
                    {show ? s.text : maskText(s.text)}
                  </span>
                </button>
                {masked && (
                  <button
                    onClick={() => toggleReveal(s.id)}
                    aria-label={
                      show ? "Hide sentence text" : "Show sentence text"
                    }
                    title={show ? "Hide text" : "Show text"}
                    className={`shrink-0 rounded-md p-2 transition ${
                      active
                        ? "opacity-70 hover:opacity-100"
                        : "text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <EyeIcon off={show} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
