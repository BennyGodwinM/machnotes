export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");

  const article = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: true },
  });

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  return {
    article: {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      compiledHtml: article.compiledHtml,
      publishedAt: article.publishedAt,
      category: { name: article.category.name, fullSlugPath: article.category.fullSlugPath },
    },
  };
});
