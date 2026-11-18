"use client";

import { useMemo } from "react";
import { parseHeadings } from "@/lib/typst/outline";

export function EditorOutline({
  typstSource,
  currentLine,
  onJump,
}: {
  typstSource: string;
  // 1-based cursor line in the editor; the heading the cursor is currently
  // "inside" (the last heading at or before this line) is bolded.
  currentLine?: number;
  onJump: (line: number) => void;
}) {
  const headings = useMemo(() => parseHeadings(typstSource), [typstSource]);

  const activeLine = useMemo(() => {
    if (currentLine === undefined) return undefined;
    let active: number | undefined;
    for (const h of headings) {
      if (h.line > currentLine) break;
      active = h.line;
    }
    return active;
  }, [headings, currentLine]);

  if (headings.length === 0) {
    return <p className="text-xs text-neutral-500">No headings yet. Start a line with `=` to add one.</p>;
  }

  return (
    <ul className="space-y-0.5">
      {headings.map((h) => (
        <li key={h.line}>
          <button
            type="button"
            onClick={() => onJump(h.line)}
            style={{ paddingLeft: (h.depth - 1) * 12 }}
            className={`block w-full truncate rounded px-1.5 py-1 text-left text-xs transition hover:bg-white/10 ${
              h.line === activeLine ? "font-semibold text-neutral-50" : "text-neutral-400"
            }`}
          >
            {h.text || "(untitled)"}
          </button>
        </li>
      ))}
    </ul>
  );
}
