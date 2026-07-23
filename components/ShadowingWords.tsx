"use client";

import { useEffect, useRef, useState } from "react";
import { tokenizeWords } from "@/lib/tokenizeWords";
import { useWordInfo } from "@/hooks/useWordInfo";
import { speakWord } from "@/lib/speak";
import { oxfordUrl } from "@/lib/oxford";
import type { WordInfo } from "@/lib/dictionary";

function OxfordLink({ word }: { word: string }) {
  return (
    <a
      href={oxfordUrl(word)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open “${word}” in Oxford Learner's Dictionaries`}
      title="Open in Oxford Learner's Dictionaries"
      className="shrink-0 rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
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
  );
}

export interface SaveWordEntry {
  word: string;
  ipa: string | null;
  definition: string;
  partOfSpeech: string | null;
}

interface WordActions {
  saved: boolean;
  onToggleSave: (entry: SaveWordEntry) => void;
}

function WordTooltip({
  info,
  actions,
}: {
  info: WordInfo;
  actions?: WordActions;
}) {
  const saveEntry: SaveWordEntry = {
    word: info.word,
    ipa: info.ipa,
    definition: info.meanings[0]?.definitions[0]?.definition ?? "",
    partOfSpeech: info.meanings[0]?.partOfSpeech || null,
  };
  return (
    <div className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">{info.word}</span>
          {info.ipa && (
            <span className="text-sm text-neutral-400">{info.ipa}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          <OxfordLink word={info.word} />
          <button
            onClick={() => speakWord(info.word)}
            aria-label="Pronounce word"
            className="shrink-0 rounded-md px-2 py-1 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            🔊
          </button>
        </div>
      </div>
      {actions && (
        <button
          onClick={() => actions.onToggleSave(saveEntry)}
          className={`mb-2 w-full rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            actions.saved
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-neutral-200 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          }`}
        >
          {actions.saved ? "✓ Saved to wordlist" : "＋ Save word"}
        </button>
      )}
      {info.meanings.length === 0 ? (
        <p className="text-sm text-neutral-400">No definition found.</p>
      ) : (
        <ul className="space-y-2">
          {info.meanings.map((m, i) => (
            <li key={i}>
              <span className="text-xs italic text-neutral-500">
                {m.partOfSpeech}
              </span>
              {m.definitions.map((d, j) => (
                <div key={j} className="text-sm leading-snug">
                  <p>{d.definition}</p>
                  {d.example && (
                    <p className="text-neutral-400 italic">“{d.example}”</p>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ShadowingWords({
  text,
  showIpa,
  savedWords,
  onToggleWord,
}: {
  text: string;
  showIpa: boolean;
  savedWords: Set<string>;
  onToggleWord: (entry: SaveWordEntry) => void;
}) {
  const tokens = tokenizeWords(text);
  const words = Array.from(
    new Set(tokens.map((t) => t.lookup).filter(Boolean)),
  );
  const info = useWordInfo(words);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveIdx(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openWord = (i: number, lookup: string) => {
    setActiveIdx((cur) => (cur === i ? null : i));
    speakWord(lookup);
  };

  return (
    <div ref={containerRef} className="flex flex-wrap gap-x-3 gap-y-4">
      {tokens.map((t, i) => {
        const wi = t.lookup ? info.get(t.lookup) : undefined;
        const active = activeIdx === i;
        return (
          <div key={i} className="relative flex flex-col items-center">
            {t.lookup ? (
              <button
                onClick={() => openWord(i, t.lookup)}
                className={`text-2xl leading-relaxed font-medium underline decoration-dotted decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900 dark:decoration-neutral-600 dark:hover:decoration-white ${
                  active ? "text-blue-600 dark:text-blue-400" : ""
                }`}
              >
                {t.raw}
              </button>
            ) : (
              <span className="text-2xl leading-relaxed font-medium">
                {t.raw}
              </span>
            )}
            {showIpa && wi?.ipa && (
              <span className="mt-1 text-xs text-neutral-400">{wi.ipa}</span>
            )}
            {active && wi && (
              <WordTooltip
                info={wi}
                actions={{
                  saved: savedWords.has(wi.word.toLowerCase()),
                  onToggleSave: onToggleWord,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
