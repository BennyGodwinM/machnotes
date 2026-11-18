import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requireAdminApi } from "@/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");
  const q = searchParams.get("q");

  const articles = await prisma.article.findMany({
    where: {
      ...(status === "DRAFT" || status === "PUBLISHED" ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ articles });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const title: string = body.title?.trim() || "Untitled";
  const categoryId: string | undefined = body.categoryId;

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  const baseSlug = slugify(title) || "untitled";
  let slug = baseSlug;
  let n = 1;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      categoryId,
      typstSource: body.typstSource ?? "",
      excerpt: body.excerpt ?? null,
    },
  });

  return NextResponse.json({ article }, { status: 201 });
}
