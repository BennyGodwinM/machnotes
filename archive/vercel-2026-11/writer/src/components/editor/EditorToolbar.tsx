"use client";

import { useRef, type ChangeEvent, type RefObject } from "react";
import type { TypstEditorHandle } from "@/components/editor/TypstEditor";

type ToolbarAction = {
  label: string;
  title: string;
  run: (handle: TypstEditorHandle) => void;
};

const ACTIONS: ToolbarAction[] = [
  { label: "B", title: "Bold (Ctrl+B)", run: (h) => h.wrapSelection("*") },
  { label: "I", title: "Italic (Ctrl+I)", run: (h) => h.wrapSelection("_") },
  { label: "H1", title: "Heading 1", run: (h) => h.insertLinePrefix("= ") },
  { label: "H2", title: "Heading 2", run: (h) => h.insertLinePrefix("== ") },
  { label: "H3", title: "Heading 3", run: (h) => h.insertLinePrefix("=== ") },
  { label: "•", title: "Bullet list", run: (h) => h.insertLinePrefix("- ") },
  { label: "1.", title: "Numbered list", run: (h) => h.insertLinePrefix("+ ") },
  { label: "❝", title: "Quote", run: (h) => h.insertLinePrefix("#quote[]") },
  { label: "</>", title: "Code block", run: (h) => h.insertAtCursor("```\n\n```") },
  { label: "∑", title: "Math", run: (h) => h.wrapSelection("$ ", " $") },
  { label: "🔗", title: "Link (Ctrl+K)", run: (h) => h.wrapSelection('#link("https://")[', "]") },
  {
    label: "⊞",
    title: "Table",
    run: (h) =>
      h.insertAtCursor(
        '#table(\n  columns: 2,\n  table.header([*Header 1*], [*Header 2*]),\n  [Cell 1], [Cell 2],\n)'
      ),
  },
  { label: "ⓘ", title: "Note callout", run: (h) => h.insertAtCursor('#callout(kind: "note")[Note text.]') },
  { label: "⚠", title: "Warning callout", run: (h) => h.insertAtCursor('#callout(kind: "warning")[Warning text.]') },
  {
    label: "@",
    title: "Cross-reference (label a heading/figure with <name>, then @name to refer to it)",
    run: (h) => h.insertAtCursor("@"),
  },
];

type EditorToolbarProps = {
  handleRef: RefObject<TypstEditorHandle | null>;
  // Image/figure upload needs a Media row tied to a real article, so these
  // buttons are disabled until the post has been saved at least once.
  articleId?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

export function EditorToolbar({ handleRef, articleId, isFullscreen, onToggleFullscreen }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<"image" | "figure">("image");

  function triggerUpload(kind: "image" | "figure") {
    if (!articleId) return;
    pendingKindRef.current = kind;
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !articleId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("articleId", articleId);

    const res = await fetch("/api/media", { method: "POST", body: formData });
    if (!res.ok) {
      window.alert("Image upload failed.");
      return;
    }
    const { media } = await res.json();

    const handle = handleRef.current;
    if (!handle) return;
    if (pendingKindRef.current === "figure") {
      handle.insertAtCursor(`#figure(\n  image("${media.filename}"),\n  caption: [Caption],\n) <fig:label>`);
    } else {
      handle.insertAtCursor(`#image("${media.filename}")`);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-neutral-700 bg-[#1e1e1e] px-2 py-1.5">
      {ACTIONS.map((action) => (
        <button
          key={action.title}
          type="button"
          title={action.title}
          onClick={() => handleRef.current && action.run(handleRef.current)}
          className="min-w-[28px] rounded px-1.5 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/10"
        >
          {action.label}
        </button>
      ))}
      <button
        type="button"
        title={articleId ? "Image" : "Save the post first"}
        disabled={!articleId}
        onClick={() => triggerUpload("image")}
        className="min-w-[28px] rounded px-1.5 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/10 disabled:opacity-40"
      >
        🖼
      </button>
      <button
        type="button"
        title={articleId ? "Figure with caption" : "Save the post first"}
        disabled={!articleId}
        onClick={() => triggerUpload("figure")}
        className="min-w-[28px] rounded px-1.5 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/10 disabled:opacity-40"
      >
        🖽
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChosen} />
      <button
        type="button"
        title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
        onClick={onToggleFullscreen}
        className="ml-auto min-w-[28px] rounded px-1.5 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/10"
      >
        {isFullscreen ? "⤡" : "⤢"}
      </button>
    </div>
  );
}
