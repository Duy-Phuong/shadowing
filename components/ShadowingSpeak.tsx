"use client";

import { useRef, useState } from "react";
import { compareWords } from "@/lib/compareWords";
import { pronunciationAccuracy } from "@/lib/pronunciation";
import { celebrate } from "@/lib/confetti";
import type { SpeechRecognitionInstance } from "@/types/speech";

function getRecognitionCtor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

const WORD_STYLE = {
  correct: "text-green-600 dark:text-green-400",
  partial: "text-amber-600 dark:text-amber-400",
  wrong: "text-red-600 line-through dark:text-red-400",
  empty: "text-neutral-400",
} as const;

export default function ShadowingSpeak({ expected }: { expected: string }) {
  const [supported] = useState(() => getRecognitionCtor() !== undefined);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  if (!supported) {
    return (
      <p className="text-xs text-neutral-400">
        Speaking practice needs Chrome or Edge (Web Speech API).
      </p>
    );
  }

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setHeard(transcript);
      if (pronunciationAccuracy(expected, transcript) === 100) void celebrate();
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setHeard(null);
    setListening(true);
    recognition.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const results = heard !== null ? compareWords(expected, heard) : null;
  const accuracy = heard !== null ? pronunciationAccuracy(expected, heard) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={listening ? stop : start}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
            listening
              ? "bg-red-600 hover:bg-red-700"
              : "bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          }`}
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
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
          </svg>
          {listening ? "Listening… tap to stop" : "Speak"}
        </button>
        {results && (
          <span
            className={`text-sm font-semibold ${
              accuracy >= 80
                ? "text-green-600 dark:text-green-400"
                : accuracy >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {accuracy}% match
          </span>
        )}
      </div>

      {results && (
        <>
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-lg">
            {results.map((r, i) => (
              <span key={i} className={WORD_STYLE[r.status]}>
                {r.expected}
              </span>
            ))}
          </p>
          <p className="text-xs text-neutral-400">
            You said: “{heard || "(nothing heard)"}”
          </p>
        </>
      )}
    </div>
  );
}
