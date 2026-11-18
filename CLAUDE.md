# MachNotes: working notes for Claude

Static aerospace notes site on GitHub Pages. Read README.md for the layout.

## Workflow (do not reintroduce Typst)
- Benny writes each article in **Overleaf**; the LaTeX goes in `articles/<slug>/source.tex`.
- Claude turns it into a **unique, hand-built page per article**: `index.html`, `article.css`,
  `article.js`. Design each one for its topic (interactive plots, sliders, animations,
  custom layout). Don't force articles into one template; `articles/_template` is only a start.
- Math: keep LaTeX syntax in the HTML; KaTeX auto-render handles `$`, `$$`, `\(`, `\[`.
- Diagrams: Penrose trios in `articles/<slug>/diagrams/`, shared libraries in `diagrams/lib/`.
  Pin `variation` once a layout looks right. Add new reusable domains/styles to `diagrams/lib/`.
- Interactive graphics: plain ES modules; import libraries from jsdelivr `+esm` URLs.
- Units: US customary (lb, lbf, ft, ft/s, hp, °F) unless the source demands SI.
- Show every algebraic step in derivations.
- Article structure follows What → Why → How → Trap → Bridge per concept, with a hook,
  a map of where the topic sits, step-backs, a result, and full sources.

## Rules
- Shared look lives in `assets/base.css` (`--mn-*` tokens). Articles override tokens in their
  own CSS rather than editing base.css for one article.
- Use the page markers (`<!-- @head -->`, `<!-- @header -->`, `<!-- @footer -->`, optionally
  `<!-- @byline -->`, `<!-- @penrose ... -->`) so pages keep the site chrome.
- `meta.json` `status` must be `published` for an article to go live.
- Topics with no published notes never appear anywhere on the site (home, topics, map, pages).
- Verify before pushing: `npm run build:drafts`, serve, and look at the page.
- `archive/` is reference only; never deploy it. Never commit secrets.
