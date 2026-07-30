"use client";

import { useEffect, useRef, useState } from "react";
import UrlForm from "@/components/UrlForm";
import YouTubeSearch from "@/components/YouTubeSearch";
import YouTubePlayer, { type PlayerHandle } from "@/components/YouTubePlayer";
import ModeTabs from "@/components/ModeTabs";
import TranscriptList from "@/components/TranscriptList";
import PlaybackControls from "@/components/PlaybackControls";
import TransportControls from "@/components/TransportControls";
import ShadowingPanel from "@/components/ShadowingPanel";
import DictationPanel from "@/components/DictationPanel";
import Sidebar, { type View } from "@/components/Sidebar";
import MyVideos from "@/components/MyVideos";
import Practice from "@/components/Practice";
import Wordlist from "@/components/Wordlist";
import SavedSentences from "@/components/SavedSentences";
import Vocabulary from "@/components/Vocabulary";
import { useSentenceLoop } from "@/hooks/useSentenceLoop";
import { useToast } from "@/components/Toast";
import { fetchTranscript } from "@/lib/loadTranscript";
import type { Bookmark } from "@/lib/bookmarks";
import {
  findSentenceIndex,
  sentenceKey,
  type SavedSentence,
} from "@/lib/sentences";
import type { WordEntry } from "@/lib/wordlist";
import type { PracticeMode, Transcript } from "@/lib/types";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 17.3 6.2 20l1.1-6.3-4.6-4.5 6.4-.9L12 2.5l2.9 5.8 6.4.9-4.6 4.5L17.8 20z" />
    </svg>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [mode, setMode] = useState<PracticeMode>("shadowing");
  const [selectedId, setSelectedId] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [repeat, setRepeat] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [autoNext, setAutoNext] = useState(false);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [wordlist, setWordlist] = useState<WordEntry[]>([]);
  const [wordlistLoading, setWordlistLoading] = useState(true);
  const [sentences, setSentences] = useState<SavedSentence[]>([]);
  const [sentencesLoading, setSentencesLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const playerRef = useRef<PlayerHandle>(null);
  const loop = useSentenceLoop(() => playerRef.current);
  const toast = useToast();
  const skipPersist = useRef(true);
  // Set when opening a saved sentence: once the player is ready we jump to it.
  const pendingSeekRef = useRef<{
    videoId: string;
    start: number;
    sentenceId: number;
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Bookmark[]) => setBookmarks(data))
      .catch(() => {})
      .finally(() => setBookmarksLoading(false));
    fetch("/api/wordlist")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: WordEntry[]) => setWordlist(data))
      .catch(() => {})
      .finally(() => setWordlistLoading(false));
    fetch("/api/sentences")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SavedSentence[]) => setSentences(data))
      .catch(() => {})
      .finally(() => setSentencesLoading(false));
  }, []);

  const savedWords = new Set(wordlist.map((w) => w.word.toLowerCase()));

  const toggleWord = async (entry: WordEntry) => {
    const exists = savedWords.has(entry.word.toLowerCase());
    const res = exists
      ? await fetch(`/api/wordlist?word=${encodeURIComponent(entry.word)}`, {
          method: "DELETE",
        })
      : await fetch("/api/wordlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
    if (res.ok) {
      setWordlist((await res.json()) as WordEntry[]);
      toast(
        exists ? "Removed from wordlist" : "Saved to wordlist",
        exists ? "info" : "success",
      );
    }
  };

  const removeWord = async (word: string) => {
    const res = await fetch(`/api/wordlist?word=${encodeURIComponent(word)}`, {
      method: "DELETE",
    });
    if (res.ok) setWordlist((await res.json()) as WordEntry[]);
  };

  const setUnit = async (word: string, unit: number | null) => {
    const res = await fetch("/api/wordlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, unit }),
    });
    if (res.ok) setWordlist((await res.json()) as WordEntry[]);
  };

  const toggleSentence = async (entry: SavedSentence) => {
    const exists = sentences.some((s) => s.id === entry.id);
    const res = exists
      ? await fetch(`/api/sentences?id=${encodeURIComponent(entry.id)}`, {
          method: "DELETE",
        })
      : await fetch("/api/sentences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
    if (res.ok) {
      setSentences((await res.json()) as SavedSentence[]);
      toast(
        exists ? "Removed from My Sentences" : "Saved to My Sentences",
        exists ? "info" : "success",
      );
    }
  };

  const removeSentence = async (id: string) => {
    const res = await fetch(`/api/sentences?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) setSentences((await res.json()) as SavedSentence[]);
  };

  const showTranscript = (t: Transcript) => {
    loop.stop();
    setTranscript(t);
    // When opening a saved sentence, start on that sentence rather than the top.
    const target = pendingSeekRef.current;
    if (target && target.videoId === t.videoId) {
      setSelectedId(findSentenceIndex(t.sentences, target));
    } else {
      pendingSeekRef.current = null;
      setSelectedId(0);
    }
    setView("practice");
  };

  const openUrl = async (url: string, fallback: View) => {
    setBusy(true);
    setView("practice");
    try {
      showTranscript(await fetchTranscript(url));
    } catch {
      setView(fallback);
    } finally {
      setBusy(false);
    }
  };

  const openBookmark = (b: Bookmark) => openUrl(b.url, "library");

  const openVideoId = (videoId: string) =>
    openUrl(`https://www.youtube.com/watch?v=${videoId}`, "explore");

  // Open a saved sentence's video and jump to the moment it was spoken. The
  // reloadKey bump forces the player to remount (and re-fire onReady) even when
  // the same video is already loaded.
  const openSavedSentence = (s: SavedSentence) => {
    pendingSeekRef.current = {
      videoId: s.videoId,
      start: s.start,
      sentenceId: s.sentenceId,
      text: s.text,
    };
    setReloadKey((k) => k + 1);
    openVideoId(s.videoId);
  };

  // Once the player is ready after opening a saved sentence, seek + play it.
  const onPlayerReady = () => {
    if (!pendingSeekRef.current) return;
    pendingSeekRef.current = null;
    playCurrentRef.current();
  };

  // Reload just the embedded player (remount) without leaving the page.
  const reloadVideo = () => {
    loop.stop();
    setReloadKey((k) => k + 1);
  };

  // Restore the last view (and reload its video) after a page refresh. This
  // deliberately sets state on mount to rehydrate from localStorage.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let saved: { view?: View; videoId?: string | null } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem("shadowing:lastView") ?? "null");
    } catch {
      saved = null;
    }
    if (!saved) return;
    if (saved.view === "practice" && saved.videoId) {
      openVideoId(saved.videoId);
    } else if (saved.view && saved.view !== "home") {
      setView(saved.view);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist the current view + loaded video so a refresh doesn't reset to home.
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(
        "shadowing:lastView",
        JSON.stringify({ view, videoId: transcript?.videoId ?? null }),
      );
    } catch {
      // ignore storage errors
    }
  }, [view, transcript]);

  const isBookmarked =
    transcript !== null &&
    bookmarks.some((b) => b.videoId === transcript.videoId);

  const toggleBookmarkFor = async (v: {
    videoId: string;
    title: string;
    url: string;
  }) => {
    const exists = bookmarks.some((b) => b.videoId === v.videoId);
    const res = exists
      ? await fetch(`/api/bookmarks?videoId=${v.videoId}`, { method: "DELETE" })
      : await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(v),
        });
    if (res.ok) {
      setBookmarks((await res.json()) as Bookmark[]);
      toast(
        exists ? "Removed from My Videos" : "Saved to My Videos",
        exists ? "info" : "success",
      );
    }
  };

  const toggleBookmark = () => {
    if (!transcript) return;
    toggleBookmarkFor({
      videoId: transcript.videoId,
      title: transcript.title,
      url: `https://www.youtube.com/watch?v=${transcript.videoId}`,
    });
  };

  const currentSentenceKey =
    transcript === null ? null : sentenceKey(transcript.videoId, selectedId);
  const isCurrentSentenceSaved =
    currentSentenceKey !== null &&
    sentences.some((s) => s.id === currentSentenceKey);

  /** Saves/removes the sentence currently selected in the practice view. */
  const toggleCurrentSentence = () => {
    if (!transcript || currentSentenceKey === null) return;
    const s = transcript.sentences[selectedId];
    void toggleSentence({
      id: currentSentenceKey,
      videoId: transcript.videoId,
      title: transcript.title,
      text: s.text,
      start: s.start,
      sentenceId: selectedId,
    });
  };

  const select = (id: number) => {
    if (!transcript || id < 0 || id >= transcript.sentences.length) return;
    loop.stop();
    setSelectedId(id);
  };

  const changeMode = (next: PracticeMode) => {
    loop.stop();
    setMode(next);
  };

  // Auto-next reads these through refs: the completion callback is created when
  // a sentence starts, so a captured value would still be the one from then —
  // toggling auto-next (or the speed) mid-sentence would not take effect.
  const autoNextRef = useRef(autoNext);
  const playCurrentRef = useRef<(id?: number) => void>(() => {});

  const playCurrent = (id = selectedId) => {
    if (!transcript) return;
    const onComplete = () => {
      if (!autoNextRef.current) return;
      const next = id + 1;
      if (next >= transcript.sentences.length) return;
      setSelectedId(next);
      playCurrentRef.current(next);
    };
    loop.play(
      transcript.sentences[id],
      mode === "shadowing" ? repeat : 1,
      speed,
      onComplete,
    );
  };
  // Refreshed after every render, well before the loop's next poll can fire.
  useEffect(() => {
    autoNextRef.current = autoNext;
    playCurrentRef.current = playCurrent;
  });

  const togglePlay = () => {
    if (!transcript) return;
    if (playing) loop.stop();
    else playCurrent();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "practice" || !transcript) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        select(selectedId + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        select(selectedId - 1);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        playCurrent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, transcript, selectedId, mode, speed, repeat, playing]);

  const renderMain = () => {
    if (view === "explore") {
      return (
        <Practice
          onOpen={openVideoId}
          bookmarkedIds={bookmarks.map((b) => b.videoId)}
          onToggleBookmark={toggleBookmarkFor}
          savedSentenceIds={sentences.map((s) => s.id)}
          onToggleSentence={toggleSentence}
        />
      );
    }

    if (view === "wordlist") {
      return (
        <Wordlist
          entries={wordlist}
          loading={wordlistLoading}
          onRemove={removeWord}
          onSetUnit={setUnit}
        />
      );
    }

    if (view === "sentences") {
      return (
        <SavedSentences
          sentences={sentences}
          loading={sentencesLoading}
          onOpen={openSavedSentence}
          onRemove={removeSentence}
        />
      );
    }

    if (view === "vocabulary") {
      return <Vocabulary />;
    }

    if (view === "library") {
      return (
        <MyVideos
          bookmarks={bookmarks}
          loading={bookmarksLoading}
          onOpen={openBookmark}
          onRemove={async (videoId) => {
            const res = await fetch(`/api/bookmarks?videoId=${videoId}`, {
              method: "DELETE",
            });
            if (res.ok) setBookmarks((await res.json()) as Bookmark[]);
          }}
        />
      );
    }

    if (view === "practice") {
      if (busy || !transcript) {
        return <p className="p-8 text-neutral-400">Loading…</p>;
      }
      const sentences = transcript.sentences;
      const sentence = sentences[selectedId];
      return (
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleBookmark}
                aria-label={isBookmarked ? "Remove from My Videos" : "Save to My Videos"}
                title={isBookmarked ? "Saved" : "Save to My Videos"}
                className={`rounded-md p-1.5 transition ${
                  isBookmarked
                    ? "text-amber-500"
                    : "text-neutral-400 hover:text-amber-500"
                }`}
              >
                <StarIcon filled={isBookmarked} />
              </button>
              <h1 className="text-lg font-semibold">
                {transcript.title || "Practice"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={reloadVideo}
                title="Reload the video"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
                </svg>
                Reload
              </button>
              <ModeTabs mode={mode} onChange={changeMode} />
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-4">
              <YouTubePlayer
                key={`${transcript.videoId}-${reloadKey}`}
                videoId={transcript.videoId}
                ref={playerRef}
                onReady={onPlayerReady}
                onPlayingChange={setPlaying}
              />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <TransportControls
                  playing={playing}
                  canPrev={selectedId > 0}
                  canNext={selectedId < sentences.length - 1}
                  position={selectedId}
                  total={sentences.length}
                  onPrev={() => select(selectedId - 1)}
                  onNext={() => select(selectedId + 1)}
                  onPlayPause={togglePlay}
                />
                <PlaybackControls
                  speed={speed}
                  repeat={repeat}
                  onSpeedChange={setSpeed}
                  onRepeatChange={setRepeat}
                />
                <button
                  onClick={() => setAutoNext((v) => !v)}
                  aria-pressed={autoNext}
                  title="Automatically move to the next sentence"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    autoNext
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:hover:text-white"
                  }`}
                >
                  Auto-next {autoNext ? "on" : "off"}
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                Shortcuts: Space play/pause · ← → prev/next · R replay
              </p>
              <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
                {mode === "shadowing" ? (
                  <ShadowingPanel
                    sentence={sentence}
                    savedWords={savedWords}
                    onToggleWord={toggleWord}
                    sentenceSaved={isCurrentSentenceSaved}
                    onToggleSentence={toggleCurrentSentence}
                  />
                ) : (
                  <DictationPanel
                    key={sentence.id}
                    sentence={sentence}
                    sentenceSaved={isCurrentSentenceSaved}
                    onToggleSentence={toggleCurrentSentence}
                  />
                )}
              </div>
            </div>

            <div className="h-[70vh] rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <TranscriptList
                sentences={sentences}
                selectedId={selectedId}
                masked={mode === "dictation"}
                onSelect={select}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <UrlForm onLoaded={showTranscript} />
        <YouTubeSearch onOpen={openVideoId} />
      </>
    );
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        collapsed={collapsed}
        view={view}
        bookmarkCount={bookmarks.length}
        wordlistCount={wordlist.length}
        sentenceCount={sentences.length}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onNavigate={setView}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">{renderMain()}</main>
    </div>
  );
}
