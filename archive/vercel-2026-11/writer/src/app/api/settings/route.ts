import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

export async function PATCH(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {
      ...(typeof body.siteTitle === "string" ? { siteTitle: body.siteTitle } : {}),
      ...(typeof body.siteDescription === "string" ? { siteDescription: body.siteDescription } : {}),
    },
    create: {
      id: "singleton",
      siteTitle: body.siteTitle ?? "MachNotes",
      siteDescription: body.siteDescription ?? "Notes on aerospace engineering.",
    },
  });

  return NextResponse.json({ settings });
}
