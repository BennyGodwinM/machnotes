<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, type SimulationNodeDatum } from 'd3-force'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom'

const { data } = await useFetch('/api/mindmap')
const router = useRouter()

type NodeKind = 'root' | 'category' | 'article'

type GraphNode = SimulationNodeDatum & {
  id: string
  label: string
  kind: NodeKind
  r: number
  slug?: string
  depth: number // hops from the root — drives the radial layout
}

type GraphLink = { source: string | GraphNode, target: string | GraphNode }

const COLOR: Record<NodeKind, string> = { root: '#ffffff', category: '#3b82f6', article: '#10b981' }
const BASE_RADIUS: Record<NodeKind, number> = { root: 16, category: 10, article: 7 }
const DRAG_THRESHOLD = 4 // px of movement before a pointerdown counts as a drag, not a click
const ROOT_ID = 'root'
const ROOT_LABEL = 'Mach Notes'

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

function buildGraph(): { nodes: GraphNode[], links: GraphLink[] } {
  if (!data.value) return { nodes: [], links: [] }
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  const categoryById = new Map(data.value.categories.map(c => [c.id, c]))
  const childrenOf = new Map<string, string[]>()
  for (const c of data.value.categories) {
    if (!c.parentId) continue
    if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, [])
    childrenOf.get(c.parentId)!.push(c.id)
  }
  const directArticleCategoryIds = new Set(data.value.articles.map(a => a.categoryId))

  // A category (and its whole ancestor chain) only earns a place on the map
  // once it actually holds a published post — otherwise the full taxonomy
  // would clutter the graph with empty branches. An ancestor is always
  // visible whenever a visible descendant is, since "has content" is an OR
  // over the whole subtree.
  const hasContentCache = new Map<string, boolean>()
  function hasContent(categoryId: string): boolean {
    const cached = hasContentCache.get(categoryId)
    if (cached !== undefined) return cached
    hasContentCache.set(categoryId, false) // cycle guard
    const result = directArticleCategoryIds.has(categoryId) || (childrenOf.get(categoryId) ?? []).some(hasContent)
    hasContentCache.set(categoryId, result)
    return result
  }

  const depthCache = new Map<string, number>()
  function categoryDepth(categoryId: string): number {
    const cached = depthCache.get(categoryId)
    if (cached !== undefined) return cached
    const category = categoryById.get(categoryId)
    const result = category?.parentId ? categoryDepth(category.parentId) + 1 : 1
    depthCache.set(categoryId, result)
    return result
  }

  nodes.push({ id: ROOT_ID, label: ROOT_LABEL, kind: 'root', r: BASE_RADIUS.root, depth: 0 })

  const visibleCategoryIds = new Set<string>()
  for (const c of data.value.categories) {
    if (!hasContent(c.id)) continue
    visibleCategoryIds.add(c.id)
    nodes.push({ id: `cat-${c.id}`, label: c.name, kind: 'category', r: BASE_RADIUS.category, depth: categoryDepth(c.id) })
    links.push({ source: c.parentId ? `cat-${c.parentId}` : ROOT_ID, target: `cat-${c.id}` })
  }
  for (const a of data.value.articles) {
    if (!visibleCategoryIds.has(a.categoryId)) continue
    nodes.push({ id: `art-${a.id}`, label: a.title, kind: 'article', r: BASE_RADIUS.article, slug: a.slug, depth: categoryDepth(a.categoryId) + 1 })
    links.push({ source: `cat-${a.categoryId}`, target: `art-${a.id}` })
  }
  return { nodes, links }
}

let teardown: (() => void) | null = null

