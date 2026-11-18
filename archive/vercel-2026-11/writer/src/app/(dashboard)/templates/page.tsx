import { readFile } from "fs/promises";
import { join } from "path";
import { TemplateCard } from "@/components/TemplateCard";

async function readTemplate(filename: string): Promise<string> {
  return readFile(join(process.cwd(), "templates", filename), "utf8");
}

export default async function TemplatesPage() {
  const [document, slides] = await Promise.all([
    readTemplate("document.typ"),
    readTemplate("slides.typ"),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Templates</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Clean starting points for drafting — live at{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">templates/</code>{" "}
          in the writer repo, so they&apos;re the same files whether you open this page or open the repo
          in VS Code. Edit them there and the changes show up here on next load.
        </p>
      </div>

      <TemplateCard
        title="Document"
        description="A regular article — headings, math, a table, a figure, and a callout. Compiles standalone to PDF locally, and pastes straight into a post's Typst source."
        source={document}
        startPostHref="/posts/new"
      />

      <TemplateCard
        title="Slide deck"
        description="A presentation (design reviews, talks, project updates), styled to match the site's own black-and-green look. Local use only — slides don't go through the website's article pipeline, but compile to PDF and attach it from a post's Resources panel if it's relevant."
        source={slides}
      />
    </div>
  );
}
