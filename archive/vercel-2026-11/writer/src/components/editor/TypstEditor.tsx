"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { typst, typstTags } from "codemirror-lang-typst";

// Fixed VS Code Dark+-style theme, independent of the app's own light/dark
// mode. CodeMirror ships no base theme of its own, so pinning the editor to
// the page's light-mode-aware CSS variables previously meant its content
// inherited a dark foreground color onto CodeMirror's default white
// background in light mode, and the reverse in dark mode — white-on-white
// (or black-on-black) depending on OS theme. A code editor reading well on
// a dark background regardless of the surrounding page theme is also the
// standard convention (VS Code, GitHub, typst.app's own editor all do this).
const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
    },
    ".cm-content": {
      caretColor: "#d4d4d4",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#d4d4d4",
    },
    ".cm-gutters": {
      backgroundColor: "#1e1e1e",
      color: "#858585",
      border: "none",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgba(100, 150, 255, 0.3)",
    },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "rgba(100, 150, 255, 0.25)",
      outline: "none",
    },
  },
  { dark: true }
);

// Mirrors VS Code's Dark+ token palette, mapped onto Typst's syntax tree.
const typstDarkHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "#6a9955", fontStyle: "italic" },
  { tag: tags.keyword, color: "#c586c0" },
  { tag: [tags.null, tags.atom, tags.bool], color: "#569cd6" },
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.string, color: "#ce9178" },
  { tag: tags.escape, color: "#d7ba7d" },
  { tag: tags.labelName, color: "#d7ba7d" },
  { tag: tags.function(tags.variableName), color: "#dcdcaa" },
  { tag: tags.propertyName, color: "#9cdcfe" },
  { tag: tags.heading, color: "#569cd6", fontWeight: "bold" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.monospace, color: "#ce9178" },
  { tag: tags.link, color: "#569cd6", textDecoration: "underline" },
  { tag: tags.punctuation, color: "#d4d4d4" },
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.invalid, color: "#f44747" },
  { tag: typstTags.mathDelimiter, color: "#4ec9b0" },
  { tag: typstTags.listMarker, color: "#569cd6" },
  { tag: typstTags.interpolated, color: "#9cdcfe" },
]);

function wrapSelection(view: EditorView, before: string, after = before) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: from + before.length + selected.length },
  });
  return true;
}

const formattingKeymap = keymap.of([
  { key: "Mod-b", run: (view) => wrapSelection(view, "*") },
  { key: "Mod-i", run: (view) => wrapSelection(view, "_") },
  { key: "Mod-k", run: (view) => wrapSelection(view, '#link("https://")[', "]") },
]);

export type TypstEditorHandle = {
  insertAtCursor: (text: string) => void;
  wrapSelection: (before: string, after?: string) => void;
  insertLinePrefix: (prefix: string) => void;
  jumpToLine: (line: number) => void;
};

const extensions = [
  typst(),
  syntaxHighlighting(typstDarkHighlightStyle),
  EditorView.lineWrapping,
  formattingKeymap,
  darkTheme,
];

type TypstEditorProps = {
  value: string;
  onChange: (value: string) => void;
  // Reports the 1-based line the cursor is on, so the outline can bold
  // whichever section the cursor is currently inside.
  onCursorLineChange?: (line: number) => void;
};

export const TypstEditor = forwardRef<TypstEditorHandle, TypstEditorProps>(
  function TypstEditor({ value, onChange, onCursorLineChange }, ref) {
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const onCursorLineChangeRef = useRef(onCursorLineChange);
    onCursorLineChangeRef.current = onCursorLineChange;

    // Stable across renders (empty deps) — reads the latest callback via the
    // ref above instead of needing `extensions` itself to change.
    const extensionsWithCursorTracking = useMemo(
      () => [
        ...extensions,
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            const line = update.state.doc.lineAt(update.state.selection.main.head).number;
            onCursorLineChangeRef.current?.(line);
          }
        }),
      ],
      []
    );

    useImperativeHandle(ref, () => ({
      insertAtCursor(text: string) {
        const view = cmRef.current?.view;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus();
      },
      wrapSelection(before: string, after = before) {
        const view = cmRef.current?.view;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        const selected = view.state.sliceDoc(from, to);
        view.dispatch({
          changes: { from, to, insert: `${before}${selected}${after}` },
          selection: { anchor: from + before.length, head: from + before.length + selected.length },
        });
        view.focus();
      },
      insertLinePrefix(prefix: string) {
        const view = cmRef.current?.view;
        if (!view) return;
        const { from } = view.state.selection.main;
        const line = view.state.doc.lineAt(from);
        view.dispatch({
          changes: { from: line.from, to: line.from, insert: prefix },
          selection: { anchor: from + prefix.length },
        });
        view.focus();
      },
      jumpToLine(lineNumber: number) {
        const view = cmRef.current?.view;
        if (!view) return;
        const line = view.state.doc.line(Math.min(lineNumber, view.state.doc.lines));
        view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
        view.focus();
      },
    }));

    return (
      <CodeMirror
        ref={cmRef}
        value={value}
        onChange={onChange}
        extensions={extensionsWithCursorTracking}
        // @uiw/react-codemirror defaults this to "light" when omitted, which
        // injects its own white-background base theme that otherwise wins
        // over darkTheme below — "none" leaves styling entirely to our own
        // extensions.
        theme="none"
        height="100%"
        className="h-full overflow-hidden text-sm"
        basicSetup={{ foldGutter: false }}
      />
    );
  }
);
