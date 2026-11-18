import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { extractCitations } from "@/lib/typst/citations";

export async function GET() {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [categories, articles, resources] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, parentId: true },
    }),
    prisma.article.findMany({
      select: { id: true, title: true, status: true, categoryId: true, typstSource: true },
    }),
    prisma.resource.findMany({
      select: { id: true, title: true, articleId: true, categoryId: true },
    }),
  ]);

  const citationEdges = articles.flatMap((article) => {
    const { orderedResourceIds } = extractCitations(article.typstSource);
    return orderedResourceIds.map((resourceId) => ({ articleId: article.id, resourceId }));
  });

  return NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      categoryId: a.categoryId,
    })),
    resources: resources.map((r) => ({
      id: r.id,
      title: r.title,
      articleId: r.articleId,
      categoryId: r.categoryId,
    })),
    citationEdges,
  });
}
