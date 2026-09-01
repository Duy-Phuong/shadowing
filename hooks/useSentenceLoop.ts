"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerHandle } from "@/components/YouTubePlayer";
import type { Sentence } from "@/lib/types";

interface LoopState {
  sentence: Sentence;
  repeatsLeft: number;
  /** False right after a seek, until playback re-enters the sentence window. */
  armed: boolean;
  /** Playback rate, used to predict where the playhead should be next poll. */
  rate: number;
  /** Where we expect the playhead next poll; null skips the first check. */
  expected: number | null;
  /** Polls spent waiting for playback to settle inside the sentence. */
  waited: number;
  /** Called once when the loop finishes naturally (not on manual stop). */
  onComplete?: () => void;
}

const POLL_MS = 150;
/** Largest gap we'll play through rather than seek across, in seconds. */
const SEAM_TOLERANCE = 0.5;
/**
 * If the playhead moves further than this from where we expected it, the user
 * grabbed the scrubber — we release the loop so the video plays freely. Natural
 * per-poll advance is well under a second even at 1.5×, so this never misfires.
 */
const SEEK_JUMP = 1.2;
/**
 * How long playback may take to settle inside the sentence before we give up and
 * pause. Only a stall or an unplayable window gets near this — a normal seek
 * lands within a poll or two — and without it a window the playhead never enters
 * would leave the loop polling while the video runs on past the sentence.
 */
const ARM_TIMEOUT_MS = 5000;

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
      const seeked =
        !continuingRef.current ||
        !alreadyInside(player.getCurrentTime(), sentence);
      if (seeked) {
        player.seekTo(sentence.start);
        player.play();
      }
      stateRef.current = {
        sentence,
        repeatsLeft: repeat - 1,
        // "armed" means playback has settled inside the sentence. After a seek
        // it's false until the playhead lands in the window — this absorbs the
        // pre-seek → post-seek jump so it isn't mistaken for a manual scrub.
        armed: !seeked,
        rate,
        expected: null,
        waited: 0,
        onComplete,
      };
      setPlaying(true);

      intervalRef.current = setInterval(() => {
        const p = getPlayer();
        const state = stateRef.current;
        if (!p || !state) return;

        const now = p.getCurrentTime();

        // Wait for playback to land inside the sentence after a seek before we
        // start tracking, so the seek transition doesn't read as a manual jump.
        if (!state.armed) {
          if (
            now >= state.sentence.start - SEAM_TOLERANCE &&
            now < state.sentence.end
          ) {
            state.armed = true;
            state.expected = now + (POLL_MS / 1000) * state.rate;
            return;
          }
          state.waited += 1;
          // Never settled: stop rather than let the video play on unattended.
          if (state.waited * POLL_MS >= ARM_TIMEOUT_MS) {
            clearTimer();
            stateRef.current = null;
            p.pause();
            setPlaying(false);
          }
          return;
        }

        // If the playhead jumped away from where natural playback would put it,
        // the user scrubbed the progress bar — release the loop and let the
        // video keep playing from there like a normal YouTube video.
        if (state.expected !== null && Math.abs(now - state.expected) > SEEK_JUMP) {
          clearTimer();
          stateRef.current = null;
          return;
        }
        state.expected = now + (POLL_MS / 1000) * state.rate;

        if (now >= state.sentence.end) {
          if (state.repeatsLeft > 0) {
            state.repeatsLeft -= 1;
            // Settle again after seeking back to the start.
            state.armed = false;
            state.expected = null;
            state.waited = 0;
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

  // True while a sentence loop is actively driving playback. Callers use this to
  // avoid fighting the loop (e.g. a transcript-follow that only runs on free
  // playback). Reads a ref so it's always current without re-rendering.
  const isLooping = useCallback(() => stateRef.current !== null, []);

  return { play, stop, playing, isLooping };
}
