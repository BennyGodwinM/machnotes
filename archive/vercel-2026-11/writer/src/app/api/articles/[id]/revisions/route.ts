import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const revisions = await prisma.articleRevision.findMany({
    where: { articleId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, typstSource: true },
  });

  return NextResponse.json({
    revisions: revisions.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      wordCount: r.typstSource.trim() ? r.typstSource.trim().split(/\s+/).length : 0,
    })),
  });
}
