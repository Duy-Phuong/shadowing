"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface PlayerHandle {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
}

interface Props {
  videoId: string;
  onReady?: () => void;
  /** Fired when playback starts/stops, including native clicks on the video. */
  onPlayingChange?: (playing: boolean) => void;
  /** Fired when the video plays through to the end. */
  onEnded?: () => void;
  /** Fired when the video can't be played (removed, private, embedding off). */
  onError?: () => void;
  autoplay?: boolean;
}

/** YT.PlayerState.PLAYING */
const STATE_PLAYING = 1;
/** YT.PlayerState.ENDED */
const STATE_ENDED = 0;
/** States where the player is actually showing a frame/poster (not black). */
const STATE_PAUSED = 2;
const STATE_CUED = 5;
/** Hide the spinner this long after onReady even if no content state arrives. */
const READY_FALLBACK_MS = 2500;

let apiPromise: Promise<void> | null = null;

/** Loads the YouTube IFrame API script once and resolves when ready. */
function loadIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
  return apiPromise;
}

const YouTubePlayer = forwardRef<PlayerHandle, Props>(function YouTubePlayer(
  { videoId, onReady, onPlayingChange, onEnded, onError, autoplay },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  // The YT.Player object exists before its API methods are attached; they only
  // become callable once onReady fires.
  const readyRef = useRef(false);
  // "loaded" means the player is showing a frame (poster/playback), not the
  // black gap that exists between the API being ready and the first frame.
  const [loaded, setLoaded] = useState(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (readyRef.current) playerRef.current?.playVideo();
      },
      pause: () => {
        if (readyRef.current) playerRef.current?.pauseVideo();
      },
      seekTo: (s: number) => {
        if (readyRef.current) playerRef.current?.seekTo(s, true);
      },
      setPlaybackRate: (r: number) => {
        if (readyRef.current) playerRef.current?.setPlaybackRate(r);
      },
      getCurrentTime: () =>
        readyRef.current ? (playerRef.current?.getCurrentTime() ?? 0) : 0,
      getDuration: () =>
        readyRef.current ? (playerRef.current?.getDuration() ?? 0) : 0,
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    setLoaded(false);
    const clearFallback = () => {
      if (fallbackRef.current !== null) {
        clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }
    };
    loadIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          ...(autoplay ? { autoplay: 1 } : {}),
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            onReadyRef.current?.();
            // The poster/first frame lands slightly after onReady; keep the
            // spinner until a content state arrives, with a safety timeout.
            clearFallback();
            fallbackRef.current = setTimeout(
              () => setLoaded(true),
              READY_FALLBACK_MS,
            );
          },
          onStateChange: (event) => {
            const d = event.data;
            if (d === STATE_PLAYING || d === STATE_PAUSED || d === STATE_CUED) {
              clearFallback();
              setLoaded(true);
            }
            onPlayingChangeRef.current?.(d === STATE_PLAYING);
            if (d === STATE_ENDED) onEndedRef.current?.();
          },
          onError: () => {
            clearFallback();
            setLoaded(true); // stop spinning; let YouTube show its own notice
            onErrorRef.current?.();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      clearFallback();
      // destroy() is also only attached once the player is ready.
      if (readyRef.current) playerRef.current?.destroy();
      readyRef.current = false;
      playerRef.current = null;
    };
  }, [videoId, autoplay]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-900">
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900 text-neutral-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-8 w-8 animate-spin"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Loading video…</span>
        </div>
      )}
    </div>
  );
});

export default YouTubePlayer;
