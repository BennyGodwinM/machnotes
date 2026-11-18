// Minimal static server for previewing _site/ locally (build with --base=/).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const port = Number(process.env.PORT ?? 4321);
createServer(async (req, res) => {
  let p = path.join(OUT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { if ((await stat(p)).isDirectory()) p = path.join(p, "index.html"); } catch {}
  try {
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404, { "content-type": "text/html" });
    res.end(await readFile(path.join(OUT, "404.html")).catch(() => "Not found"));
  }
}).listen(port, () => console.log(`http://localhost:${port}/`));
