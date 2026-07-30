"use client";

interface Props {
  saved: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/** Save/unsave the sentence currently being practised. */
export default function SaveSentenceButton({
  saved,
  onToggle,
  disabled,
}: Props) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={saved}
      title={saved ? "Saved to My Sentences" : "Save to My Sentences"}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
        saved
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:hover:text-white"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
      </svg>
      {saved ? "Saved" : "Save sentence"}
    </button>
  );
}