// Obsidian-style force-directed graph: circular nodes sized by connection
// count, physics-settled layout (replaces the old fixed grid-by-array-index
// positions), drag to reposition, hover to highlight a node's neighborhood,
// click to open an article. Rendered on canvas rather than DOM nodes/SVG.
function setup() {
  teardown?.()
  teardown = null

  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const { nodes, links } = buildGraph()
  if (nodes.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const degree = new Map<string, number>()
  for (const l of links) {
    const s = typeof l.source === 'string' ? l.source : l.source.id
    const t = typeof l.target === 'string' ? l.target : l.target.id
    degree.set(s, (degree.get(s) ?? 0) + 1)
    degree.set(t, (degree.get(t) ?? 0) + 1)
  }
  for (const n of nodes) {
    n.r = BASE_RADIUS[n.kind] + Math.min(degree.get(n.id) ?? 0, 10) * 1.1
  }

  // Anchors the whole layout: fx/fy locks the root at the viewport center
  // instead of leaving it to drift with the rest of the simulation, so
  // every top-level category radiates outward from one fixed hub rather
  // than the graph settling wherever charge/link forces happen to balance.
  const root = nodes.find(n => n.id === ROOT_ID)
  if (root) {
    root.fx = container.clientWidth / 2
    root.fy = container.clientHeight / 2
  }

  const neighbors = new Map<string, Set<string>>()
  for (const n of nodes) neighbors.set(n.id, new Set([n.id]))
  for (const l of links) {
    const s = typeof l.source === 'string' ? l.source : l.source.id
    const t = typeof l.target === 'string' ? l.target : l.target.id
    neighbors.get(s)?.add(t)
    neighbors.get(t)?.add(s)
  }

  let width = container.clientWidth
  let height = container.clientHeight
  let transform: ZoomTransform = zoomIdentity
  let hoveredId: string | null = null
  let draggingNode: GraphNode | null = null
  let pointerDownAt: { x: number, y: number } | null = null
  let moved = false

  function resize() {
    if (!canvas || !container) return
    width = container.clientWidth
    height = container.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx?.scale(dpr, dpr)
  }
  resize()
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  // Radial layout: each node settles into a ring sized by its distance from
  // the root (categories, then articles), which is what makes a large graph
  // read as an organic mind map rather than a tangled blob — forceCenter
  // alone just pulls everything toward one point with no sense of
  // hierarchy. The root's own fx/fy pin (set above) anchors the ring system.
  const RING_SPACING = 85
  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(32)
        .strength(0.5)
    )
    .force('charge', forceManyBody().strength(-140))
    .force(
      'radial',
      forceRadial<GraphNode>(d => d.depth * RING_SPACING, width / 2, height / 2).strength(0.7)
    )
    .force(
      'collide',
      forceCollide<GraphNode>(d => d.r + 8)
    )
    .on('tick', draw)

  function draw() {
    if (!ctx) return
    ctx.save()
    ctx.clearRect(0, 0, width, height)
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    const highlightSet = hoveredId ? neighbors.get(hoveredId) : null

    for (const l of links) {
      const s = l.source as GraphNode
      const t = l.target as GraphNode
      if (s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) continue
      const dimmed = highlightSet ? !(highlightSet.has(s.id) && highlightSet.has(t.id)) : false
      ctx.strokeStyle = dimmed ? 'rgba(127,127,127,0.12)' : 'rgba(127,127,127,0.45)'
      ctx.lineWidth = 1 / transform.k
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(t.x, t.y)
      ctx.stroke()
    }

    for (const n of nodes) {
      if (n.x === undefined || n.y === undefined) continue
      const dimmed = highlightSet ? !highlightSet.has(n.id) : false
      const isHovered = n.id === hoveredId
      ctx.globalAlpha = dimmed ? 0.25 : 1
      ctx.fillStyle = COLOR[n.kind]
      ctx.beginPath()
      ctx.arc(n.x, n.y, isHovered ? n.r + 2 : n.r, 0, Math.PI * 2)
      ctx.fill()
      if (isHovered) {
        ctx.lineWidth = 2 / transform.k
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      const showLabel = n.kind === 'root' || n.kind === 'category' || isHovered || transform.k > 1.4
      if (showLabel) {
        const isRoot = n.kind === 'root'
        const size = isRoot ? 14 : 11
        ctx.font = `${isRoot || isHovered ? '600 ' : ''}${size / transform.k}px sans-serif`
        ctx.fillStyle = dimmed ? 'rgba(160,160,160,0.5)' : 'rgba(220,220,220,0.95)'
        ctx.fillText(n.label, n.x + n.r + 4, n.y + 3)
      }
    }

    ctx.restore()
  }

  function toWorld(clientX: number, clientY: number) {
    const rect = canvas!.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    return transform.invert([x, y])
  }

  function hitTest(wx: number, wy: number): GraphNode | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      if (!n || n.x === undefined || n.y === undefined) continue
      const dx = n.x - wx
      const dy = n.y - wy
      if (dx * dx + dy * dy <= (n.r + 3) * (n.r + 3)) return n
    }
    return null
  }

  const d3canvas = select(canvas)

  // d3-zoom handles wheel/dblclick zoom only — panning and node dragging
  // are both done by hand below (via Pointer Events) and routed through
  // zoomBehavior.transform so d3-zoom's own internal transform stays
  // authoritative and wheel-zoom doesn't jump after a manual pan.
  const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
    .scaleExtent([0.2, 4])
    .filter(event => event.type === 'wheel' || event.type === 'dblclick')
    .on('zoom', (event) => {
      transform = event.transform
      draw()
    })

  d3canvas.call(zoomBehavior)

  let panStart: { sx: number, sy: number, tx: number, ty: number, k: number } | null = null

  function onPointerDown(event: PointerEvent) {
    const [wx, wy] = toWorld(event.clientX, event.clientY)
    const node = hitTest(wx, wy)
    pointerDownAt = { x: event.clientX, y: event.clientY }
    moved = false
    canvas!.setPointerCapture(event.pointerId)
    if (node) {
      draggingNode = node
      node.fx = node.x
      node.fy = node.y
      hoveredId = node.id
      simulation.alphaTarget(0.3).restart()
    } else {
      panStart = { sx: event.clientX, sy: event.clientY, tx: transform.x, ty: transform.y, k: transform.k }
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerDownAt) {
      const dx = event.clientX - pointerDownAt.x
      const dy = event.clientY - pointerDownAt.y
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) moved = true
    }

    if (draggingNode) {
      const [wx, wy] = toWorld(event.clientX, event.clientY)
      draggingNode.fx = wx
      draggingNode.fy = wy
      return
    }

    if (panStart) {
      const dx = event.clientX - panStart.sx
      const dy = event.clientY - panStart.sy
      d3canvas.call(zoomBehavior.transform, zoomIdentity.translate(panStart.tx + dx, panStart.ty + dy).scale(panStart.k))
      return
    }

    const [wx, wy] = toWorld(event.clientX, event.clientY)
    const node = hitTest(wx, wy)
    const nextHovered = node?.id ?? null
    if (nextHovered !== hoveredId) {
      hoveredId = nextHovered
      canvas!.style.cursor = node ? 'pointer' : 'grab'
      draw()
    }
  }

  function onPointerUp(event: PointerEvent) {
    canvas!.releasePointerCapture(event.pointerId)
    if (draggingNode) {
      simulation.alphaTarget(0)
      const node = draggingNode
      draggingNode = null
      if (!moved) {
        // The root stays pinned at center even on a plain click — only an
        // actual drag (handled below) is allowed to move it.
        if (node.id !== ROOT_ID) {
          node.fx = null
          node.fy = null
        }
        navigate(node)
      } else {
        const [wx, wy] = toWorld(event.clientX, event.clientY)
        hoveredId = hitTest(wx, wy)?.id ?? null
        draw()
      }
    }
    panStart = null
    pointerDownAt = null
  }

  function navigate(node: GraphNode) {
    if (node.kind === 'article' && node.slug) router.push(`/article/${node.slug}`)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.style.cursor = 'grab'

  teardown = () => {
    simulation.stop()
    resizeObserver.disconnect()
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    d3canvas.on('.zoom', null)
  }
}

onMounted(setup)
watch(data, setup)
onBeforeUnmount(() => teardown?.())
</script>

<template>
  <UContainer class="py-8">
    <h1 class="text-xl font-semibold">
      Mind Map
    </h1>
    <p class="mt-1 text-sm text-muted">
      Blue = category, green = article — bigger circles have more connections. Drag to reposition,
      hover to see a node's connections, click an article to open it.
    </p>
    <div
      ref="containerRef"
      class="relative mt-6 h-[70vh] overflow-hidden rounded-lg border border-default bg-black"
    >
      <canvas ref="canvasRef" />
    </div>
  </UContainer>
</template>
