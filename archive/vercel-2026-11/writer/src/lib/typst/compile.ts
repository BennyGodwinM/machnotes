import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sanitizeHtml from "sanitize-html";
import { extractMath, spliceMathSvgs } from "@/lib/typst/math";
import { themeSvgForInline } from "@/lib/typst/svg-theme";
import { extractCitations, spliceCitations, type CitableResource } from "@/lib/typst/citations";

const execFileAsync = promisify(execFile);

// On Vercel the Windows "typst" binary used in local dev isn't available —
// use the bundled Linux binary instead (see vendor/typst/typst-linux-x64).
const TYPST_BIN = process.env.VERCEL
  ? join(process.cwd(), "vendor", "typst", "typst-linux-x64")
  : "typst";

// Prepended to every article before compile:
// - Heading numbering is required for `@label` references to headings to
//   resolve at all (Typst errors with "cannot reference heading without
//   numbering" otherwise); it also gives section refs readable text
//   ("Section 2") instead of nothing.
// - Typst's HTML export silently drops `#image(...)` as an "ignored block"
//   (same HTML-export immaturity as the math-dropping issue extractMath
//   works around) — wrapping it in `html.frame(...)` rasterizes it to an
//   inline SVG instead, which the exporter preserves. Redefining `image`
//   here means every `#image(...)` call in an article's body — standalone
//   or inside `#figure(...)` — gets this for free, with no change to
//   article source or to what authors type.
// - `callout` is a small helper exposed to authors for note/warning/tip
//   boxes; it compiles to a plain classed <div> via `html.elem`, styled in
//   each app's CSS (see .callout rules in writer/public globals).
const PRELUDE = [
  '#set heading(numbering: "1.")',
  "#let image(..args) = html.frame(std.image(..args))",
  '#let callout(kind: "note", body) = html.elem("div", attrs: (class: "callout callout-" + kind))[#body]',
].join("\n");

export class TypstCompileError extends Error {
  constructor(message: string, public readonly stderr: string) {
    super(message);
    this.name = "TypstCompileError";
  }
}

async function runTypstHtml(source: string, workDir: string, rootDir: string): Promise<string> {
  const inputPath = join(workDir, "article.typ");
  const outputPath = join(workDir, "article.html");
  await writeFile(inputPath, source, "utf8");

  try {
    await execFileAsync(TYPST_BIN, [
      "compile",
      "--features",
      "html",
      "--format",
      "html",
      "--root",
      rootDir,
      inputPath,
      outputPath,
    ]);
  } catch (err) {
    const stderr = err instanceof Error && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    throw new TypstCompileError("Typst failed to compile this article.", stderr);
  }

  return readFile(outputPath, "utf8");
}

async function renderMathSvg(expr: string, display: boolean, rootDir: string, id: string): Promise<string> {
  const snippet = [
    "#set page(width: auto, height: auto, margin: 2pt)",
    "#set text(size: 11pt)",
    display ? `$ ${expr} $` : `$${expr}$`,
  ].join("\n");

  const inputPath = join(rootDir, `math-${id}.typ`);
  const outputPath = join(rootDir, `math-${id}.svg`);
  await writeFile(inputPath, snippet, "utf8");

  try {
    await execFileAsync(TYPST_BIN, ["compile", "--format", "svg", "--root", rootDir, inputPath, outputPath]);
  } catch (err) {
    const stderr = err instanceof Error && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    throw new TypstCompileError(`Typst failed to render the equation: $${expr}$`, stderr);
  }

  const svg = await readFile(outputPath, "utf8");
  return themeSvgForInline(svg);
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // SVG attribute names are case-sensitive (viewBox, not viewbox) — without
  // this, sanitize-html's default lowercasing silently breaks SVG sizing.
  parser: { lowerCaseAttributeNames: false },
  // table/thead/tbody/tr/td/th/figure/figcaption are already in
  // sanitize-html's defaults; only svg internals and h1/h2 need adding.
  // svg's own <image> (rasterized #image(...) via html.frame, see compile.ts's
  // PRELUDE) is distinct from the HTML <img> tag already in the defaults.
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "svg", "path", "g", "use", "defs", "symbol", "image", "h1", "h2",
  ]),
  // Merge with the defaults (which already cover href/target/rel on <a>,
  // etc.) rather than replacing them — an un-merged override here would
  // silently strip hrefs from every link, including citation links.
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "id"],
    a: [...(sanitizeHtml.defaults.allowedAttributes.a ?? []), "target", "rel"],
    svg: ["viewBox", "width", "height", "xmlns", "xmlns:xlink", "xmlns:h5"],
    path: ["d", "fill", "fill-rule", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit"],
    g: ["transform"],
    use: ["xlink:href", "x", "fill", "fill-rule"],
    symbol: ["overflow"],
    image: ["xlink:href", "width", "height", "preserveAspectRatio", "x", "y"],
  },
  // `data:` URIs are needed for the <image> tag above (our own base64-embedded
  // rasters) — safe here since every SVG is generated by our own compile
  // step, never by user-supplied markup.
  allowedSchemesByTag: { image: ["data"] },
  allowVulnerableTags: true, // we generated the SVG ourselves from our own compile step
};

export type CompileResult = { html: string };
export type CompileMedia = { filename: string; buffer: Buffer };

/**
 * Compiles Typst source to a sanitized HTML fragment, suitable for storing
 * as Article.compiledHtml and rendering on the public site via `v-html`.
 *
 * `media`, if given, is written into the compile root under each entry's
 * `filename` before compiling, so `#image("<filename>")` calls in the
 * article resolve against it (the filenames the writer's image picker
 * inserts — see src/lib/media-storage.ts for how they're stored). Without
 * a matching entry, an `#image(...)` call fails with a Typst "file not
 * found" error surfaced as TypstCompileError.
 *
 * `citableResources`, if given, resolves `@@CITE:<resourceId>@@` tokens
 * (inserted by the writer's resource picker) into numbered citation marks
 * plus an appended References section.
 */
export async function compileTypstToHtml(
  source: string,
  media: CompileMedia[] = [],
  citableResources: CitableResource[] = []
): Promise<CompileResult> {
  const { processedSource: afterCitations, tokenByResourceId, orderedResourceIds } = extractCitations(source);
  const { processedSource, expressions } = extractMath(afterCitations);

  const workDir = await mkdtemp(join(tmpdir(), "typst-compile-"));

  try {
    for (const { filename, buffer } of media) {
      await writeFile(join(workDir, filename), buffer);
    }

    const rawHtml = await runTypstHtml(`${PRELUDE}\n\n${processedSource}`, workDir, workDir);

    const rendered = new Map<string, string>();
    for (const { token, expr, display } of expressions) {
      const svg = await renderMathSvg(expr, display, workDir, token.slice(-8));
      rendered.set(token, `<span class="typst-math">${svg}</span>`);
    }

    const withMath = spliceMathSvgs(rawHtml, rendered);

    // Typst emits a full <!DOCTYPE html><html>...<body>...; we only want
    // the body's contents since the public app supplies its own page shell.
    const bodyMatch = withMath.match(/<body>([\s\S]*)<\/body>/);
    const fragment = bodyMatch ? bodyMatch[1] : withMath;

    const withCitations = spliceCitations(fragment, tokenByResourceId, orderedResourceIds, citableResources);

    const html = sanitizeHtml(withCitations, SANITIZE_OPTIONS);
    return { html };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
