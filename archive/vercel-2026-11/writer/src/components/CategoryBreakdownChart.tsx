// Horizontal bar chart, single hue (magnitude only — no categorical color
// to validate since every bar is the same series). Native <title> gives a
// zero-JS hover tooltip, appropriate for a lightweight internal dashboard.
export function CategoryBreakdownChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-400">No categories yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const rowHeight = 28;
  const barMaxWidth = 100; // percent

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3" style={{ height: rowHeight }}>
          <span className="w-32 shrink-0 truncate text-xs text-neutral-600 dark:text-neutral-300" title={d.name}>
            {d.name}
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${(d.count / max) * barMaxWidth}%` }}
              title={`${d.name}: ${d.count}`}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs text-neutral-500 dark:text-neutral-400">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
