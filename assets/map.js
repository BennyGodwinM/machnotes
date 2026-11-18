// Topic map: a radial, force-directed graph of topics and notes on canvas.
// Ported from the original Nuxt mindmap page. Drag nodes, scroll to zoom,
// drag the background to pan, click a note to open it.
import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation } from "https://cdn.jsdelivr.net/npm/d3-force@3/+esm";
import { select } from "https://cdn.jsdelivr.net/npm/d3-selection@3/+esm";
import { zoom, zoomIdentity } from "https://cdn.jsdelivr.net/npm/d3-zoom@3/+esm";

const data = JSON.parse(document.getElementById("mn-graph").textContent);
const canvas = document.getElementById("mn-map");
const ctx = canvas.getContext("2d");
const css = getComputedStyle(document.documentElement);
const COLOR = { root: "#ffffff", category: css.getPropertyValue("--mn-blue").trim(), article: css.getPropertyValue("--mn-green").trim() };
const BASE_R = { root: 16, category: 9, article: 7 };
const RING = 85;

// The build only includes topics that contain notes, so every node here has content.
let teardown = null;

function build() {
  const nodes = [{ id: "root", label: "MachNotes", kind: "root", depth: 0 }];
  const links = [];
  const depth = new Map();
  const byId = new Map(data.categories.map((c) => [c.id, c]));
  const d = (id) => depth.get(id) ?? (depth.set(id, byId.get(id).parent ? d(byId.get(id).parent) + 1 : 1), depth.get(id));
  for (const c of data.categories) {
    nodes.push({ id: `c:${c.id}`, label: c.name, kind: "category", depth: d(c.id) });
    links.push({ source: c.parent ? `c:${c.parent}` : "root", target: `c:${c.id}` });
  }
  for (const a of data.articles) {
    nodes.push({ id: `a:${a.id}`, label: a.title, kind: "article", url: a.url, depth: d(a.category) + 1 });
    links.push({ source: `c:${a.category}`, target: `a:${a.id}` });
  }
  return { nodes, links };
}

function setup() {
  teardown?.();
  const { nodes, links } = build();
  const parent = canvas.parentElement;
  let width = parent.clientWidth, height = parent.clientHeight;
  let transform = zoomIdentity, hovered = null, dragging = null, downAt = null, moved = false, pan = null;

  const degree = new Map();
  const neighbors = new Map(nodes.map((n) => [n.id, new Set([n.id])]));
  for (const l of links) {
    for (const k of [l.source, l.target]) degree.set(k, (degree.get(k) ?? 0) + 1);
    neighbors.get(l.source)?.add(l.target);
    neighbors.get(l.target)?.add(l.source);
  }
  for (const n of nodes) n.r = BASE_R[n.kind] + Math.min(degree.get(n.id) ?? 0, 10) * (n.kind === "category" ? 0.6 : 1.1);
  nodes[0].fx = width / 2;
  nodes[0].fy = height / 2;

  const resize = () => {
    width = parent.clientWidth; height = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };

  const sim = forceSimulation(nodes)
    .force("link", forceLink(links).id((n) => n.id).distance(28).strength(0.6))
    .force("charge", forceManyBody().strength(-90))
    .force("radial", forceRadial((n) => n.depth * RING, width / 2, height / 2).strength(0.8))
    .force("collide", forceCollide((n) => n.r + 6))
    .on("tick", draw);

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    const hi = hovered ? neighbors.get(hovered) : null;
    for (const l of links) {
      const s = l.source, t = l.target;
      if (s.x == null || t.x == null) continue;
      ctx.strokeStyle = hi && !(hi.has(s.id) && hi.has(t.id)) ? "rgba(127,127,127,0.1)" : "rgba(127,127,127,0.4)";
      ctx.lineWidth = 1 / transform.k;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    }
    for (const n of nodes) {
      if (n.x == null) continue;
      const dim = hi ? !hi.has(n.id) : false;
      const isHover = n.id === hovered;
      ctx.globalAlpha = dim ? 0.2 : 1;
      ctx.fillStyle = COLOR[n.kind];
      ctx.beginPath(); ctx.arc(n.x, n.y, isHover ? n.r + 2 : n.r, 0, Math.PI * 2); ctx.fill();
      if (isHover) { ctx.lineWidth = 2 / transform.k; ctx.strokeStyle = "#fff"; ctx.stroke(); }
      const label = n.kind === "root" || (n.kind === "category" && n.depth <= 1) || isHover || transform.k > 1.4 || (hi && hi.has(n.id));
      if (label) {
        const size = n.kind === "root" ? 14 : 11;
        ctx.globalAlpha = dim ? 0.35 : 1;
        ctx.font = `${n.kind === "root" || isHover ? "600 " : ""}${size / transform.k}px "Public Sans", sans-serif`;
        ctx.fillStyle = "rgba(226,232,240,0.95)";
        ctx.fillText(n.label, n.x + n.r + 4, n.y + 3);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  const world = (e) => { const r = canvas.getBoundingClientRect(); return transform.invert([e.clientX - r.left, e.clientY - r.top]); };
  const hit = ([x, y]) => { for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes.at(i); if (n.x != null && (n.x - x) ** 2 + (n.y - y) ** 2 <= (n.r + 3) ** 2) return n; } return null; };

  const zoomer = zoom().scaleExtent([0.2, 4]).filter((e) => e.type === "wheel" || e.type === "dblclick").on("zoom", (e) => { transform = e.transform; draw(); });
  const sel = select(canvas).call(zoomer);

  const down = (e) => {
    const n = hit(world(e));
    downAt = { x: e.clientX, y: e.clientY }; moved = false;
    canvas.setPointerCapture(e.pointerId);
    if (n) { dragging = n; n.fx = n.x; n.fy = n.y; sim.alphaTarget(0.3).restart(); }
    else pan = { sx: e.clientX, sy: e.clientY, tx: transform.x, ty: transform.y, k: transform.k };
  };
  const move = (e) => {
    if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) moved = true;
    if (dragging) { const [x, y] = world(e); dragging.fx = x; dragging.fy = y; return; }
    if (pan) { sel.call(zoomer.transform, zoomIdentity.translate(pan.tx + e.clientX - pan.sx, pan.ty + e.clientY - pan.sy).scale(pan.k)); return; }
    const n = hit(world(e));
    if ((n?.id ?? null) !== hovered) { hovered = n?.id ?? null; canvas.style.cursor = n ? "pointer" : "grab"; draw(); }
  };
  const up = (e) => {
    canvas.releasePointerCapture(e.pointerId);
    if (dragging) {
      sim.alphaTarget(0);
      const n = dragging; dragging = null;
      if (n.kind !== "root") { n.fx = null; n.fy = null; }
      if (!moved && n.url) window.location.href = n.url;
    }
    pan = null; downAt = null;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  const ro = new ResizeObserver(resize); ro.observe(parent);
  resize();

  teardown = () => { sim.stop(); ro.disconnect(); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); };
}

setup();
