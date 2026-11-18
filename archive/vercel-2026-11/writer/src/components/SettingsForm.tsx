"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsForm({
  initial,
}: {
  initial: { siteTitle: string; siteDescription: string };
}) {
  const router = useRouter();
  const [siteTitle, setSiteTitle] = useState(initial.siteTitle);
  const [siteDescription, setSiteDescription] = useState(initial.siteDescription);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteTitle, siteDescription }),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Site title
        </label>
        <input
          type="text"
          value={siteTitle}
          onChange={(e) => setSiteTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Site description
        </label>
        <textarea
          value={siteDescription}
          onChange={(e) => setSiteDescription(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {busy ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-neutral-500 dark:text-neutral-400">Saved.</span>}
      </div>
    </form>
  );
}
