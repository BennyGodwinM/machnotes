// Its own module (not exported from a page) so client components can
// import it without dragging that page's server-only code (prisma, etc.)
// into the client bundle — see PostsList.tsx.
export function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  const isPublished = status === "PUBLISHED";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isPublished
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
