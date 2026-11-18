import { randomUUID } from "crypto";

export type CitableResource = { id: string; title: string; url: string | null };

const CITE_RE = /@@CITE:([a-zA-Z0-9_-]+)@@/g;

export function extractCitations(source: string) {
  const tokenByResourceId = new Map<string, string>();
  const order: string[] = [];

  const processedSource = source.replace(CITE_RE, (_match, resourceId: string) => {
    if (!tokenByResourceId.has(resourceId)) {
      tokenByResourceId.set(resourceId, `CITE-PLACEHOLDER-${randomUUID()}`);
      order.push(resourceId);
    }
    return tokenByResourceId.get(resourceId)!;
  });

  return { processedSource, tokenByResourceId, orderedResourceIds: order };
}

/**
 * Splices numbered citation markers into the compiled HTML and appends a
 * References section. Resources are numbered by first-citation order;
 * a resource cited but not found (e.g. deleted after citing) is skipped
 * silently in the reference list but its marker still renders as "[?]" so
 * a broken citation is visible to the writer rather than disappearing.
 */
export function spliceCitations(
  html: string,
  tokenByResourceId: Map<string, string>,
  orderedResourceIds: string[],
  resources: CitableResource[]
): string {
  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const citedResources = orderedResourceIds.filter((id) => resourceById.has(id));
  const numberById = new Map(citedResources.map((id, i) => [id, i + 1]));

  let out = html;
  for (const [resourceId, token] of tokenByResourceId) {
    const n = numberById.get(resourceId);
    const marker = n
      ? `<sup class="citation"><a href="#ref-${n}">[${n}]</a></sup>`
      : `<sup class="citation citation-broken">[?]</sup>`;
    out = out.split(token).join(marker);
  }

  if (citedResources.length === 0) return out;

  const items = citedResources
    .map((id, i) => {
      const r = resourceById.get(id)!;
      const n = i + 1;
      const label = r.url
        ? `<a href="${escapeAttr(r.url)}" target="_blank" rel="noreferrer">${escapeHtml(r.title)}</a>`
        : escapeHtml(r.title);
      return `<li id="ref-${n}">${label}</li>`;
    })
    .join("");

  return `${out}<section class="references"><h3>References</h3><ol>${items}</ol></section>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
