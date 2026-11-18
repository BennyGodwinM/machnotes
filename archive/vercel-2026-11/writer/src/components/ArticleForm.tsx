"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResourcePanel } from "@/components/ResourcePanel";
import { TypstEditor, type TypstEditorHandle } from "@/components/editor/TypstEditor";
import { LivePreviewPane } from "@/components/editor/LivePreviewPane";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorOutline } from "@/components/editor/EditorOutline";
import { parseHeadings } from "@/lib/typst/outline";
import { RevisionHistory } from "@/components/RevisionHistory";
import { TEMPLATE_HANDOFF_KEY } from "@/components/TemplateCard";

type CitableResource = { id: string; title: string; url: string | null };

type CategoryOption = { id: string; label: string; depth: number };

type ArticleFormProps = {
  categories: CategoryOption[];
  initial?: {
    id: string;
    title: string;
    typstSource: string;
    excerpt: string | null;
    categoryId: string;
    status: "DRAFT" | "PUBLISHED";
    slug: string;
  };
};

export function ArticleForm({ categories, initial }: ArticleFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [typstSource, setTypstSource] = useState(initial?.typstSource ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<TypstEditorHandle>(null);
  const [citableResources, setCitableResources] = useState<CitableResource[]>([]);
  const [currentLine, setCurrentLine] = useState<number | undefined>(undefined);
  // Outline starts collapsed, like typst.app's own icon-only side rail —
  // the editor/preview split is the main event, not a permanently-visible
  // text list eating into its width.
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  // Pre-fill from the Templates page's "Start new post from this" handoff —
  // only on a genuinely new, empty post, and only once (cleared right after
  // reading) so a later refresh doesn't silently overwrite real drafting.
  useEffect(() => {
    if (initial) return;
    const handoff = sessionStorage.getItem(TEMPLATE_HANDOFF_KEY);
    if (!handoff) return;
    sessionStorage.removeItem(TEMPLATE_HANDOFF_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTypstSource(handoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function jumpToHeadingIndex(index: number) {
    const heading = parseHeadings(typstSource)[index];
    if (heading) editorRef.current?.jumpToLine(heading.line);
  }

  useEffect(() => {
    if (!categoryId) return;
    const params = new URLSearchParams({ categoryId });
    fetch(`/api/resources?${params}`)
      .then((r) => r.json())
      .then((data) => setCitableResources(data.resources ?? []));
  }, [categoryId]);

  useEffect(() => {
    if (!initial) return;
    fetch(`/api/resources?articleId=${initial.id}`)
      .then((r) => r.json())
      .then((data: { resources: CitableResource[] }) =>
        setCitableResources((prev) => {
          const byId = new Map(prev.map((r) => [r.id, r]));
          for (const r of data.resources ?? []) byId.set(r.id, r);
          return Array.from(byId.values());
        })
      );
  }, [initial]);

  function insertCitation(resourceId: string) {
    const token = `@@CITE:${resourceId}@@`;
    if (editorRef.current) {
      editorRef.current.insertAtCursor(token);
    } else {
      setTypstSource((prev) => prev + token);
    }
  }

  async function saveDraft() {
    setBusy("save");
    setError(null);
    try {
      if (initial) {
        const res = await fetch(`/api/articles/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, categoryId, excerpt, typstSource }),
        });
        if (!res.ok) throw new Error("Failed to save");
        router.refresh();
      } else {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, categoryId, excerpt, typstSource }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const { article } = await res.json();
        router.push(`/posts/${article.id}`);
      }
    } catch {
      setError("Something went wrong saving this post.");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!initial) return;
    setBusy("publish");
    setError(null);
    try {
      await fetch(`/api/articles/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, categoryId, excerpt, typstSource }),
      });
      const res = await fetch(`/api/articles/${initial.id}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to publish");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong publishing this post.");
    } finally {
      setBusy(null);
    }
  }

  async function unpublish() {
    if (!initial) return;
    setBusy("unpublish");
    setError(null);
    try {
      const res = await fetch(`/api/articles/${initial.id}/unpublish`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to unpublish");
      router.refresh();
    } catch {
      setError("Something went wrong unpublishing this post.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!initial) return;
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/articles/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/posts");
    } catch {
      setError("Something went wrong deleting this post.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-none bg-transparent text-2xl font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50"
        />
        {initial && (
          <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
            /{initial.slug}
          </span>
        )}
        {initial && (
          <RevisionHistory
            articleId={initial.id}
            onRestore={(article) => {
              setTitle(article.title);
              setTypstSource(article.typstSource);
              setExcerpt(article.excerpt ?? "");
            }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-neutral-600 dark:text-neutral-300">
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="ml-2 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {"  ".repeat(c.depth)}
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        placeholder="One-line excerpt shown in listings"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Typst source</span>
        {citableResources.length > 0 && (
          <label className="text-xs text-neutral-500 dark:text-neutral-400">
            Cite a resource
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) insertCitation(e.target.value);
                e.target.value = "";
              }}
              className="ml-2 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs outline-none focus:border-neutral-500 dark:border-neutral-700"
            >
              <option value="">Insert citation...</option>
              {citableResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 flex overflow-hidden border-neutral-700"
            : "flex overflow-hidden rounded-lg border border-neutral-700"
        }
      >
        {/* Collapsible icon rail, like typst.app's own left sidebar — the
            outline is a secondary tool, not a permanent fixture. */}
        <div className={`flex shrink-0 flex-col bg-[#1e1e1e] ${outlineOpen ? "w-52" : "w-10"}`}>
          <button
            type="button"
            onClick={() => setOutlineOpen((v) => !v)}
            title={outlineOpen ? "Hide outline" : "Show outline"}
            className="flex h-10 items-center justify-center text-neutral-400 hover:text-neutral-100"
          >
            ☰
          </button>
          {outlineOpen && (
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-2 py-2">
              <EditorOutline
                typstSource={typstSource}
                currentLine={currentLine}
                onJump={(line) => editorRef.current?.jumpToLine(line)}
              />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col border-l border-neutral-700">
          <EditorToolbar
            handleRef={editorRef}
            articleId={initial?.id}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((v) => !v)}
          />
          <div className={isFullscreen ? "flex min-h-0 flex-1" : "flex"} style={isFullscreen ? undefined : { height: 720 }}>
            <div className="w-1/2 border-r border-neutral-700">
              <TypstEditor
                ref={editorRef}
                value={typstSource}
                onChange={setTypstSource}
                onCursorLineChange={setCurrentLine}
              />
            </div>
            <div className="w-1/2">
              <LivePreviewPane
                typstSource={typstSource}
                articleId={initial?.id}
                categoryId={categoryId}
                onHeadingClick={jumpToHeadingIndex}
              />
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        {typstSource.trim() ? typstSource.trim().split(/\s+/).length : 0} words
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={saveDraft}
          disabled={busy !== null}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {busy === "save" ? "Saving..." : "Save draft"}
        </button>

        {initial?.status === "PUBLISHED" ? (
          <button
            onClick={unpublish}
            disabled={busy !== null}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {busy === "unpublish" ? "Unpublishing..." : "Unpublish"}
          </button>
        ) : (
          <button
            onClick={publish}
            disabled={busy !== null || !initial}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
            title={!initial ? "Save the post first" : undefined}
          >
            {busy === "publish" ? "Publishing..." : "Publish"}
          </button>
        )}

        {initial && (
          <button
            onClick={remove}
            disabled={busy !== null}
            className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {busy === "delete" ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      {initial && <ResourcePanel articleId={initial.id} />}
    </div>
  );
}
