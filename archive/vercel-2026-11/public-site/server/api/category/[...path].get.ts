export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path") ?? "";

  const category = await prisma.category.findUnique({ where: { fullSlugPath: path } });
  if (!category) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const [children, articles, ancestors] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: category.id },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.article.findMany({
      where: { categoryId: category.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    }),
    getAncestors(category.parentId),
  ]);

  return {
    category: { id: category.id, name: category.name, fullSlugPath: category.fullSlugPath },
    breadcrumbs: [...ancestors, { name: category.name, fullSlugPath: category.fullSlugPath }],
    children: children.map((c) => ({ id: c.id, name: c.name, fullSlugPath: c.fullSlugPath })),
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      publishedAt: a.publishedAt,
    })),
  };
});

async function getAncestors(parentId: string | null): Promise<{ name: string; fullSlugPath: string }[]> {
  if (!parentId) return [];
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) return [];
  const rest = await getAncestors(parent.parentId);
  return [...rest, { name: parent.name, fullSlugPath: parent.fullSlugPath }];
}
