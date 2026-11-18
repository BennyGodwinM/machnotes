// MachNotes static site builder.
//
//   node scripts/build.mjs             -> _site/ for GitHub Pages (published articles only)
//   node scripts/build.mjs --drafts    -> also include draft articles
//   node scripts/build.mjs --base=/    -> override the URL base path (local preview)
//
// Each article is a folder in articles/<slug>/ holding its own index.html,
// CSS and JS (hand-built per article), its Overleaf source (source.tex) and
// any Penrose diagrams (diagrams/*.trio.json). The builder only adds the
// shared chrome (head, header, footer), renders the diagrams, and generates
// the home, topic, map and search pages.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTrio } from "./penrose.mjs";
import * as T from "./templates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_site");
const args = process.argv.slice(2);
const includeDrafts = args.includes("--drafts");
const site = JSON.parse(await readFile(path.join(ROOT, "site.json"), "utf8"));
const baseArg = args.find((a) => a.startsWith("--base="));
site.base = (baseArg ? baseArg.slice(7) : process.env.BASE ?? site.base).replace(/\/?$/, "/");

// Files that are sources, not published output.
const SOURCE_FILE = /\.(tex|bib|substance|style|domain|trio\.json|md)$|^meta\.json$|^\.|\.log$|\.aux$/;

export const slugify = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/\+/g, "-plus-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- taxonomy ----------
function indexCategories(nodes, parent = null, out = new Map()) {
  for (const n of nodes) {
    const slug = slugify(n.name);
    const pathStr = parent ? `${parent.path}/${slug}` : slug;
    const cat = { name: n.name, slug, path: pathStr, parent, children: [], articles: [] };
    out.set(pathStr, cat);
    if (parent) parent.children.push(cat);
    if (n.children) indexCategories(n.children, cat, out);
  }
  return out;
}
const categories = indexCategories(JSON.parse(await readFile(path.join(ROOT, "categories.json"), "utf8")));
const topLevel = [...categories.values()].filter((c) => !c.parent);
const ancestors = (cat) => (cat ? [...ancestors(cat.parent), cat] : []);
const subtreeArticles = (cat) => [...cat.articles, ...cat.children.flatMap(subtreeArticles)];

// ---------- articles ----------
async function loadArticles() {
  const dir = path.join(ROOT, "articles");
  if (!existsSync(dir)) return [];
  const list = [];
  for (const slug of await readdir(dir)) {
    if (slug.startsWith("_") || slug.startsWith(".")) continue;
    const metaPath = path.join(dir, slug, "meta.json");
    if (!existsSync(metaPath)) continue;
    const meta = JSON.parse(await readFile(metaPath, "utf8"));
    if (meta.status !== "published" && !includeDrafts) continue;
    const cat = categories.get(meta.category);
    if (!cat) throw new Error(`articles/${slug}/meta.json: unknown category "${meta.category}". See categories.json (paths are slugified names joined by /).`);
    const article = { ...meta, slug, dir: path.join(dir, slug), cat, url: `${site.base}articles/${slug}/` };
    cat.articles.push(article);
    list.push(article);
  }
  return list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

// Replace the article page's build markers with the shared chrome.
function fillPage(html, ctx) {
  return html
    .replace(/<!--\s*@head\s*-->/, () => T.head(site, ctx))
    .replace(/<!--\s*@header\s*-->/, () => T.header(site))
    .replace(/<!--\s*@footer\s*-->/, () => T.footer(site))
    .replace(/<!--\s*@byline\s*-->/, () => T.byline(site, ctx))
    .replace(/<!--\s*@penrose\s+([\w./-]+)\s*-->/g, (_, name) => {
      const svg = ctx.diagrams.get(name.replace(/\.svg$/, ""));
      if (!svg) throw new Error(`${ctx.slug}: no Penrose diagram "${name}" (expected ${name}.trio.json)`);
      return svg;
    })
    .replaceAll("{{base}}", () => site.base)
    .replaceAll("{{title}}", () => T.esc(ctx.title))
    .replaceAll("{{excerpt}}", () => T.esc(ctx.excerpt ?? ""));
}

async function buildArticle(a) {
  const dest = path.join(OUT, "articles", a.slug);
  await mkdir(dest, { recursive: true });
  const files = await walk(a.dir);
  // 1. Penrose diagrams -> SVG (both inlinable and as standalone files)
  const diagrams = new Map();
  for (const f of files.filter((f) => f.endsWith(".trio.json"))) {
    const rel = path.relative(a.dir, f).replace(/\.trio\.json$/, "");
    const svg = await renderTrio(f);
    diagrams.set(rel, svg);
    await mkdir(path.dirname(path.join(dest, rel)), { recursive: true });
    await writeFile(path.join(dest, `${rel}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`);
    console.log(`  penrose  ${a.slug}/${rel}.svg`);
  }
  // 2. Pages and assets
  const ctx = { ...a, diagrams, crumbs: ancestors(a.cat) };
  for (const f of files) {
    const rel = path.relative(a.dir, f);
    if (SOURCE_FILE.test(path.basename(f))) continue;
    const target = path.join(dest, rel);
    await mkdir(path.dirname(target), { recursive: true });
    if (f.endsWith(".html")) await writeFile(target, fillPage(await readFile(f, "utf8"), ctx));
    else await cp(f, target);
  }
}

async function page(rel, html) {
  const file = path.join(OUT, rel, rel.endsWith(".html") ? "" : "index.html");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

// ---------- build ----------
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(path.join(ROOT, "assets"), path.join(OUT, "assets"), { recursive: true });

const articles = await loadArticles();
console.log(`Building ${articles.length} article(s)${includeDrafts ? " (drafts included)" : ""}, base ${site.base}`);
for (const a of articles) await buildArticle(a);

const card = (a) => T.articleCard(site, a, ancestors(a.cat));
await page("", T.home(site, { articles, topLevel, card, subtreeArticles }));
await page("topics", T.topics(site, { topLevel, subtreeArticles }));
for (const cat of categories.values()) {
  await page(`topics/${cat.path}`, T.category(site, { cat, crumbs: ancestors(cat), articles: subtreeArticles(cat), card, subtreeArticles }));
}
const graph = {
  categories: [...categories.values()].map((c) => ({ id: c.path, name: c.name, parent: c.parent?.path ?? null, count: subtreeArticles(c).length })),
  articles: articles.map((a) => ({ id: a.slug, title: a.title, category: a.cat.path, url: a.url }))
};
await page("map", T.map(site, graph));
await page("search", T.search(site));
await writeFile(
  path.join(OUT, "search.json"),
  JSON.stringify(articles.map((a) => ({ title: a.title, excerpt: a.excerpt ?? "", url: a.url, topic: ancestors(a.cat).map((c) => c.name).join(" / "), date: a.date })))
);
await page("404.html", T.notFound(site));
await writeFile(path.join(OUT, ".nojekyll"), "");
console.log(`Done -> ${path.relative(ROOT, OUT)}/`);
