import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { compileTypstToHtml, TypstCompileError, type CompileMedia } from "@/lib/typst/compile";
import { prisma } from "@/lib/prisma";
import { readMediaFile } from "@/lib/media-storage";

// Live-preview compile while writing: same Typst→HTML pipeline as publish
// (so the preview has real fidelity, not an approximation), just never
// written to the database. Debounced on the client.
export async function POST(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const typstSource: string = body.typstSource ?? "";
  const articleId: string | undefined = body.articleId || undefined;
  const categoryId: string | undefined = body.categoryId || undefined;

  const citableResources =
    articleId || categoryId
      ? await prisma.resource.findMany({
          where: {
            OR: [...(articleId ? [{ articleId }] : []), ...(categoryId ? [{ categoryId }] : [])],
          },
          select: { id: true, title: true, url: true },
        })
      : [];

  let media: CompileMedia[] = [];
  if (articleId) {
    const rows = await prisma.media.findMany({ where: { articleId }, select: { filename: true } });
    media = await Promise.all(
      rows.map(async (m) => ({ filename: m.filename, buffer: await readMediaFile(m.filename) }))
    );
  }

  try {
    const { html } = await compileTypstToHtml(typstSource, media, citableResources);
    return NextResponse.json({ html });
  } catch (err) {
    if (err instanceof TypstCompileError) {
      return NextResponse.json({ error: err.message, detail: err.stderr }, { status: 422 });
    }
    throw err;
  }
}
