import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { saveMediaFile } from "@/lib/media-storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articleId = new URL(req.url).searchParams.get("articleId");
  if (!articleId) return NextResponse.json({ error: "articleId is required" }, { status: 400 });

  const media = await prisma.media.findMany({ where: { articleId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ media });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const articleId = formData.get("articleId");
  if (!(file instanceof File) || typeof articleId !== "string" || !articleId) {
    return NextResponse.json({ error: "file and articleId are required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (10MB max)" }, { status: 413 });
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  // Typst's image() picks its decoder from the extension, so the stored
  // filename (what #image("...") in the article references) needs to keep
  // the original one rather than being a bare id.
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const media = await prisma.media.create({
    data: { url: "", filename: "", mimeType: file.type || "application/octet-stream", articleId },
  });
  const filename = `${media.id}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await saveMediaFile(filename, buffer);

  const updated = await prisma.media.update({ where: { id: media.id }, data: { filename, url } });
  return NextResponse.json({ media: updated }, { status: 201 });
}
