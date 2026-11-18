// MachNotes article template — scratch pad for drafting and content
// generation.
//
// Local use (VS Code + the Typst extension, or `typst compile` on the
// command line): this file compiles standalone to PDF as-is — everything
// below is plain Typst with no site-specific setup required. Use it to
// draft and iterate freely with live preview before anything touches the
// website.
//
// Moving into the website: a post's title, excerpt, and category are set
// separately in the writer app's form fields, not in this file — the DB
// `title` already renders as the page's heading, so don't restate it with
// a top-level `=` heading here; start straight into the first real
// section, the way the body below does.
//
// Two things behave differently on the website:
//   - `#callout(kind: "note")[...]` becomes available automatically
//     (kinds: note / warning / tip / important, each with its own accent
//     color) — the plain #block(...) below is a local stand-in for it so
//     this file still previews sensibly on its own.
//   - Citing something from the Resources library uses a special token,
//     `@@CITE:<resourceId>@@`, inserted by the writer app's "Cite a
//     resource" picker — it only resolves against a real resource ID in
//     the database, so there's nothing meaningful to demo here.

#set heading(numbering: "1.")

= Overview

A short lede — one or two sentences that double as the article's excerpt
in listings. State the governing physics or the question up front; this is
engineering notes, not a magazine intro. *Bold* and _italic_ work as
you'd expect.

== Governing Equations

Inline math reads naturally in a sentence: the lift equation is
$ L = 1/2 rho v^2 S C_L $, and thrust-to-weight for a given cruise point
follows from

$ T/W = q (C_(D_0)/(W\/S) + k (W\/S)/q^2) $

// Local stand-in for the website's `#callout(kind: "note")[...]`, which is
// only available once this is pasted into the writer app.
#block(fill: rgb("#eef6ff"), stroke: (left: 3pt + blue), inset: 10pt, radius: 4pt)[
  *Assumption:* state the simplifying assumptions behind an analysis
  explicitly — incompressible flow, rigid structure, steady-state, whatever
  applies. On the website, replace this block with
  `#callout(kind: "note")[...]` — swap `note` for `warning`, `tip`, or
  `important` as needed.
]

== Worked Example

- State the inputs
- Walk the calculation
  - Intermediate result, with units
- State the result, with units and a sanity check against a known data
  point

#table(
  columns: 2,
  table.header([*Parameter*], [*Value*]),
  [Wing area], [120 ft²],
  [Aspect ratio], [8.5],
)

#figure(
  image("placeholder.png", width: 60%),
  caption: [`placeholder.png` is a 1×1 stand-in next to this file — swap in
    a real plot, CAD render, or photo and delete the `width` override.],
) <fig:placeholder>

The result in @fig:placeholder follows directly from the worked example
above.

== Further Reading

Cite sources, standards, or related MachNotes articles here. On the
website, use the "Cite a resource" picker above the editor to insert a
`@@CITE:...@@` token instead of a manual link where the source is in the
Resources library.
