"use client";

import type { ReactNode } from "react";
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

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 transition-[width] dark:border-neutral-800 dark:bg-neutral-950 ${
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

      <nav className="flex flex-col gap-1 px-2">
        {items.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              title={item.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {item.icon}
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && item.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-white/20 dark:bg-black/20"
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

      <div className="mt-auto p-2">
        <ThemeToggle collapsed={collapsed} />
      </div>
    </aside>
  );
}
