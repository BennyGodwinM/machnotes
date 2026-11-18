import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryBreakdownChart } from "@/components/CategoryBreakdownChart";
import { ActivityChart } from "@/components/ActivityChart";
import { StatusBadge } from "@/components/StatusBadge";

const ACTIVITY_DAYS = 14;

export default async function DashboardPage() {
  const since = new Date();
  since.setDate(since.getDate() - (ACTIVITY_DAYS - 1));
  since.setHours(0, 0, 0, 0);

  const [draftCount, publishedCount, categoryCount, recentArticles, topCategories, allCategories, articleCounts, revisionDates, articleCreateDates] =
    await Promise.all([
      prisma.article.count({ where: { status: "DRAFT" } }),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.category.count(),
      prisma.article.findMany({ orderBy: { updatedAt: "desc" }, take: 5, include: { category: true } }),
      prisma.category.findMany({ where: { parentId: null }, select: { id: true, name: true, fullSlugPath: true } }),
      prisma.category.findMany({ select: { id: true, fullSlugPath: true } }),
      prisma.article.groupBy({ by: ["categoryId"], _count: true }),
      prisma.articleRevision.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.article.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);

  // Top-level category breakdown: every article whose category's
  // fullSlugPath falls under a top-level category's path counts toward it,
  // not just articles directly in that top-level category.
  const countByCategoryId = new Map(articleCounts.map((c) => [c.categoryId, c._count]));
  const pathById = new Map(allCategories.map((c) => [c.id, c.fullSlugPath]));
  const categoryBreakdown = topCategories.map((top) => {
    let count = 0;
    for (const [categoryId, n] of countByCategoryId) {
      const path = pathById.get(categoryId);
      if (path && (path === top.fullSlugPath || path.startsWith(`${top.fullSlugPath}/`))) count += n;
    }
    return { name: top.name, count };
  });

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const activityByDay = new Map<string, number>();
  for (let i = 0; i < ACTIVITY_DAYS; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    activityByDay.set(dayKey(d), 0);
  }
  for (const { createdAt } of [...revisionDates, ...articleCreateDates]) {
    const key = dayKey(createdAt);
    activityByDay.set(key, (activityByDay.get(key) ?? 0) + 1);
  }
  const activity = Array.from(activityByDay, ([date, count]) => ({ date, count }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          An overview of MachNotes.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Drafts" value={draftCount} delay={0} />
        <StatCard label="Published" value={publishedCount} delay={60} />
        <StatCard label="Categories" value={categoryCount} delay={120} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Articles by category
          </h2>
          <div className="mt-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <CategoryBreakdownChart data={categoryBreakdown} />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Edit activity, last {ACTIVITY_DAYS} days
          </h2>
          <div className="mt-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <ActivityChart data={activity} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Recent activity
        </h2>
        <div className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {recentArticles.length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-500 dark:text-neutral-400">
              No articles yet.{" "}
              <Link href="/posts/new" className="underline">
                Write your first one
              </Link>
              .
            </p>
          )}
          {recentArticles.map((article, i) => (
            <Link
              key={article.id}
              href={`/posts/${article.id}`}
              className="animate-fade-in-up flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-50">
                  {article.title || "Untitled"}
                </p>
                <p className="text-neutral-500 dark:text-neutral-400">{article.category.name}</p>
              </div>
              <StatusBadge status={article.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div
      className="animate-fade-in-up rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</p>
    </div>
  );
}
