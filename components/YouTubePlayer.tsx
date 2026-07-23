"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export interface PlayerHandle {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
}

interface Props {
  videoId: string;
  onReady?: () => void;
  /** Fired when playback starts/stops, including native clicks on the video. */
  onPlayingChange?: (playing: boolean) => void;
}

/** YT.PlayerState.PLAYING */
const STATE_PLAYING = 1;

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
  { videoId, onReady, onPlayingChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  useImperativeHandle(
    ref,
    () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekTo: (s: number) => playerRef.current?.seekTo(s, true),
      setPlaybackRate: (r: number) => playerRef.current?.setPlaybackRate(r),
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    loadIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => onReadyRef.current?.(),
          onStateChange: (event) =>
            onPlayingChangeRef.current?.(event.data === STATE_PLAYING),
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
});

export default YouTubePlayer;
