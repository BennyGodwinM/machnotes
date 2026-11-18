import { getCategoryTree, flattenTree } from "@/lib/categories";
import { ResourceBrowser } from "@/components/ResourceBrowser";

export default async function ResourcesPage() {
  const categories = flattenTree(await getCategoryTree());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Resources</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Private research notes and links &mdash; organized by category, never published. Per-post
          resources live on each post&apos;s edit page.
        </p>
      </div>
      <ResourceBrowser categories={categories} />
    </div>
  );
}
