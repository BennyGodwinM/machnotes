import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { publishArticle } from "@/lib/publish-article";

type BulkAction = "publish" | "unpublish" | "delete" | "move";

export async function POST(req: NextRequest) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const ids: unknown = body.ids;
  const action: unknown = body.action;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "ids must be a non-empty array of strings" }, { status: 400 });
  }
  if (action !== "publish" && action !== "unpublish" && action !== "delete" && action !== "move") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const articleIds = ids as string[];
  const typedAction = action as BulkAction;

  if (typedAction === "unpublish") {
    await prisma.article.updateMany({ where: { id: { in: articleIds } }, data: { status: "DRAFT" } });
    return NextResponse.json({ ok: true });
  }

  if (typedAction === "delete") {
    await prisma.article.deleteMany({ where: { id: { in: articleIds } } });
    return NextResponse.json({ ok: true });
  }

  if (typedAction === "move") {
    const categoryId: unknown = body.categoryId;
    if (typeof categoryId !== "string" || !categoryId) {
      return NextResponse.json({ error: "categoryId is required for move" }, { status: 400 });
    }
    await prisma.article.updateMany({ where: { id: { in: articleIds } }, data: { categoryId } });
    return NextResponse.json({ ok: true });
  }

  // publish: each article needs its own Typst compile, so failures are
  // per-article rather than failing the whole batch.
  const results = await Promise.all(
    articleIds.map(async (id) => ({ id, result: await publishArticle(id) }))
  );
  const failures = results.filter((r) => !r.result.ok);
  if (failures.length > 0) {
    return NextResponse.json(
      {
        error: `${failures.length} of ${articleIds.length} failed to compile`,
        failures: failures.map((f) => ({ id: f.id, error: (f.result as { error: string }).error })),
      },
      { status: 207 }
    );
  }

  return NextResponse.json({ ok: true });
}
