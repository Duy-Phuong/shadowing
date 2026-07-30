"use client";

interface Props {
  playing: boolean;
  canPrev: boolean;
  canNext: boolean;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  /** What prev/next steps through, used in the button labels. */
  itemLabel?: string;
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  className: "h-5 w-5",
  "aria-hidden": true,
} as const;

const sideBtn =
  "flex h-11 w-14 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700";

export default function TransportControls({
  playing,
  canPrev,
  canNext,
  position,
  total,
  onPrev,
  onNext,
  onPlayPause,
  itemLabel = "sentence",
}: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        disabled={!canPrev}
        aria-label={`Previous ${itemLabel}`}
        title={`Previous ${itemLabel}`}
        className={sideBtn}
      >
        <svg {...iconProps}>
          <path d="M6 5v14a1 1 0 0 0 2 0V5a1 1 0 0 0-2 0Z" />
          <path d="M19.5 4.9 9.7 11.2a1 1 0 0 0 0 1.6l9.8 6.3a1 1 0 0 0 1.5-.8V5.7a1 1 0 0 0-1.5-.8Z" />
        </svg>
      </button>

      <button
        onClick={onPlayPause}
        aria-label={playing ? "Pause" : "Play"}
        title={playing ? "Pause" : "Play"}
        className="flex h-11 w-20 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"
      >
        {playing ? (
          <svg {...iconProps}>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg {...iconProps}>
            <path d="M7 5.3v13.4a1 1 0 0 0 1.5.9l11-6.7a1 1 0 0 0 0-1.8l-11-6.7A1 1 0 0 0 7 5.3Z" />
          </svg>
        )}
      </button>

      <button
        onClick={onNext}
        disabled={!canNext}
        aria-label={`Next ${itemLabel}`}
        title={`Next ${itemLabel}`}
        className={sideBtn}
      >
        <svg {...iconProps}>
          <path d="M18 5v14a1 1 0 0 1-2 0V5a1 1 0 0 1 2 0Z" />
          <path d="M4.5 4.9 14.3 11.2a1 1 0 0 1 0 1.6l-9.8 6.3a1 1 0 0 1-1.5-.8V5.7a1 1 0 0 1 1.5-.8Z" />
        </svg>
      </button>

      <span className="ml-1 text-sm tabular-nums text-neutral-400">
        {position + 1} / {total}
      </span>
    </div>
  );
}
