import { MindMap } from "@/components/MindMap";

export default function MindMapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Mind Map</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Categories, articles, and cited resources at a glance. Blue = category, green = article,
          amber = resource — bigger circles have more connections. Drag to reposition, hover to
          see a node&rsquo;s connections, click to open it.
        </p>
      </div>
      <MindMap />
    </div>
  );
}
