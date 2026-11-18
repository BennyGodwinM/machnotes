"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Matches ArticleForm's sessionStorage key — read once on mount there, then
// cleared, so a page refresh never re-triggers the prefill.
export const TEMPLATE_HANDOFF_KEY = "machnotes-template-handoff";

export function TemplateCard({
  title,
  description,
  source,
  startPostHref,
}: {
  title: string;
  description: string;
  source: string;
  startPostHref?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.typ`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function startPost() {
    if (!startPostHref) return;
    sessionStorage.setItem(TEMPLATE_HANDOFF_KEY, source);
    router.push(startPostHref);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-700">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700 bg-[#1e1e1e] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-50">{title}</h2>
          <p className="mt-0.5 text-xs text-neutral-400">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {startPostHref && (
            <button
              type="button"
              onClick={startPost}
              className="rounded-md bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-200"
            >
              Start new post from this
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="rounded-md border border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={download}
            className="rounded-md border border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10"
          >
            Download .typ
          </button>
        </div>
      </div>
      <pre className="max-h-[420px] overflow-auto bg-[#1e1e1e] px-4 py-3 text-xs leading-relaxed text-neutral-300">
        <code>{source}</code>
      </pre>
    </div>
  );
}
