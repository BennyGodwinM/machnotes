import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostsList } from "@/components/PostsList";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; categoryId?: string; q?: string }>;
}) {
  const { status, categoryId, q } = await searchParams;

  const [articles, categories] = await Promise.all([
    prisma.article.findMany({
      where: {
        ...(status === "DRAFT" || status === "PUBLISHED" ? { status } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Posts</h1>
        <Link
          href="/posts/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          New post
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by title..."
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select
          name="categoryId"
          defaultValue={categoryId ?? ""}
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Filter
        </button>
      </form>

      <PostsList
        articles={articles.map((a) => ({
          id: a.id,
          title: a.title,
          status: a.status,
          updatedAt: a.updatedAt.toISOString(),
          category: { id: a.category.id, name: a.category.name },
        }))}
        categories={categories}
      />
    </div>
  );
}
