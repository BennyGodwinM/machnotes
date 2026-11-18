"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

type Article = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  category: { id: string; name: string };
};

export function PostsList({
  articles,
  categories,
}: {
  articles: Article[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === articles.length ? new Set() : new Set(articles.map((a) => a.id))));
  }

  async function runBulk(action: "publish" | "unpublish" | "delete", confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/articles/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Bulk action failed");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function runMove(categoryId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/articles/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "move", categoryId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Move failed");
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="font-medium text-neutral-700 dark:text-neutral-200">{selected.size} selected</span>
          <button
            disabled={busy}
            onClick={() => runBulk("publish")}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Publish
          </button>
          <button
            disabled={busy}
            onClick={() => runBulk("unpublish")}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Unpublish
          </button>
          <select
            disabled={busy}
            value=""
            onChange={(e) => {
              if (e.target.value) runMove(e.target.value);
              e.target.value = "";
            }}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs outline-none disabled:opacity-60 dark:border-neutral-700"
          >
            <option value="">Move to...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            onClick={() => runBulk("delete", `Delete ${selected.size} post(s)? This can't be undone.`)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
          <button
            disabled={busy}
            onClick={() => setSelected(new Set())}
            className="ml-auto rounded-md px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Clear
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {articles.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500 dark:text-neutral-400">No posts match these filters.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-neutral-400">
              <input
                type="checkbox"
                checked={selected.size === articles.length}
                onChange={toggleAll}
                aria-label="Select all"
              />
              <span>Select all</span>
            </div>
            {articles.map((article, i) => (
              <div
                key={article.id}
                className="animate-fade-in-up flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(article.id)}
                  onChange={() => toggle(article.id)}
                  aria-label={`Select ${article.title || "Untitled"}`}
                />
                <Link href={`/posts/${article.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-50">
                      {article.title || "Untitled"}
                    </p>
                    <p className="truncate text-neutral-500 dark:text-neutral-400">
                      {article.category.name} &middot; updated {new Date(article.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={article.status} />
                </Link>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
