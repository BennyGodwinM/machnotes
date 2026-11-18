import Link from "next/link";
import { getCategoryTree, flattenTree } from "@/lib/categories";
import { ArticleForm } from "@/components/ArticleForm";

export default async function NewPostPage() {
  const categories = flattenTree(await getCategoryTree());

  if (categories.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">New post</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          You need at least one category before writing a post.{" "}
          <Link href="/categories" className="underline">
            Create one
          </Link>
          .
        </p>
      </div>
    );
  }

  return <ArticleForm categories={categories} />;
}
