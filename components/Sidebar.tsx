"use client";

import { useState, type ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";

export type View = "home" | "explore" | "practice" | "library" | "wordlist";

interface Props {
  collapsed: boolean;
  view: View;
  bookmarkCount: number;
  wordlistCount: number;
  onToggleCollapse: () => void;
  onNavigate: (view: View) => void;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function Sidebar({
  collapsed,
  view,
  bookmarkCount,
  wordlistCount,
  onToggleCollapse,
  onNavigate,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: {
    key: View;
    label: string;
    icon: ReactNode;
    badge?: number;
  }[] = [
    {
      key: "home",
      label: "Home",
      icon: (
        <Icon>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </Icon>
      ),
    },
    {
      key: "explore",
      label: "Practice",
      icon: (
        <Icon>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </Icon>
      ),
    },
    {
      key: "library",
      label: "My Videos",
      badge: bookmarkCount,
      icon: (
        <Icon>
          <path d="M12 17.3 6.2 20l1.1-6.3-4.6-4.5 6.4-.9L12 2.5l2.9 5.8 6.4.9-4.6 4.5L17.8 20z" />
        </Icon>
      ),
    },
    {
      key: "wordlist",
      label: "My Wordlist",
      badge: wordlistCount,
      icon: (
        <Icon>
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
          <path d="M9 7h6M9 11h6" />
        </Icon>
      ),
    },
  ];

  const renderNav = (compact: boolean) => (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => {
        const active = view === item.key;
        return (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              setMobileOpen(false);
            }}
            title={item.label}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              compact ? "justify-center" : ""
            } ${
              active
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {item.icon}
            {!compact && <span className="flex-1 text-left">{item.label}</span>}
            {!compact && item.badge !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active
                    ? "bg-white/25"
                    : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-neutral-50/90 px-3 backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-950/90">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Icon>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </Icon>
        </button>
        <span className="font-bold tracking-tight">Shadowing</span>
        <ThemeToggle collapsed />
      </header>

      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 transition-[width] md:flex dark:border-neutral-800 dark:bg-neutral-950 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-4">
          {!collapsed && (
            <span className="truncate text-sm font-bold tracking-tight">
              Shadowing
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <Icon>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="9" y1="4" x2="9" y2="20" />
            </Icon>
          </button>
        </div>

        {renderNav(collapsed)}

        <div className="mt-auto p-2">
          <ThemeToggle collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-neutral-200 bg-neutral-50 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between gap-2 px-3 py-4">
              <span className="truncate text-sm font-bold tracking-tight">
                Shadowing
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <Icon>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </Icon>
              </button>
            </div>

            {renderNav(false)}

            <div className="mt-auto p-2">
              <ThemeToggle collapsed={false} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
