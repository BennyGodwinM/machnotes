"use client";

import { useEffect, useRef, useState } from "react";

const HEADING_SELECTOR = "h1, h2, h3";

export function LivePreviewPane({
  typstSource,
  articleId,
  categoryId,
  onHeadingClick,
}: {
  typstSource: string;
  articleId?: string;
  categoryId?: string;
  // Called with the ordinal index (0-based) of the clicked heading among
  // all h1/h2/h3 in the preview — Typst emits exactly one heading tag per
  // `=` line in the same order, so that index lines up with parseHeadings().
  onHeadingClick?: (index: number) => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await fetch("/api/articles/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ typstSource, articleId, categoryId }),
        });
        if (requestId !== requestIdRef.current) return; // stale response
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Preview failed to compile.");
          return;
        }
        setError(null);
        setHtml(data.html);
      } catch {
        if (requestId === requestIdRef.current) setError("Preview failed to compile.");
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [typstSource, articleId, categoryId]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onHeadingClick || !articleRef.current) return;
    const heading = (e.target as HTMLElement).closest(HEADING_SELECTOR);
    if (!heading) return;
    const all = Array.from(articleRef.current.querySelectorAll(HEADING_SELECTOR));
    const index = all.indexOf(heading);
    if (index !== -1) onHeadingClick(index);
  }

  return (
    <div className="h-full overflow-y-auto bg-neutral-50 px-5 py-4 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
        <span>Preview</span>
        {loading && <span>Compiling...</span>}
      </div>
      {error ? (
        <pre className="whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">{error}</pre>
      ) : html ? (
        <div
          ref={articleRef}
          className={`typst-article${onHeadingClick ? " typst-article-clickable-headings" : ""}`}
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-neutral-400">Start writing to see a preview.</p>
      )}
    </div>
  );
}
