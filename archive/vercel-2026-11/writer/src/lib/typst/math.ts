import { randomUUID } from "crypto";

export type MathExpr = { token: string; expr: string; display: boolean };

const PLACEHOLDER_PREFIX = "TYPST-MATH-PLACEHOLDER";

/**
 * Typst's HTML export silently drops math (both `$x$` and `$ x $`) as of
 * v0.13 (https://github.com/typst/typst/issues/5512). We pull every math
 * region out of the source before the main HTML compile, replace it with a
 * plain-text token that survives the compile untouched, then render each
 * expression separately to SVG and splice it back into the HTML afterwards.
 *
 * This is a pragmatic scanner, not a full Typst parser: it tracks raw
 * (` ` / ``` ```) regions so `$` inside code isn't mistaken for math, but
 * doesn't otherwise understand Typst syntax.
 */
export function extractMath(source: string): { processedSource: string; expressions: MathExpr[] } {
  const expressions: MathExpr[] = [];
  let out = "";
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    // Skip fenced code blocks verbatim.
    if (source.startsWith("```", i)) {
      const end = source.indexOf("```", i + 3);
      const stop = end === -1 ? source.length : end + 3;
      out += source.slice(i, stop);
      i = stop;
      continue;
    }

    // Skip inline code verbatim.
    if (ch === "`") {
      const end = source.indexOf("`", i + 1);
      const stop = end === -1 ? source.length : end + 1;
      out += source.slice(i, stop);
      i = stop;
      continue;
    }

    // Escaped dollar sign: not math.
    if (ch === "\\" && source[i + 1] === "$") {
      out += "\\$";
      i += 2;
      continue;
    }

    if (ch === "$") {
      const end = findClosingDollar(source, i + 1);
      if (end === -1) {
        out += ch;
        i += 1;
        continue;
      }

      const inner = source.slice(i + 1, end);
      const display = inner.startsWith(" ") || inner.startsWith("\n");
      const expr = inner.trim();
      const token = `${PLACEHOLDER_PREFIX}-${randomUUID()}`;
      expressions.push({ token, expr, display });
      out += token;
      i = end + 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return { processedSource: out, expressions };
}

function findClosingDollar(source: string, from: number): number {
  for (let j = from; j < source.length; j++) {
    if (source[j] === "\\" && source[j + 1] === "$") {
      j += 1;
      continue;
    }
    if (source[j] === "$") return j;
    if (source[j] === "\n" && source[j + 1] === "\n") return -1; // no blank-line-spanning math
  }
  return -1;
}

export function spliceMathSvgs(html: string, rendered: Map<string, string>): string {
  let out = html;
  for (const [token, svg] of rendered) {
    // The token lands as plain text inside whatever element Typst emitted
    // (usually a <p>); a direct string replace is enough since tokens are
    // unique random UUIDs that won't collide with real content.
    out = out.split(token).join(svg);
  }
  return out;
}
