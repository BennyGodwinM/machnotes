// Renders Penrose trios (.trio.json) to SVG strings in Node.
// @penrose/core expects a browser DOM (MathJax labels) and a canvas (text
// measuring), so we install jsdom globals and @napi-rs/canvas before loading it.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";

let core;

async function loadCore() {
  if (core) return core;
  const { createCanvas } = await import("@napi-rs/canvas");
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const w = dom.window;
  // Give jsdom canvases a real 2D context for Penrose's text measurement.
  w.HTMLCanvasElement.prototype.getContext = function (type) {
    if (type !== "2d") return null;
    if (!this.__ctx) this.__ctx = createCanvas(this.width || 300, this.height || 150).getContext("2d");
    return this.__ctx;
  };
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.DOMParser = w.DOMParser;
  globalThis.XMLSerializer = w.XMLSerializer;
  core = await import("@penrose/core");
  return core;
}

const readList = async (base, value) => {
  const list = Array.isArray(value) ? value : [value];
  const parts = await Promise.all(list.map((p) => readFile(path.resolve(base, p), "utf8")));
  return parts.join("\n");
};

/**
 * Render one trio file. Paths inside the trio are relative to the trio file.
 * Trio shape: { "substance": "a.substance", "style": ["x.style", ...],
 *               "domain": "x.domain", "variation": "SomeSeed123" }
 * Pin "variation" once a layout looks right: the same seed gives the same layout.
 */
export async function renderTrio(trioPath) {
  const { compile, optimize, toSVG, showError } = await loadCore();
  const dir = path.dirname(trioPath);
  const spec = JSON.parse(await readFile(trioPath, "utf8"));
  const trio = {
    substance: await readList(dir, spec.substance),
    style: await readList(dir, spec.style),
    domain: await readList(dir, spec.domain),
    variation: spec.variation ?? path.basename(trioPath),
    excludeWarnings: []
  };
  const compiled = await compile(trio);
  if (compiled.isErr()) throw new Error(`${trioPath}: ${showError(compiled.error)}`);
  const optimized = optimize(compiled.value);
  if (optimized.isErr()) throw new Error(`${trioPath}: ${showError(optimized.error)}`);
  const svg = await toSVG(optimized.value, async () => undefined, path.basename(trioPath, ".trio.json"));
  // Crop to the drawn content (plus padding) so a roomy canvas never leaves
  // empty margins or clips shapes; set "crop": false in the trio to keep the canvas.
  const crop = svg.querySelector("croppedViewBox")?.textContent?.trim().split(/\s+/).map(Number);
  if (spec.crop !== false && crop?.length === 4 && crop.every(Number.isFinite)) {
    const pad = spec.padding ?? 12;
    const [x, y, w, h] = crop;
    svg.setAttribute("viewBox", `${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}`);
    svg.setAttribute("width", String(Math.round(w + 2 * pad)));
    svg.setAttribute("height", String(Math.round(h + 2 * pad)));
  }
  svg.setAttribute("class", "penrose");
  svg.setAttribute("role", "img");
  if (spec.title) svg.setAttribute("aria-label", spec.title);
  return svg.outerHTML;
}
