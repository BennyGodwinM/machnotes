import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { saveResourceFile, readResourceFile, deleteResourceFile } from "@/lib/resource-storage";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (25MB max)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await saveResourceFile(id, buffer);

  const updated = await prisma.resource.update({
    where: { id },
    data: { fileName: file.name, fileMimeType: file.type || "application/octet-stream", fileSize: file.size },
  });

  return NextResponse.json({ resource: updated });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource?.fileName) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await readResourceFile(id).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": resource.fileMimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(resource.fileName)}"`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteResourceFile(id);
  const resource = await prisma.resource.update({
    where: { id },
    data: { fileName: null, fileMimeType: null, fileSize: null },
  });

  return NextResponse.json({ resource });
}
