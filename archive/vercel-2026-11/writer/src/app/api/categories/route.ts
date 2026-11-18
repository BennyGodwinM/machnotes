import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { computeFullSlugPath, getCategoryTree } from "@/lib/categories";

export async function GET() {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tree = await getCategoryTree();
  return NextResponse.json({ tree });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name: string = body.name?.trim();
  const parentId: string | null = body.parentId || null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { slug, fullSlugPath } = await computeFullSlugPath(name, parentId);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A category with that slug already exists" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: { name, slug, fullSlugPath, parentId },
  });

  return NextResponse.json({ category }, { status: 201 });
}
