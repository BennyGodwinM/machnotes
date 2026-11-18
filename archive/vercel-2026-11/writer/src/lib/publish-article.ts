import { prisma } from "@/lib/prisma";
import { compileTypstToHtml, TypstCompileError, type CompileMedia } from "@/lib/typst/compile";
import { htmlToPlainText } from "@/lib/typst/plain-text";
import { readMediaFile } from "@/lib/media-storage";

export type PublishResult = { ok: true } | { ok: false; error: string; detail?: string };

// Shared by the single-article publish route and bulk publish: compiles the
// article's Typst source, stores the result, and refreshes its search_vector.
export async function publishArticle(id: string): Promise<PublishResult> {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Not found" };

  const citableResources = await prisma.resource.findMany({
    where: { OR: [{ articleId: id }, { categoryId: existing.categoryId }] },
    select: { id: true, title: true, url: true },
  });

  const mediaRows = await prisma.media.findMany({ where: { articleId: id }, select: { filename: true } });
  const media: CompileMedia[] = await Promise.all(
    mediaRows.map(async (m) => ({ filename: m.filename, buffer: await readMediaFile(m.filename) }))
  );

  let html: string;
  try {
    ({ html } = await compileTypstToHtml(existing.typstSource, media, citableResources));
  } catch (err) {
    if (err instanceof TypstCompileError) {
      return { ok: false, error: err.message, detail: err.stderr };
    }
    throw err;
  }

  const article = await prisma.article.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date(), compiledHtml: html },
  });

  const plainText = htmlToPlainText(html);
  await prisma.$executeRaw`
    UPDATE "Article"
    SET search_vector = setweight(to_tsvector('english', ${article.title}), 'A')
                      || setweight(to_tsvector('english', ${plainText}), 'B')
    WHERE id = ${id}
  `;

  return { ok: true };
}
