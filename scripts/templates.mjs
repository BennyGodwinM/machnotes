// Shared page chrome and generated pages. Articles keep their own layout;
// they only receive head/header/footer from here.

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fmtDate = (d) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";

export const LOGO = `<svg class="mn-logo-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 14 L22 7 L15 10.5 L22 17 L13 13.5 L9 19 L10 13 Z" fill="currentColor"/></svg>`;

const KATEX = "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist";

export function head(site, ctx = {}) {
  const title = ctx.title ? `${esc(ctx.title)} · ${esc(site.title)}` : esc(site.title);
  const desc = esc(ctx.excerpt || site.description);
  const math = ctx.math === false ? "" : `
<link rel="stylesheet" href="${KATEX}/katex.min.css">
<script defer src="${KATEX}/katex.min.js"></script>
<script defer src="${KATEX}/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\\\[',right:'\\\\]',display:true},{left:'\\\\(',right:'\\\\)',display:false},{left:'$',right:'$',display:false}],ignoredClasses:['no-math'],throwOnError:false})"></script>`;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${esc(ctx.title || site.title)}">
<meta property="og:description" content="${desc}">
<link rel="icon" href="${site.base}assets/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@400;600&display=swap">
<link rel="stylesheet" href="${site.base}assets/base.css">${math}`;
}

export const header = (site) => `<header class="mn-header">
  <div class="mn-wrap mn-header-row">
    <a class="mn-logo" href="${site.base}">${LOGO}<span>${esc(site.title)}</span></a>
    <nav class="mn-nav">
      <a href="${site.base}topics/">Topics</a>
      <a href="${site.base}map/">Map</a>
      <a href="${site.base}search/" aria-label="Search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></a>
    </nav>
  </div>
</header>`;

export const footer = (site) => `<footer class="mn-footer">
  <div class="mn-wrap">${esc(site.title)} · ${new Date().getFullYear()}</div>
</footer>`;

export const crumbsHtml = (site, crumbs) =>
  `<nav class="mn-crumbs"><a href="${site.base}">Home</a>${crumbs
    .map((c) => `<span>/</span><a href="${site.base}topics/${c.path}/">${esc(c.name)}</a>`)
    .join("")}</nav>`;

// Optional standard article top: breadcrumbs, title, date. Articles can use
// <!-- @byline --> or build their own hero instead.
export const byline = (site, a) => `${crumbsHtml(site, a.crumbs)}
<h1 class="mn-title">${esc(a.title)}</h1>
<p class="mn-date">${fmtDate(a.date)}</p>`;

const shell = (site, ctx, body, extra = "") => `<!doctype html>
<html lang="en">
<head>
${head(site, { ...ctx, math: false })}
${extra}
</head>
<body>
${header(site)}
<main class="mn-main">${body}</main>
${footer(site)}
</body>
</html>`;

export const articleCard = (site, a, crumbs) => `<a class="mn-card" href="${a.url}"${a.accent ? ` style="--card-accent:${esc(a.accent)}"` : ""}>
  <div class="mn-card-meta"><span class="mn-chip">${esc(crumbs[0]?.name)}</span>${a.status !== "published" ? `<span class="mn-chip mn-chip-draft">Draft</span>` : ""}<span>${fmtDate(a.date)}</span></div>
  <h3>${esc(a.title)}</h3>
  ${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ""}
</a>`;

export function home(site, { articles, topLevel, card, subtreeArticles }) {
  const [featured, ...rest] = articles;
  // Topics with no notes are never shown.
  const topicTiles = topLevel
    .map((c) => [c, subtreeArticles(c).length])
    .filter(([, n]) => n > 0)
    .map(([c, n]) => `<a class="mn-topic" href="${site.base}topics/${c.path}/"><span>${esc(c.name)}</span><small>${n} note${n > 1 ? "s" : ""}</small></a>`)
    .join("");
  return shell(
    site,
    {},
    `<section class="mn-hero">
  <div class="mn-wrap">
    <div class="mn-hero-logo">${LOGO}<span>${esc(site.title)}</span></div>
    <p>${esc(site.description)}</p>
  </div>
</section>
<section class="mn-wrap mn-section">
  ${
    featured
      ? `<div class="mn-featured">${card(featured)}</div>${rest.length ? `<div class="mn-grid">${rest.map(card).join("")}</div>` : ""}`
      : `<p class="mn-empty">Nothing published yet.</p>`
  }
</section>
${topicTiles ? `<section class="mn-wrap mn-section">
  <h2 class="mn-h2">Topics</h2>
  <div class="mn-topics">${topicTiles}</div>
</section>` : ""}`
  );
}

export function topics(site, { topLevel, subtreeArticles }) {
  const tree = (nodes) => {
    const items = nodes
      .map((c) => [c, subtreeArticles(c).length])
      .filter(([, n]) => n > 0)
      .map(([c, n]) => `<li><a href="${site.base}topics/${c.path}/">${esc(c.name)} <small>${n}</small></a>${tree(c.children)}</li>`)
      .join("");
    return items ? `<ul>${items}</ul>` : "";
  };
  return shell(
    site,
    { title: "Topics" },
    `<div class="mn-wrap mn-section"><h1 class="mn-title">Topics</h1>${tree(topLevel) ? `<div class="mn-tree">${tree(topLevel)}</div>` : `<p class="mn-empty">Nothing published yet.</p>`}</div>`
  );
}

export function category(site, { cat, crumbs, articles, card, subtreeArticles }) {
  const kids = cat.children
    .map((c) => [c, subtreeArticles(c).length])
    .filter(([, n]) => n > 0)
    .map(([c, n]) => `<a class="mn-chip-link" href="${site.base}topics/${c.path}/">${esc(c.name)} <small>${n}</small></a>`)
    .join("");
  return shell(
    site,
    { title: cat.name },
    `<div class="mn-wrap mn-section">
  ${crumbsHtml(site, crumbs.slice(0, -1))}
  <h1 class="mn-title">${esc(cat.name)}</h1>
  ${kids ? `<div class="mn-chips">${kids}</div>` : ""}
  ${articles.length ? `<div class="mn-grid">${articles.map(card).join("")}</div>` : `<p class="mn-empty">No notes in this topic yet.</p>`}
</div>`
  );
}

export const map = (site, graph) =>
  shell(
    site,
    { title: "Map" },
    `<div class="mn-map-wrap">
  <div class="mn-map-legend"><span><i style="background:var(--mn-blue)"></i>Topic</span><span><i style="background:var(--mn-green)"></i>Note</span></div>
  <canvas id="mn-map" aria-label="Map of topics and notes"></canvas>
</div>
<script type="application/json" id="mn-graph">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>
<script type="module" src="${site.base}assets/map.js"></script>`,
    `<style>.mn-main{padding:0}.mn-footer{display:none}</style>`
  );

export const search = (site) =>
  shell(
    site,
    { title: "Search" },
    `<div class="mn-wrap mn-section">
  <h1 class="mn-title">Search</h1>
  <input id="mn-q" class="mn-input" type="search" placeholder="Search notes…" autofocus>
  <div id="mn-results" class="mn-results"></div>
</div>
<script type="module">
const res = await fetch("${site.base}search.json").then(r => r.json());
const box = document.getElementById("mn-results"), q = document.getElementById("mn-q");
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const run = () => {
  const terms = q.value.toLowerCase().split(/\\s+/).filter(Boolean);
  const hits = res.filter(a => terms.every(t => (a.title + " " + a.excerpt + " " + a.topic).toLowerCase().includes(t)));
  box.innerHTML = hits.length ? hits.map(a => \`<a class="mn-result" href="\${a.url}"><strong>\${esc(a.title)}</strong><small>\${esc(a.topic)}</small><span>\${esc(a.excerpt)}</span></a>\`).join("")
    : \`<p class="mn-empty">\${res.length ? "No matches." : "Nothing published yet."}</p>\`;
};
q.addEventListener("input", run); run();
</script>`
  );

export const notFound = (site) =>
  shell(site, { title: "Not found" }, `<div class="mn-wrap mn-section"><h1 class="mn-title">Not found</h1><p class="mn-empty">That page doesn't exist. <a href="${site.base}">Go home</a>.</p></div>`);
