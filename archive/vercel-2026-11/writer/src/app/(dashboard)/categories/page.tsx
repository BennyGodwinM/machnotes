import { getCategoryTree } from "@/lib/categories";
import { CategoryTreeManager } from "@/components/CategoryTreeManager";

export default async function CategoriesPage() {
  const tree = await getCategoryTree();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Categories</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Organize articles into a nested topic tree.
        </p>
      </div>
      <CategoryTreeManager tree={tree} />
    </div>
  );
}
