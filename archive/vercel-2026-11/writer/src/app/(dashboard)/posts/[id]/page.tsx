import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCategoryTree, flattenTree } from "@/lib/categories";
import { ArticleForm } from "@/components/ArticleForm";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, categoryTree] = await Promise.all([
    prisma.article.findUnique({ where: { id } }),
    getCategoryTree(),
  ]);
  const categories = flattenTree(categoryTree);

  if (!article) notFound();

  return (
    <ArticleForm
      categories={categories}
      initial={{
        id: article.id,
        title: article.title,
        typstSource: article.typstSource,
        excerpt: article.excerpt,
        categoryId: article.categoryId,
        status: article.status,
        slug: article.slug,
      }}
    />
  );
}
