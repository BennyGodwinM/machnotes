export default defineEventHandler(async () => {
  const [categories, articles] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, parentId: true, fullSlugPath: true },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, categoryId: true },
    }),
  ]);

  return { categories, articles };
});
