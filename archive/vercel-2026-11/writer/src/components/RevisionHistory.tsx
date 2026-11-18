"use client";

import { useEffect, useState } from "react";

type Revision = { id: string; title: string; createdAt: string; wordCount: number };
type RestoredArticle = { title: string; typstSource: string; excerpt: string | null };

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function RevisionHistory({
  articleId,
  onRestore,
}: {
  articleId: string;
  onRestore: (article: RestoredArticle) => void;
}) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || revisions !== null) return;
    fetch(`/api/articles/${articleId}/revisions`)
      .then((r) => r.json())
      .then((data) => setRevisions(data.revisions ?? []));
  }, [open, revisions, articleId]);

  async function restore(revisionId: string) {
    if (!window.confirm("Restore this version? Your current content will be saved as a new revision first.")) return;
    setRestoringId(revisionId);
    try {
      const res = await fetch(`/api/articles/${articleId}/revisions/${revisionId}/restore`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { article } = await res.json();
      onRestore(article);
      setRevisions(null); // force a refetch next time it's opened, now that a new revision exists
      setOpen(false);
    } catch {
      window.alert("Failed to restore that version.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        History
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-80 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {revisions === null ? (
            <p className="px-2 py-3 text-sm text-neutral-400">Loading…</p>
          ) : revisions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-neutral-400">No earlier versions saved yet.</p>
          ) : (
            <ul className="max-h-80 space-y-0.5 overflow-y-auto">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-900 dark:text-neutral-50">{r.title || "Untitled"}</p>
                    <p className="text-xs text-neutral-400">
                      {timeAgo(r.createdAt)} &middot; {r.wordCount} words
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={restoringId !== null}
                    onClick={() => restore(r.id)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    {restoringId === r.id ? "Restoring…" : "Restore"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
