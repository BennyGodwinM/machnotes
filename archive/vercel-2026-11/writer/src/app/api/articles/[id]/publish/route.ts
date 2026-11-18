import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { publishArticle } from "@/lib/publish-article";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await publishArticle(id);
  if (!result.ok) {
    const status = result.error === "Not found" ? 404 : 422;
    return NextResponse.json({ error: result.error, detail: result.detail }, { status });
  }

  return NextResponse.json({ ok: true });
}
