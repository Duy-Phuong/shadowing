export {};

declare global {
  interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    setPlaybackRate(rate: number): void;
    getCurrentTime(): number;
    destroy(): void;
  }

  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
