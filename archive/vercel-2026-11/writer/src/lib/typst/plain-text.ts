// Strips compiled HTML down to plain text for full-text search indexing.
// Doesn't need to be perfect, just good enough for search relevance.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/g, " ") // drop math SVGs entirely
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
