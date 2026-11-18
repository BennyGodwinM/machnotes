"use client";

import { useEffect, useRef, useState } from "react";

type Resource = {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  fileName: string | null;
  fileSize: number | null;
};

export function ResourcePanel({
  articleId,
  categoryId,
}: {
  articleId?: string;
  categoryId?: string;
}) {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const query = articleId ? `articleId=${articleId}` : categoryId ? `categoryId=${categoryId}` : "unfiled=1";

  async function load() {
    const res = await fetch(`/api/resources?${query}`);
    const data = await res.json();
    setResources(data.resources ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, categoryId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, notes, articleId, categoryId }),
      });
      if (!res.ok) throw new Error("Failed to add resource");
      const { resource } = await res.json();

      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const fileRes = await fetch(`/api/resources/${resource.id}/file`, { method: "POST", body: form });
        if (!fileRes.ok) {
          const data = await fileRes.json().catch(() => null);
          throw new Error(data?.error ?? "Resource saved, but the file failed to upload");
        }
      }

      setTitle("");
      setUrl("");
      setNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/resources/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeFile(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/resources/${id}/file`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        Resources
        <span className="ml-2 font-normal text-neutral-400">(private — never published)</span>
      </h3>

      {resources === null ? (
        <p className="text-sm text-neutral-400">Loading...</p>
      ) : resources.length === 0 ? (
        <p className="text-sm text-neutral-400">No resources yet.</p>
      ) : (
        <ul className="space-y-3">
          {resources.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 text-sm">
              <div className="min-w-0">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-600 underline decoration-blue-600/30 hover:decoration-blue-600 dark:text-blue-400"
                  >
                    {r.title}
                  </a>
                ) : (
                  <span className="font-medium text-neutral-900 dark:text-neutral-50">{r.title}</span>
                )}
                {r.notes && <p className="text-neutral-500 dark:text-neutral-400">{r.notes}</p>}
                {r.fileName && (
                  <p className="mt-1 flex items-center gap-2 text-xs">
                    <a
                      href={`/api/resources/${r.id}/file`}
                      className="text-neutral-600 underline decoration-neutral-400 dark:text-neutral-300"
                    >
                      📎 {r.fileName}
                      {r.fileSize ? ` (${Math.round(r.fileSize / 1024)} KB)` : ""}
                    </a>
                    <button
                      onClick={() => removeFile(r.id)}
                      disabled={busy}
                      className="text-neutral-400 hover:text-red-600 disabled:opacity-60"
                    >
                      remove file
                    </button>
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(r.id)}
                disabled={busy}
                className="shrink-0 rounded-md px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <input
          type="text"
          placeholder="URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-neutral-300 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <input
          ref={fileInputRef}
          type="file"
          className="w-full text-xs text-neutral-500 file:mr-2 file:rounded-md file:border file:border-neutral-300 file:bg-transparent file:px-2 file:py-1 file:text-xs file:text-neutral-700 dark:text-neutral-400 dark:file:border-neutral-700 dark:file:text-neutral-200"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Add resource
        </button>
      </form>
    </div>
  );
}
