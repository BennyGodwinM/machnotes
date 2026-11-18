# MachNotes

Notes on aerospace engineering, published at **https://bennygodwinm.github.io/machnotes/**.

MachNotes is a static site hosted on GitHub Pages. There is no CMS, database or
document compiler: each article is its own hand-built web page, so every topic
can have a layout, look and interactive graphics that suit it.

## How an article gets made

1. **Write it in Overleaf.** The LaTeX source is the draft of record and lives
   in the article folder as `source.tex`.
2. **Build the page with Claude.** Each article gets its own `index.html`,
   `article.css` and `article.js`: sliders, live plots, animations, whatever
   explains the topic best. Math is written in LaTeX syntax inside the HTML
   (`$...$`, `$$...$$`) and rendered by KaTeX.
3. **Diagrams in Penrose.** Put `*.trio.json` files in the article's
   `diagrams/` folder; the build renders them to SVG and inlines them where the
   page says `<!-- @penrose diagrams/name -->`. Shared aerospace domains and
   styles live in `diagrams/lib/`.
4. **Publish.** Set `"status": "published"` in `meta.json` and push to `main`.
   GitHub Actions builds the site and deploys it to Pages.

## Layout

```
articles/<slug>/        one folder per article
  meta.json             title, category path, date, excerpt, status, accent
  source.tex            Overleaf source (not published)
  index.html            the page (build fills <!-- @head --> etc.)
  article.css / .js     this article's own styling and interactives
  diagrams/*.trio.json  Penrose diagrams (rendered to SVG at build)
articles/_template/     starting point for new articles
assets/                 shared theme (base.css), logo, topic map
categories.json         the topic taxonomy
diagrams/lib/           shared Penrose domains + styles
scripts/                build, new-article, local preview server
archive/vercel-2026-11/ the retired Vercel apps (reference only)
```

## Commands

```bash
npm install
npm run new -- my-slug "Title" aircraft-design-and-systems/conceptual/sizing
npm run build:drafts && npm run serve   # preview with drafts at http://localhost:4321/
npm run build                           # what CI runs (published only, /machnotes/ base)
```

Category paths are the names in `categories.json`, slugified and joined with
`/` (`&` becomes `and`, other punctuation becomes `-`), for example
`structures-and-materials/materials/laminate-theory`.

## Page markers

| Marker | Replaced with |
| --- | --- |
| `<!-- @head -->` | meta tags, fonts, `assets/base.css`, KaTeX |
| `<!-- @header -->` / `<!-- @footer -->` | site header and footer |
| `<!-- @byline -->` | breadcrumbs, title and date (optional; build your own hero instead if you like) |
| `<!-- @penrose diagrams/name -->` | the rendered SVG of `diagrams/name.trio.json` |
| `{{base}}`, `{{title}}`, `{{excerpt}}` | site base path and article metadata |
