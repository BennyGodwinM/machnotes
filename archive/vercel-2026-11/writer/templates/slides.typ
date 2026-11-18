// MachNotes slide deck template — scratch pad for presentations (design
// reviews, talks, project updates).
//
// Local use: compile with VS Code's Typst extension or
// `typst compile slides.typ slides.pdf`. Uses touying's "simple" theme
// (https://typst.app/universe/package/touying) — minimal by design, no
// decorative chrome competing with the content — restyled in black and
// green to match the public site's Nuxt UI palette.
//
// Not a blog post: slide decks don't go through the website's article
// pipeline. If a deck is relevant to a post, compile it to PDF and attach
// it from that post's Resources panel in the writer app.
//
// Needs internet access once, to fetch touying from the Typst package
// registry — it's cached locally after that.

#import "@preview/touying:0.5.5": *
#import themes.simple: *

#show: simple-theme.with(
  aspect-ratio: "16-9",
  // MachNotes' own palette (see aerospace-notes-public's app.config.ts /
  // main.css): Nuxt's signature green as the one accent, true black
  // background, everything else grayscale — used sparingly on purpose,
  // not as a dominant color block.
  primary: rgb("#00DC82"),
  config-colors(
    neutral-light: rgb("#3a3a3a"),
    neutral-lightest: rgb("#000000"),
    neutral-darkest: rgb("#ededed"),
  ),
  footer: self => text(fill: rgb("#6b6b6b"), [MachNotes]),
)

// Body text size — the theme's own default (25pt) runs large for
// content-heavy slides; adjust this one value to taste.
#let content-font-size = 10pt

#set page(fill: rgb("#000000"))
#set text(fill: rgb("#ededed"), font: "Arial", size: content-font-size)
#set table(stroke: rgb("#3a3a3a"))
#show heading.where(level: 1): set text(fill: rgb("#00DC82"))

#title-slide[
  #text(size: 2em, weight: "bold", fill: rgb("#ededed"))[Presentation Title]
  #v(0.5em)
  #text(size: 1.1em, fill: rgb("#9a9a9a"))[Subtitle or one-line context]
  #v(1.5em)
  #text(size: 0.9em, fill: rgb("#6b6b6b"))[Your Name]
]

= Overview

== Problem Statement

- What's being analyzed or presented, and why
- Key constraints
- What "done" looks like

== Key Numbers

$ W/S = 1/2 rho v^2 C_L $

#table(
  columns: 2,
  [*Parameter*], [*Value*],
  [Wing area], [120 ft²],
  [Aspect ratio], [8.5],
)

= Results

== Figure

#figure(
  image("placeholder.png", width: 50%),
  caption: [Swap in a real plot, CAD render, or photo — this is a 1×1
    stand-in next to this file.],
)

== Next Steps

- Open items
- Risks and mitigations
- Questions
