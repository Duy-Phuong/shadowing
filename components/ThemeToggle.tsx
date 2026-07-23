"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark((v) => !v)}
      suppressHydrationWarning
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800 ${
        collapsed ? "justify-center" : "w-full"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 shrink-0"
        aria-hidden="true"
        suppressHydrationWarning
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
      {!collapsed && (
        <span suppressHydrationWarning>{isDark ? "Light mode" : "Dark mode"}</span>
      )}
    </button>
  );
}
