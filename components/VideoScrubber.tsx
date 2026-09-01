"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PlayerHandle } from "./YouTubePlayer";

/** Formats seconds as m:ss. */
function fmt(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  player: RefObject<PlayerHandle | null>;
  /** Called with the target time (seconds) when the user clicks or drags. */
  onSeek: (seconds: number) => void;
}

/**
 * An always-visible progress bar for the embedded player. Reads current time and
 * duration on a poll, and lets the user click or drag anywhere to seek — a
 * reliable alternative to YouTube's (hidden) native controls.
 */
export default function VideoScrubber({ player, onSeek }: Props) {
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragFrac, setDragFrac] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (draggingRef.current) return; // don't fight an in-progress drag
      const p = player.current;
      if (!p) return;
      setTime(p.getCurrentTime());
      setDuration(p.getDuration());
    }, 250);
    return () => window.clearInterval(id);
  }, [player]);

  const fracFromClientX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    setDragFrac(fracFromClientX(e.clientX));
    const move = (ev: PointerEvent) => setDragFrac(fracFromClientX(ev.clientX));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      draggingRef.current = false;
      const f = fracFromClientX(ev.clientX);
      setDragFrac(null);
      const d = player.current?.getDuration() ?? 0;
      if (d > 0) onSeek(f * d);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const frac =
    dragFrac !== null ? dragFrac : duration > 0 ? time / duration : 0;
  const shownTime = dragFrac !== null ? dragFrac * duration : time;

  const step = (delta: number) => {
    const d = player.current?.getDuration() ?? 0;
    const t = player.current?.getCurrentTime() ?? 0;
    onSeek(Math.min(d, Math.max(0, t + delta)));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-500">
        {fmt(shownTime)}
      </span>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onClick={(e) => {
          // Plain click-to-seek (drag is handled by the pointer handlers).
          const d = player.current?.getDuration() ?? 0;
          if (d > 0) onSeek(fracFromClientX(e.clientX) * d);
        }}
        role="slider"
        aria-label="Seek video"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shownTime)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            step(5);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            e.stopPropagation();
            step(-5);
          }
        }}
        className="group relative flex-1 cursor-pointer touch-none py-2"
      >
        {/* Visual bar sits inside a taller, padded hit area for easy clicking. */}
        <div className="relative h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-indigo-600"
            style={{ width: `${frac * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 opacity-0 shadow transition group-hover:opacity-100"
            style={{ left: `${frac * 100}%` }}
          />
        </div>
      </div>
      <span className="w-10 shrink-0 text-xs tabular-nums text-neutral-500">
        {fmt(duration)}
      </span>
    </div>
  );
}
