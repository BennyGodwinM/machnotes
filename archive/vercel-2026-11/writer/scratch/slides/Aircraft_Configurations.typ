// MachNotes slide deck template — scratch pad for presentations (DBF
// reviews, design reviews, conference talks, etc).
//
// Local use only: slide decks aren't blog posts, so this never goes
// through the website — compile it straight to PDF with VS Code's Typst
// extension or `typst compile slides.typ slides.pdf`.
//
// Uses diatypst (https://typst.app/universe/package/diatypst), fetched
// automatically from the Typst package registry on first compile — needs
// internet access once, then it's cached locally.

#import "@preview/diatypst:0.9.1": *
#show: slides.with(
  title: "Presentation Title",
  subtitle: "Subtitle or one-line context",
  date: "Nov 2026",
  authors: ("Your Name, Wichita State University DBF",),
  ratio: 16/9,
  layout: "medium",
  title-color: blue.darken(70%),
  toc: true,
)

= Mission Overview

== Problem Statement

- What are we designing, and why
- Key constraints (rules, weight, budget, timeline)
- Success criteria

== Requirements

#table(
  columns: 2,
  table.header([*Requirement*], [*Driver*]),
  [Payload capacity], [Mission profile],
  [Stall speed], [Competition rules],
)

= Design Approach

== Key Design Variables

Wing loading and thrust-to-weight drive most downstream decisions:

$ W/S = 1/2 rho v^2 C_L $

== Trade Studies

= Results

== Performance Summary

#table(
  columns: 2,
  table.header([*Parameter*], [*Value*]),
  [Wing area], [120 ft²],
  [Aspect ratio], [8.5],
)

== Next Steps

- Open items
- Risks and mitigations
- Questions
