import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, revisionId } = await params;
  const [existing, revision] = await Promise.all([
    prisma.article.findUnique({ where: { id } }),
    prisma.articleRevision.findUnique({ where: { id: revisionId } }),
  ]);
  if (!existing || !revision || revision.articleId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Snapshot the current (about-to-be-overwritten) content first, so
  // restoring is itself undoable — it just becomes the newest revision.
  await prisma.articleRevision.create({
    data: {
      articleId: id,
      title: existing.title,
      typstSource: existing.typstSource,
      excerpt: existing.excerpt,
    },
  });

  const article = await prisma.article.update({
    where: { id },
    data: { title: revision.title, typstSource: revision.typstSource, excerpt: revision.excerpt },
  });

  return NextResponse.json({ article });
}
