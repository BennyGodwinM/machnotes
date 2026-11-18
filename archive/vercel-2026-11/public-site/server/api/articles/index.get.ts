export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const categoryId = typeof query.categoryId === "string" ? query.categoryId : undefined;
  const limit = Math.min(Number(query.limit) || 20, 50);

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", ...(categoryId ? { categoryId } : {}) },
    include: { category: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  return {
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      publishedAt: a.publishedAt,
      category: { name: a.category.name, fullSlugPath: a.category.fullSlugPath },
    })),
  };
});
