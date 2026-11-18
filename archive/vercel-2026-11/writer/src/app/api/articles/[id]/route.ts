import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAdminApi } from "@/lib/auth/require-admin";

const MAX_REVISIONS = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id }, include: { category: true } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ article });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let slug = existing.slug;
  if (typeof body.title === "string" && body.title.trim() && body.title.trim() !== existing.title) {
    const baseSlug = slugify(body.title) || "untitled";
    slug = baseSlug;
    let n = 1;
    while (await prisma.article.findFirst({ where: { slug, NOT: { id } } })) {
      slug = `${baseSlug}-${++n}`;
    }
  }

  // Snapshot the pre-save content as a revision whenever the content (not
  // just metadata like category) actually changes, so there's something
  // meaningful to restore later.
  const contentChanged =
    typeof body.typstSource === "string" && body.typstSource !== existing.typstSource;
  if (contentChanged) {
    await prisma.articleRevision.create({
      data: {
        articleId: id,
        title: existing.title,
        typstSource: existing.typstSource,
        excerpt: existing.excerpt,
      },
    });
    const toPrune = await prisma.articleRevision.findMany({
      where: { articleId: id },
      orderBy: { createdAt: "desc" },
      skip: MAX_REVISIONS,
      select: { id: true },
    });
    if (toPrune.length > 0) {
      await prisma.articleRevision.deleteMany({ where: { id: { in: toPrune.map((r) => r.id) } } });
    }
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...(typeof body.title === "string" ? { title: body.title.trim() || "Untitled", slug } : {}),
      ...(typeof body.typstSource === "string" ? { typstSource: body.typstSource } : {}),
      ...(typeof body.excerpt === "string" ? { excerpt: body.excerpt } : {}),
      ...(typeof body.categoryId === "string" ? { categoryId: body.categoryId } : {}),
    },
  });

  return NextResponse.json({ article });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
