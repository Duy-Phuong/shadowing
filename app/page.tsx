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
import Vocabulary from "@/components/Vocabulary";
import { useSentenceLoop } from "@/hooks/useSentenceLoop";
import { useToast } from "@/components/Toast";
import { fetchTranscript } from "@/lib/loadTranscript";
import type { Bookmark } from "@/lib/bookmarks";
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
  const [busy, setBusy] = useState(false);

  const playerRef = useRef<PlayerHandle>(null);
  const loop = useSentenceLoop(() => playerRef.current);
  const toast = useToast();

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

  const showTranscript = (t: Transcript) => {
    loop.stop();
    setTranscript(t);
    setSelectedId(0);
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

  const select = (id: number) => {
    if (!transcript || id < 0 || id >= transcript.sentences.length) return;
    loop.stop();
    setSelectedId(id);
  };

  const changeMode = (next: PracticeMode) => {
    loop.stop();
    setMode(next);
  };

  const playCurrent = (id = selectedId) => {
    if (!transcript) return;
    const onComplete = () => {
      if (!autoNext) return;
      const next = id + 1;
      if (next >= transcript.sentences.length) return;
      setSelectedId(next);
      playCurrent(next);
    };
    loop.play(
      transcript.sentences[id],
      mode === "shadowing" ? repeat : 1,
      speed,
      onComplete,
    );
  };

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
            <ModeTabs mode={mode} onChange={changeMode} />
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-4">
              <YouTubePlayer
                videoId={transcript.videoId}
                ref={playerRef}
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
                  />
                ) : (
                  <DictationPanel key={sentence.id} sentence={sentence} />
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
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onNavigate={setView}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">{renderMain()}</main>
    </div>
  );
}
