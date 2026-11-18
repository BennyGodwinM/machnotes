// Simple bar chart of edits per day over the trailing window. Single
// series (edit count), so one hue throughout — no legend needed per the
// dataviz guidance (a single series needs no legend box, the title names it).
export function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 600;
  const height = 120;
  const barGap = 3;
  const barWidth = (width - barGap * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barHeight = Math.max((d.count / max) * (height - 20), d.count > 0 ? 3 : 0);
        const x = i * (barWidth + barGap);
        const y = height - 20 - barHeight;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={2} className="fill-green-500">
              <title>{`${d.date}: ${d.count} edit${d.count === 1 ? "" : "s"}`}</title>
            </rect>
            {i % Math.ceil(data.length / 7) === 0 && (
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                className="fill-neutral-400 text-[8px]"
              >
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
