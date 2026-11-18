"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryNode } from "@/lib/categories";

function findSiblings(nodes: CategoryNode[], id: string): CategoryNode[] | null {
  if (nodes.some((n) => n.id === id)) return nodes;
  for (const n of nodes) {
    const found = findSiblings(n.children, id);
    if (found) return found;
  }
  return null;
}

function allParentIds(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((n) => (n.children.length > 0 ? [n.id, ...allParentIds(n.children)] : []));
}

export function CategoryTreeManager({ tree }: { tree: CategoryNode[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  // Starts fully collapsed — with 200+ categories possible, rendering every
  // row expanded by default would make the page unusable.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createCategory(name: string, parentId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create category");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function addTopLevel(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCategory(newName, null);
    setNewName("");
  }

  async function addChild(parentId: string, parentName: string) {
    const name = window.prompt(`New subcategory under "${parentName}"`);
    if (!name?.trim()) return;
    await createCategory(name, parentId);
    setExpanded((prev) => new Set(prev).add(parentId));
  }

  async function rename(id: string, currentName: string) {
    const name = window.prompt("Rename category", currentName);
    if (!name || name.trim() === currentName) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rename category");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category? It must have no subcategories or posts.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete category");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const siblings = findSiblings(tree, draggedId);
    const targetSiblings = findSiblings(tree, targetId);
    // Only reordering within the same parent is supported — reparenting
    // already has an explicit "+ Add sub" flow.
    if (!siblings || siblings !== targetSiblings) return;

    const ids = siblings.map((s) => s.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updates = reordered.map((node, i) => ({ id: node.id, order: i }));

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addTopLevel} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="New top-level category"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Add
        </button>
        <span className="text-xs text-neutral-400">
          Use the + next to any category below to add a subcategory under it — nesting has no depth
          limit. Drag a row to reorder it among its siblings.
        </span>
      </form>

      {tree.length > 0 && (
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setExpanded(new Set(allParentIds(tree)))}
            className="text-neutral-500 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpanded(new Set())}
            className="text-neutral-500 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
          >
            Collapse all
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        {tree.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500 dark:text-neutral-400">
            No categories yet. Add your first one above.
          </p>
        ) : (
          <CategoryRows
            nodes={tree}
            busy={busy}
            onAddChild={addChild}
            onRename={rename}
            onRemove={remove}
            expanded={expanded}
            onToggle={toggle}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            onDragStart={setDraggingId}
            onDragOverNode={setDropTargetId}
            onDrop={(targetId) => {
              if (draggingId) reorder(draggingId, targetId);
              setDraggingId(null);
              setDropTargetId(null);
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTargetId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CategoryRows({
  nodes,
  depth = 0,
  busy,
  onAddChild,
  onRename,
  onRemove,
  expanded,
  onToggle,
  draggingId,
  dropTargetId,
  onDragStart,
  onDragOverNode,
  onDrop,
  onDragEnd,
}: {
  nodes: CategoryNode[];
  depth?: number;
  busy: boolean;
  onAddChild: (parentId: string, parentName: string) => void;
  onRename: (id: string, currentName: string) => void;
  onRemove: (id: string) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  draggingId: string | null;
  dropTargetId: string | null;
  onDragStart: (id: string) => void;
  onDragOverNode: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              onDragStart(node.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOverNode(node.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(node.id);
            }}
            onDragEnd={onDragEnd}
            className={`animate-fade-in-up flex cursor-grab items-center justify-between gap-4 border-t border-neutral-200 px-4 py-2.5 text-sm first:border-t-0 active:cursor-grabbing dark:border-neutral-800 ${
              draggingId === node.id ? "opacity-40" : ""
            } ${dropTargetId === node.id && draggingId !== node.id ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
            style={{ animationDelay: `${depth * 30}ms` }}
          >
            <div className="flex min-w-0 items-center gap-2" style={{ marginLeft: depth > 0 ? `${depth * 1.25}rem` : 0 }}>
              <span className="text-neutral-300 select-none dark:text-neutral-700">⠿</span>
              {depth > 0 && <span className="text-neutral-300 dark:text-neutral-700">└</span>}
              {node.children.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  className="shrink-0 rounded px-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                  aria-label={expanded.has(node.id) ? "Collapse" : "Expand"}
                >
                  {expanded.has(node.id) ? "▾" : "▸"}
                </button>
              ) : (
                <span className="inline-block w-3 shrink-0" />
              )}
              <span className="truncate text-neutral-900 dark:text-neutral-50">{node.name}</span>
              {node.children.length > 0 && (
                <span className="shrink-0 text-xs text-neutral-400">({node.children.length})</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => onAddChild(node.id, node.name)}
                disabled={busy}
                title="Add subcategory"
                className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                + Add sub
              </button>
              <button
                onClick={() => onRename(node.id, node.name)}
                disabled={busy}
                className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Rename
              </button>
              <button
                onClick={() => onRemove(node.id)}
                disabled={busy}
                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Delete
              </button>
            </div>
          </div>
          {node.children.length > 0 && expanded.has(node.id) && (
            <CategoryRows
              nodes={node.children}
              depth={depth + 1}
              busy={busy}
              onAddChild={onAddChild}
              onRename={onRename}
              onRemove={onRemove}
              expanded={expanded}
              onToggle={onToggle}
              draggingId={draggingId}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragOverNode={onDragOverNode}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          )}
        </div>
      ))}
    </>
  );
}
