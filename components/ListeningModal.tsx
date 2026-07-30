"use client";

import { useEffect, useRef, useState } from "react";
import YouTubePlayer, { type PlayerHandle } from "./YouTubePlayer";
import TransportControls from "./TransportControls";
import SaveSentenceButton from "./SaveSentenceButton";
import { fetchTranscript } from "@/lib/loadTranscript";
import type { CatalogVideo } from "@/lib/practiceVideos";
import { sentenceKey } from "@/lib/sentences";
import type { Sentence, Transcript } from "@/lib/types";

/** How many unplayable videos to skip past before giving up. */
const MAX_SKIPS = 5;
/** How often to re-check the player position for the live highlight. */
const TICK_MS = 250;

interface Props {
  /** Videos to listen through; a random one starts, then it walks the list. */
  videos: CatalogVideo[];
  savedSentenceIds: string[];
  onToggleSentence: (entry: {
    id: string;
    videoId: string;
    title: string;
    text: string;
    start: number;
    sentenceId: number;
  }) => void;
  onClose: () => void;
}

/** The sentence being spoken at `time`, or null before the first one starts. */
function sentenceAt(sentences: Sentence[], time: number): number | null {
  let current: number | null = null;
  for (const s of sentences) {
    if (s.start > time) break;
    current = s.id;
  }
  return current;
}

export default function ListeningModal({
  videos,
  savedSentenceIds,
  onToggleSentence,
  onClose,
}: Props) {
  // The list arrives shuffled, so a random start point gives a random order.
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * videos.length),
  );
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const playerRef = useRef<PlayerHandle>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const skips = useRef(0);
  /** Video the in-flight transcript request belongs to. */
  const pendingFor = useRef<string | null>(null);

  const video = videos[index];
  // The highlighted line is what "save" applies to, so it needs a transcript.
  const activeSentence =
    activeId === null
      ? null
      : (transcript?.sentences.find((s) => s.id === activeId) ?? null);
  const activeKey = activeSentence
    ? sentenceKey(video.videoId, activeSentence.id)
    : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Follow the player position so the transcript highlights along with speech.
  useEffect(() => {
    if (!showTranscript || !transcript) return;
    const sentences = transcript.sentences;
    const id = window.setInterval(() => {
      setActiveId(sentenceAt(sentences, playerRef.current?.getCurrentTime() ?? 0));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [showTranscript, transcript]);

  // Keep the highlighted line in view. Not smooth-scrolled: the highlight moves
  // on its own as the video plays, and an animation can be left mid-flight.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  // Skipping ahead quickly leaves earlier requests in flight; ignore any that
  // resolve after we've moved on, so the panel always matches the player.
  const loadTranscript = async (videoId: string) => {
    pendingFor.current = videoId;
    setLoadingTranscript(true);
    setTranscriptError(null);
    try {
      const loaded = await fetchTranscript(
        `https://www.youtube.com/watch?v=${videoId}`,
      );
      if (pendingFor.current === videoId) setTranscript(loaded);
    } catch {
      if (pendingFor.current === videoId) {
        setTranscriptError("No transcript available for this video.");
      }
    } finally {
      if (pendingFor.current === videoId) setLoadingTranscript(false);
    }
  };

  const toggleTranscript = () => {
    const next = !showTranscript;
    setShowTranscript(next);
    if (next && !transcript && !loadingTranscript) {
      void loadTranscript(video.videoId);
    }
  };

  const go = (next: number) => {
    setIndex(next);
    setTranscript(null);
    setTranscriptError(null);
    setActiveId(null);
    pendingFor.current = null;
    if (showTranscript) void loadTranscript(videos[next].videoId);
  };

  const goNext = () => go((index + 1) % videos.length);
  const goPrev = () => go((index - 1 + videos.length) % videos.length);

  const togglePlay = () => {
    if (playing) playerRef.current?.pause();
    else playerRef.current?.play();
  };

  // Videos that are private, removed or not embeddable never end, so skip them
  // instead of stalling — but stop after a few so we don't cycle the whole list.
  const onUnplayable = () => {
    if (skips.current >= MAX_SKIPS) return;
    skips.current += 1;
    goNext();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Practice listening</h2>
            <p className="truncate text-sm text-neutral-500">
              {video.channel} · {video.title}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-neutral-400 transition hover:text-neutral-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <YouTubePlayer
          key={video.videoId}
          videoId={video.videoId}
          ref={playerRef}
          autoplay
          onEnded={goNext}
          onError={onUnplayable}
          onPlayingChange={(isPlaying) => {
            setPlaying(isPlaying);
            if (isPlaying) skips.current = 0;
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <TransportControls
            playing={playing}
            canPrev={videos.length > 1}
            canNext={videos.length > 1}
            position={index}
            total={videos.length}
            itemLabel="video"
            onPrev={goPrev}
            onNext={goNext}
            onPlayPause={togglePlay}
          />
          <div className="flex items-center gap-2">
            <SaveSentenceButton
              saved={activeKey !== null && savedSentenceIds.includes(activeKey)}
              disabled={activeSentence === null}
              onToggle={() => {
                if (!activeSentence || !activeKey) return;
                onToggleSentence({
                  id: activeKey,
                  videoId: video.videoId,
                  title: video.title,
                  text: activeSentence.text,
                  start: activeSentence.start,
                  sentenceId: activeSentence.id,
                });
              }}
            />
            <button
              onClick={toggleTranscript}
              aria-pressed={showTranscript}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>
          </div>
        </div>

        {showTranscript && (
          <div className="h-56 shrink-0 overflow-y-auto rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
            {loadingTranscript ? (
              <p className="text-neutral-400">Loading transcript…</p>
            ) : transcriptError ? (
              <p className="text-neutral-400">{transcriptError}</p>
            ) : (
              <ol className="space-y-1">
                {transcript?.sentences.map((s) => {
                  const active = s.id === activeId;
                  return (
                    <li
                      key={s.id}
                      ref={active ? activeRef : undefined}
                      className={`flex gap-3 rounded-md px-2 py-1 transition ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    >
                      <span
                        className={`shrink-0 tabular-nums ${
                          active ? "opacity-70" : "text-neutral-400"
                        }`}
                      >
                        {s.id + 1}
                      </span>
                      <span>{s.text}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
