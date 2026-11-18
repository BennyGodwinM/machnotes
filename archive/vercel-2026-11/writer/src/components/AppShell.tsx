"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { SignOutButton } from "@/components/SignOutButton";
import { CommandPalette, type CommandPaletteHandle } from "@/components/CommandPalette";
import { PageTransition } from "@/components/PageTransition";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/posts", label: "Posts" },
  { href: "/categories", label: "Categories" },
  { href: "/resources", label: "Resources" },
  { href: "/templates", label: "Templates" },
  { href: "/mindmap", label: "Mind Map" },
  { href: "/settings", label: "Settings" },
];

const COLLAPSE_KEY = "machnotes-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const paletteRef = useRef<CommandPaletteHandle>(null);
  // The article editor (/posts/new, /posts/[id]) needs real width for its
  // side-by-side code/preview split — the 5xl cap that keeps prose-heavy
  // pages (dashboard, settings) readable would otherwise crush it. Every
  // other page keeps the narrower, more readable width.
  const pathname = usePathname();
  const isEditorPage = /^\/posts\/.+/.test(pathname ?? "");

  // Read the persisted preference after mount, not during SSR/first paint:
  // localStorage isn't available on the server, so reading it there (or in
  // a lazy useState initializer, which also runs during SSR) would either
  // crash or mismatch the client's hydration render. Correcting the value
  // right after mount is the standard safe pattern for this.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <aside
          className={`flex shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-150 dark:border-neutral-800 dark:bg-neutral-900 ${
            collapsed ? "w-14" : "w-56"
          }`}
        >
          <div className="flex items-center justify-between px-3 py-5">
            {!collapsed && (
              <span className="truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                MachNotes
              </span>
            )}
            {!collapsed && <ThemeToggle />}
            <button
              type="button"
              onClick={toggle}
              title={collapsed ? "Expand menu" : "Collapse menu"}
              className="ml-auto shrink-0 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              {collapsed ? "»" : "«"}
            </button>
          </div>
          {collapsed && (
            <div className="flex justify-center px-2 pb-1">
              <ThemeToggle />
            </div>
          )}
          <div className="px-2">
            <button
              type="button"
              onClick={() => paletteRef.current?.open()}
              title="Search (Ctrl+K)"
              className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              {collapsed ? "⌘" : <span>Search…</span>}
              {!collapsed && <span className="text-xs">Ctrl K</span>}
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 pt-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className="block truncate rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              >
                {collapsed ? item.label.slice(0, 1) : item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-neutral-200 px-2 py-3 dark:border-neutral-800">
            <SignOutButton />
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className={isEditorPage ? "mx-auto max-w-[1920px] px-6 py-8" : "mx-auto max-w-5xl px-8 py-10"}>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <CommandPalette ref={paletteRef} />
      </div>
    </MotionConfig>
  );
}
