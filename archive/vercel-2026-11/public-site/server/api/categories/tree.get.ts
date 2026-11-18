export default defineEventHandler(async () => {
  const [tree, articles] = await Promise.all([
    getCategoryTree(),
    prisma.article.findMany({ where: { status: "PUBLISHED" }, select: { categoryId: true } }),
  ]);
  const hasDirectPost = new Set(articles.map((a) => a.categoryId));

  // The homepage hero is a tag cloud meant for browsing real content — a
  // category only earns a tag once something is actually published there
  // or under one of its descendants, otherwise the full 260-category
  // taxonomy would show as a wall of dead-end tags. Bottom-up prune: a
  // parent survives whenever at least one child survives.
  type Node = Awaited<ReturnType<typeof getCategoryTree>>[number];
  function prune(nodes: Node[]): Node[] {
    return nodes
      .map((n) => ({ ...n, children: prune(n.children) }))
      .filter((n) => hasDirectPost.has(n.id) || n.children.length > 0);
  }

  const strip = (nodes: Node[]): unknown[] =>
    nodes.map((n) => ({
      id: n.id,
      name: n.name,
      fullSlugPath: n.fullSlugPath,
      children: strip(n.children),
    }));

  return { tree: strip(prune(tree)) };
});
