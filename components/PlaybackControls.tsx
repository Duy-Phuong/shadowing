"use client";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const REPEATS = [1, 2, 3, 5];

interface Props {
  speed: number;
  repeat: number;
  onSpeedChange: (speed: number) => void;
  onRepeatChange: (repeat: number) => void;
}

function Segmented<T extends number>({
  label,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  format: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              opt === value
                ? "bg-indigo-600 text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {format(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PlaybackControls({
  speed,
  repeat,
  onSpeedChange,
  onRepeatChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Segmented
        label="Speed"
        value={speed}
        options={SPEEDS}
        format={(v) => `${v}×`}
        onChange={onSpeedChange}
      />
      <Segmented
        label="Repeat"
        value={repeat}
        options={REPEATS}
        format={(v) => `${v}×`}
        onChange={onRepeatChange}
      />
    </div>
  );
}
