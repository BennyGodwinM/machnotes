// One-off ingestion of the public "Aircraft Design Guide" Jupyter Book content
// as a starter dataset of DRAFT articles, for exercising listing/search/mind-map
// performance with a realistic amount of real content. Run once; safe to re-run
// (skips categories/articles that already exist by slug).
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const REPO = "C:/Users/benny/AppData/Local/Temp/claude/W--Aerospace-Notes/5d767a85-fbe5-4867-943f-b4c604b92ddb/scratchpad/Aircraft_Design_Guide";

function slugify(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function readMarkdownSource(relPath) {
  const full = join(REPO, relPath);
  if (relPath.endsWith(".ipynb")) {
    const nb = JSON.parse(readFileSync(full, "utf-8"));
    return nb.cells
      .filter((c) => c.cell_type === "markdown")
      .map((c) => (Array.isArray(c.source) ? c.source.join("") : c.source))
      .join("\n\n");
  }
  return readFileSync(full, "utf-8");
}

// Markdown (MyST/Jupyter Book flavour) -> Typst markup. Pragmatic, not exhaustive:
// math is preserved as literal raw text (not translated to Typst's math syntax,
// which is not LaTeX-compatible) so every article compiles cleanly; MyST
// directives (notes, figures, bibliography) are flattened to plain text/quotes.
function markdownToTypst(md, dropFirstH1 = true) {
  let s = md.replace(/\r\n/g, "\n");

  // Drop the leading "# Title" line (the Article.title field already covers it).
  if (dropFirstH1) {
    s = s.replace(/^#\s+.*\n+/, "");
  }

  // MyST directive fences: ```{directive} ...\n...content...\n```
  s = s.replace(/```\{(note|tip|seealso|epigraph|admonition)\}([^\n]*)\n([\s\S]*?)```/g, (_m, _kind, _meta, body) => {
    const cleaned = body
      .split("\n")
      .filter((line) => !/^:\w+:/.test(line.trim()))
      .join("\n")
      .trim();
    return `#quote(block: true)[${cleaned}]\n`;
  });

  // Figure directives: keep the caption as italic text, drop the image reference
  // (external/notebook-relative images aren't available to the Typst compiler here).
  s = s.replace(/```\{figure\}[^\n]*\n([\s\S]*?)```/g, (_m, body) => {
    const lines = body.split("\n").filter((line) => !/^:\w+:/.test(line.trim()));
    const caption = lines.join(" ").trim();
    return caption ? `_${caption}_\n` : "";
  });

  // Bibliography directive: not supported in this bulk import.
  s = s.replace(/```\{bibliography\}[\s\S]*?```/g, "");

  // Citation refs: {cite}`key1` `key2` -> drop (no Resource rows for these yet).
  s = s.replace(/\{cite\}(`[^`]*`\s*)+/g, "");

  // Display math $$ ... $$ -> Typst display math token " $ ... $ " kept as literal
  // raw text (LaTeX math syntax isn't valid Typst math syntax).
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_m, expr) => "`" + expr.trim().replace(/\n/g, " ") + "`");
  // Inline math $...$ -> raw text too, for the same reason.
  s = s.replace(/\$([^\n$]+?)\$/g, (_m, expr) => "`" + expr.trim() + "`");

  // Headings: ## -> Typst level-1 (=), ### -> level-2 (==), #### -> level-3 (===).
  s = s.replace(/^####\s+(.*)$/gm, "=== $1");
  s = s.replace(/^###\s+(.*)$/gm, "== $1");
  s = s.replace(/^##\s+(.*)$/gm, "= $1");
  s = s.replace(/^#\s+(.*)$/gm, "= $1");

  // Bold then italic (protect bold first so *_x_* nesting doesn't collide).
  s = s.replace(/\*\*([^*]+)\*\*/g, "\u0001$1\u0001");
  s = s.replace(/(?<![\w*])\*([^*\n]+)\*(?!\w)/g, "_$1_");
  s = s.replace(/\u0001([^\u0001]+)\u0001/g, "*$1*");

  // Links: [text](url) -> #link("url")[text]
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '#link("$2")[$1]');

  // Ordered list markers "1. " -> "+ " (Typst auto-numbered list).
  s = s.replace(/^(\s*)\d+\.\s+/gm, "$1+ ");

  // Markdown tables -> Typst #table(...). Only handles simple pipe tables.
  s = s.replace(/^(\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n?)+)/gm, (block) => {
    const rows = block.trim().split("\n").filter((r) => r.trim().startsWith("|"));
    const dataRows = rows.filter((_, i) => i !== 1); // drop the --- separator row
    const cells = dataRows.map((r) =>
      r
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim())
    );
    const cols = cells[0]?.length ?? 2;
    const body = cells.map((row) => row.map((c) => `[${c}]`).join(", ")).join(",\n  ");
    return `#table(\n  columns: ${cols},\n  ${body}\n)\n`;
  });

  // Blockquote markers "> " -> drop the marker, keep as plain paragraph text.
  s = s.replace(/^>\s?/gm, "");

  return s.trim();
}

function excerptOf(typstSource) {
  const firstPara = typstSource
    .split("\n\n")
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("=") && !p.startsWith("#") && !p.startsWith("`"));
  if (!firstPara) return null;
  const plain = firstPara.replace(/[*_`=#]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > 220 ? plain.slice(0, 217) + "..." : plain;
}

async function ensureCategory(name, parentId) {
  const slug = slugify(name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return existing;
  const fullSlugPath = parentId
    ? `${(await prisma.category.findUniqueOrThrow({ where: { id: parentId } })).fullSlugPath}/${slug}`
    : slug;
  return prisma.category.create({ data: { name, slug, fullSlugPath, parentId } });
}

async function ensureArticle({ title, categoryId, typstSource }) {
  const baseSlug = slugify(title) || "untitled";
  const existingByTitle = await prisma.article.findFirst({ where: { title, categoryId } });
  if (existingByTitle) {
    console.log(`skip (exists): ${title}`);
    return existingByTitle;
  }
  let slug = baseSlug;
  let n = 1;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }
  const article = await prisma.article.create({
    data: {
      title,
      slug,
      typstSource,
      excerpt: excerptOf(typstSource),
      status: "DRAFT",
      categoryId,
    },
  });
  console.log(`created: ${title}`);
  return article;
}

const STRUCTURE = [
  {
    part: "Part I — Foundations & Context",
    chapters: [
      {
        title: "1 — Introduction to Aircraft Design",
        index: "01_Overview/index.md",
        sections: [
          ["1.1 — What is Aircraft Design?", "01_Overview/01_what_is_design.ipynb"],
          ["1.2 — A History of Aircraft Design", "01_Overview/02_history_of_design.ipynb"],
          ["1.3 — Design Philosophy", "01_Overview/03_philosophy.ipynb"],
          ["1.4 — Design Phases", "01_Overview/04_design_phases.ipynb"],
          ["1.5 — Interdisciplinary Nature", "01_Overview/05_interdisciplinary.ipynb"],
          ["1.6 — Common Hurdles", "01_Overview/06_hurdles.ipynb"],
          ["1.7 — Summary", "01_Overview/07_summary.ipynb"],
        ],
      },
      {
        title: "2 — Stakeholders, Requirements & Systems Engineering",
        index: "02_Requirements/index.md",
        sections: [
          ["2.1 — Stakeholder Identification & Analysis", "02_Requirements/01_stakeholders.ipynb"],
          ["2.2 — Needs, Goals & Objectives", "02_Requirements/02_needs_goals.ipynb"],
          ["2.3 — Requirements Engineering", "02_Requirements/03_requirements_engineering.ipynb"],
          ["2.4 — Mission Profiles", "02_Requirements/04_mission_profiles.ipynb"],
          ["2.5 — Design Drivers & Figures of Merit", "02_Requirements/05_design_drivers.ipynb"],
          ["2.6 — The Systems Engineering Process", "02_Requirements/06_systems_engineering.ipynb"],
          ["2.7 — The Design Review Cycle", "02_Requirements/07_design_reviews.ipynb"],
        ],
      },
    ],
  },
  {
    part: "Part II — Mission Analysis & Conceptual Design",
    chapters: [
      {
        title: "5 — Conceptual Design & Configuration Selection",
        index: "05_Configuration/index.md",
        sections: [["5.1 — Fixed-Wing Configurations", "05_Configuration/01_fixed_wing_config.ipynb"]],
      },
    ],
  },
  {
    part: "Part III — Aerodynamics",
    chapters: [
      {
        title: "7 — Aerodynamic Fundamentals",
        index: "07_Aerodynamics/index.md",
        sections: [["7.1 — Fluid Mechanics Foundations", "07_Aerodynamics/01_fluid_mechanics.ipynb"]],
      },
    ],
  },
  {
    part: "Part IV — Propulsion Systems",
    chapters: [
      {
        title: "11 — Aerospace Propulsion",
        index: "11_Propulsion/index.md",
        sections: [
          ["11.1 — Propulsion Crash Course", "11_Propulsion/01_propulsion_crash_course.ipynb"],
          ["11.2 — A History of Aerospace Propulsion", "11_Propulsion/02_propulsion_history.ipynb"],
        ],
      },
    ],
  },
  {
    part: "Supplementary Resources",
    chapters: [
      {
        title: "Supplementary Resources",
        index: "Supplementary_Resources/index.md",
        sections: [["SR.1 — The International Standard Atmosphere (ISA)", "Supplementary_Resources/01_standard_atmosphere.ipynb"]],
      },
    ],
  },
  {
    part: "Worked Example & Template",
    chapters: [
      {
        title: "Worked Example & Template",
        index: null,
        sections: [["Worked Example — Conceptual Design Case Study", "Worked_Example/conceptual_design_case_study.ipynb"]],
      },
    ],
  },
];

async function main() {
  const root = await ensureCategory("Aircraft Design Guide", null);

  for (const { part, chapters } of STRUCTURE) {
    const partCat = await ensureCategory(part, root.id);
    for (const chapter of chapters) {
      const chapterCat = await ensureCategory(chapter.title, partCat.id);

      if (chapter.index && existsSync(join(REPO, chapter.index))) {
        const typstSource = markdownToTypst(readMarkdownSource(chapter.index));
        if (typstSource.length > 0) {
          await ensureArticle({ title: chapter.title, categoryId: chapterCat.id, typstSource });
        }
      }

      for (const [title, relPath] of chapter.sections) {
        if (!existsSync(join(REPO, relPath))) {
          console.log(`missing, skip: ${relPath}`);
          continue;
        }
        const typstSource = markdownToTypst(readMarkdownSource(relPath));
        await ensureArticle({ title, categoryId: chapterCat.id, typstSource });
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
