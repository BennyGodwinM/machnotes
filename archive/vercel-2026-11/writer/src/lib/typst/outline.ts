export type HeadingEntry = { line: number; depth: number; text: string };

// Shared between EditorOutline (building the sidebar list) and ArticleForm
// (mapping a clicked preview heading back to a source line) — both need the
// same heading-to-line-number mapping, in the same order Typst emits them.
export function parseHeadings(source: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const lines = source.split("\n");
  lines.forEach((raw, i) => {
    const match = /^(=+)\s+(.*)$/.exec(raw);
    if (match) {
      headings.push({ line: i + 1, depth: match[1].length, text: match[2].trim() });
    }
  });
  return headings;
}
