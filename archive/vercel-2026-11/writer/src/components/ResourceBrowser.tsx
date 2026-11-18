"use client";

import { useState } from "react";
import { ResourcePanel } from "@/components/ResourcePanel";

type CategoryOption = { id: string; label: string; depth: number };

export function ResourceBrowser({ categories }: { categories: CategoryOption[] }) {
  const [categoryId, setCategoryId] = useState<string>("");

  return (
    <div className="space-y-4">
      <label className="text-sm text-neutral-600 dark:text-neutral-300">
        Category
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="ml-2 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        >
          <option value="">Unfiled (not attached to a category)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {"  ".repeat(c.depth)}
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {categoryId ? (
        <ResourcePanel key={categoryId} categoryId={categoryId} />
      ) : (
        <ResourcePanel key="unfiled" />
      )}
    </div>
  );
}
