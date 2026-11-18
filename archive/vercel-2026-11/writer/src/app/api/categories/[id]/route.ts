import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { computeFullSlugPath, recomputeDescendantPaths } from "@/lib/categories";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name: string = typeof body.name === "string" ? body.name.trim() : existing.name;
  const parentId: string | null =
    body.parentId !== undefined ? body.parentId || null : existing.parentId;

  if (parentId === id) {
    return NextResponse.json({ error: "A category cannot be its own parent" }, { status: 400 });
  }

  const { slug, fullSlugPath } = await computeFullSlugPath(name, parentId);

  const slugClash = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
  if (slugClash) {
    return NextResponse.json({ error: "A category with that slug already exists" }, { status: 409 });
  }

  const category = await prisma.category.update({
    where: { id },
    data: { name, slug, fullSlugPath, parentId },
  });

  await recomputeDescendantPaths(id);

  return NextResponse.json({ category });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [childCount, articleCount] = await Promise.all([
    prisma.category.count({ where: { parentId: id } }),
    prisma.article.count({ where: { categoryId: id } }),
  ]);

  if (childCount > 0 || articleCount > 0) {
    return NextResponse.json(
      { error: "Category has subcategories or articles; move or delete those first" },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
