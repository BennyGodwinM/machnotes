import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  fullSlugPath: string;
  parentId: string | null;
  order: number;
  children: CategoryNode[];
};

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const byId = new Map<string, CategoryNode>(
    categories.map((c) => [c.id, { ...c, children: [] as CategoryNode[] }])
  );
  const roots: CategoryNode[] = [];

  for (const node of byId.values()) {
    if (node.parentId) {
      byId.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// Flattened, depth-prefixed list for use in <select> pickers.
export function flattenTree(
  nodes: CategoryNode[],
  depth = 0
): { id: string; label: string; depth: number }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: node.name, depth },
    ...flattenTree(node.children, depth + 1),
  ]);
}

export async function computeFullSlugPath(name: string, parentId: string | null) {
  const slug = slugify(name);
  if (!parentId) return { slug, fullSlugPath: slug };

  const parent = await prisma.category.findUniqueOrThrow({ where: { id: parentId } });
  return { slug, fullSlugPath: `${parent.fullSlugPath}/${slug}` };
}

// After a reparent/rename, every descendant's fullSlugPath needs updating
// since it's derived from its ancestors' slugs.
export async function recomputeDescendantPaths(categoryId: string) {
  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  const children = await prisma.category.findMany({ where: { parentId: categoryId } });

  for (const child of children) {
    const fullSlugPath = `${category.fullSlugPath}/${child.slug}`;
    await prisma.category.update({ where: { id: child.id }, data: { fullSlugPath } });
    await recomputeDescendantPaths(child.id);
  }
}
