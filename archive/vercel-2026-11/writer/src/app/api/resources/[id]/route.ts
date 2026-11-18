import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const resource = await prisma.resource.update({
    where: { id },
    data: {
      ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
      ...(body.url !== undefined ? { url: body.url?.trim() || null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
    },
  });

  return NextResponse.json({ resource });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
