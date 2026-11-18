// Create a new article folder from articles/_template.
//   npm run new -- <slug> "<Title>" <category/path>
import { cp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [slug, title, category] = process.argv.slice(2);
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: npm run new -- <slug> "<Title>" <category/path>   (slug: lowercase, digits, dashes)');
  process.exit(1);
}
const dest = path.join(ROOT, "articles", slug);
if (existsSync(dest)) throw new Error(`articles/${slug} already exists`);
await cp(path.join(ROOT, "articles", "_template"), dest, { recursive: true });
const metaPath = path.join(dest, "meta.json");
const meta = JSON.parse(await readFile(metaPath, "utf8"));
Object.assign(meta, { title: title ?? meta.title, category: category ?? meta.category, date: new Date().toISOString().slice(0, 10), status: "draft" });
await writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n");
console.log(`Created articles/${slug} (draft). Put the Overleaf source in source.tex.`);
