import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

// Dedicated from PATCH /api/categories/[id]: reordering siblings doesn't
// touch name/parentId/slug, so it skips that route's slug recomputation
// and collision checks entirely.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: unknown = body.updates;
  if (
    !Array.isArray(updates) ||
    updates.some((u) => typeof u?.id !== "string" || typeof u?.order !== "number")
  ) {
    return NextResponse.json({ error: "updates must be [{ id, order }]" }, { status: 400 });
  }

  await Promise.all(
    (updates as { id: string; order: number }[]).map((u) =>
      prisma.category.update({ where: { id: u.id }, data: { order: u.order } })
    )
  );

  return NextResponse.json({ ok: true });
}
