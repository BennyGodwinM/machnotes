import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

// Plain `contains` search across all articles (drafts included) and
// resources. Article.searchVector only gets populated on publish (see
// the publish route), so it can't find drafts — not worth the tsvector
// machinery here anyway at this content scale.
export async function GET(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ articles: [], resources: [] });

  const [articles, resources] = await Promise.all([
    prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
          { typstSource: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, status: true },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.resource.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, articleId: true },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ articles, resources });
}
