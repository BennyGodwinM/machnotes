import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get("articleId");
  const categoryId = searchParams.get("categoryId");
  const unfiled = searchParams.get("unfiled") === "1";

  const resources = await prisma.resource.findMany({
    where: {
      ...(articleId ? { articleId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(unfiled ? { articleId: null, categoryId: null } : {}),
    },
    include: { article: { select: { title: true } }, category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ resources });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const title: string = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const resource = await prisma.resource.create({
    data: {
      title,
      url: body.url?.trim() || null,
      notes: body.notes?.trim() || null,
      articleId: body.articleId || null,
      categoryId: body.categoryId || null,
    },
  });

  return NextResponse.json({ resource }, { status: 201 });
}
