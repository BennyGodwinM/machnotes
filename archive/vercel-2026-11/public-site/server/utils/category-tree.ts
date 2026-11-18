import type { Category } from "../generated/prisma/client";

export type CategoryTreeNode = Category & { children: CategoryTreeNode[] };

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const categories = await prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });

  const byId = new Map<string, CategoryTreeNode>(categories.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryTreeNode[] = [];

  for (const node of byId.values()) {
    if (node.parentId) byId.get(node.parentId)?.children.push(node);
    else roots.push(node);
  }

  return roots;
}
