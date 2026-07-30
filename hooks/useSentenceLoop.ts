"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerHandle } from "@/components/YouTubePlayer";
import type { Sentence } from "@/lib/types";

interface LoopState {
  sentence: Sentence;
  repeatsLeft: number;
  /** False right after a seek, until playback re-enters the sentence window. */
  armed: boolean;
  /** Called once when the loop finishes naturally (not on manual stop). */
  onComplete?: () => void;
}

const POLL_MS = 150;
/** Largest gap we'll play through rather than seek across, in seconds. */
const SEAM_TOLERANCE = 0.5;

/**
 * True when playback is already inside the sentence, so it can roll straight on
 * instead of seeking. The end of a sentence is noticed up to POLL_MS late, which
 * leaves us just past the next one's start; seeking back from there makes the
 * player flicker and replays a sliver of audio.
 */
function alreadyInside(now: number, sentence: Sentence): boolean {
  return now >= sentence.start - SEAM_TOLERANCE && now < sentence.end;
}

/**
 * Drives per-sentence looping on a YouTube player: seeks to the sentence start,
 * plays at the given rate, and loops back until the repeat count is exhausted.
 */
export function useSentenceLoop(getPlayer: () => PlayerHandle | null) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<LoopState | null>(null);
  /** Set while a completion handler runs, so its play() can roll straight on. */
  const continuingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    getPlayer()?.pause();
    stateRef.current = null;
    setPlaying(false);
  }, [clearTimer, getPlayer]);

  const play = useCallback(
    (
      sentence: Sentence,
      repeat: number,
      rate: number,
      onComplete?: () => void,
    ) => {
      const player = getPlayer();
      if (!player) return;

      clearTimer();
      player.setPlaybackRate(rate);
      // Auto-next lands here already playing the next sentence, so leave the
      // player alone; anything else (replay, a click, resuming) needs the seek.
      if (!continuingRef.current || !alreadyInside(player.getCurrentTime(), sentence)) {
        player.seekTo(sentence.start);
        player.play();
      }
      stateRef.current = {
        sentence,
        repeatsLeft: repeat - 1,
        armed: true,
        onComplete,
      };
      setPlaying(true);

      intervalRef.current = setInterval(() => {
        const p = getPlayer();
        const state = stateRef.current;
        if (!p || !state) return;

        const now = p.getCurrentTime();

        // After seeking back, wait until we're safely inside the window again
        // so a stale time reading doesn't count as an extra loop.
        if (!state.armed) {
          if (now < state.sentence.end - 0.2) state.armed = true;
          return;
        }

        if (now >= state.sentence.end) {
          if (state.repeatsLeft > 0) {
            state.repeatsLeft -= 1;
            state.armed = false;
            p.seekTo(state.sentence.start);
          } else {
            const done = state.onComplete;
            clearTimer();
            stateRef.current = null;
            // Let the handler start the next sentence before deciding to pause,
            // so a continuing loop is never interrupted mid-word.
            continuingRef.current = true;
            done?.();
            continuingRef.current = false;
            if (stateRef.current === null) {
              p.pause();
              setPlaying(false);
            }
          }
        }
      }, POLL_MS);
    },
    [clearTimer, getPlayer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { play, stop, playing };
}
