/**
 * Typst's SVG export paints ink as literal #000000 and the page background
 * as literal #ffffff. Neither survives a dark theme. This rewrites the SVG
 * so ink follows the surrounding text color (`currentColor`) and drops the
 * opaque page-background rect so the math sits on whatever background the
 * article wrapper has.
 */
export function themeSvgForInline(svg: string): string {
  return svg
    .replace(/<path class="typst-shape" fill="#ffffff"[^>]*\/>/, "")
    .replace(/fill="#000000"/g, 'fill="currentColor"')
    .replace(/stroke="#000000"/g, 'stroke="currentColor"')
    .replace(/<svg /, '<svg class="typst-math-svg" style="display:inline-block;vertical-align:middle" ');
}
