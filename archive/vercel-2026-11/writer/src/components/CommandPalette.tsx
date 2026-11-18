"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  articles: { id: string; title: string; status: "DRAFT" | "PUBLISHED" }[];
  resources: { id: string; title: string; articleId: string | null }[];
};

type Item = { label: string; sub?: string; go: () => void };

const STATIC_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Posts", href: "/posts" },
  { label: "New post", href: "/posts/new" },
  { label: "Categories", href: "/categories" },
  { label: "Resources", href: "/resources" },
  { label: "Templates", href: "/templates" },
  { label: "Mind Map", href: "/mindmap" },
  { label: "Settings", href: "/settings" },
];

export type CommandPaletteHandle = { open: () => void };

// Global Cmd/Ctrl+K palette: static page navigation plus live search across
// articles (drafts included) and resources, debounced against /api/search.
export const CommandPalette = forwardRef<CommandPaletteHandle>(function CommandPalette(_props, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults(null);
    setActiveIndex(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setResults);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const filteredStatic = STATIC_ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  const items: Item[] = [
    ...filteredStatic.map((i) => ({ label: i.label, go: () => router.push(i.href) })),
    ...(results?.articles ?? []).map((a) => ({
      label: a.title || "Untitled",
      sub: a.status === "DRAFT" ? "Draft" : "Published",
      go: () => router.push(`/posts/${a.id}`),
    })),
    ...(results?.resources ?? []).map((r) => ({
      label: r.title,
      sub: "Resource",
      go: () => router.push(r.articleId ? `/posts/${r.articleId}` : "/resources"),
    })),
  ];

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) {
        item.go();
        setOpen(false);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onInputKeyDown}
          placeholder="Search posts, resources, or jump to a page..."
          className="w-full border-b border-neutral-200 bg-transparent px-4 py-3 text-sm outline-none dark:border-neutral-800"
        />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-neutral-400">No matches.</p>}
          {items.map((item, i) => (
            <button
              key={`${item.label}-${i}`}
              type="button"
              onClick={() => {
                item.go();
                setOpen(false);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                i === activeIndex ? "bg-neutral-100 dark:bg-neutral-800" : ""
              }`}
            >
              <span className="truncate text-neutral-900 dark:text-neutral-50">{item.label}</span>
              {item.sub && <span className="shrink-0 text-xs text-neutral-400">{item.sub}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
