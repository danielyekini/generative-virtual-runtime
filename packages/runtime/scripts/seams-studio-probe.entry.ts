/**
 * Studio probe for space.planarSeams: compile the spatial-seams sample, evaluate
 * through AnimationRuntime (projection + seams), render with the production
 * CanvasRenderer, and compare pixels with the analytic nearest-surface oracle.
 */
import { compileMotionScript } from "@gvr/compiler";
import {
  AnimationRuntime,
  buildResolvedFrame,
  layersFromScene,
  projectSpatialFrame,
  sampleScene,
  unprojectToSurface,
  type SpatialProjection,
} from "@gvr/runtime";
import { CanvasRenderer } from "@gvr/canvas-renderer";
import type { SceneIR } from "@gvr/schema";
import source from "../../../fixtures/motionscript/spatial-seams.ms";

const compiled = compileMotionScript(source);
if (!compiled.ok || !compiled.scene) throw new Error(JSON.stringify(compiled.diagnostics));
const seamed: SceneIR = compiled.scene;
// Same scene without the seams block: the E010 report-only painter.
const plain: SceneIR = {
  ...seamed,
  requiredCapabilities: (seamed.requiredCapabilities ?? []).filter((name) => name !== "space.planarSeams"),
  spatialLayers: seamed.spatialLayers!.map(({ seams: _seams, ...layer }) => layer),
};

const rect = (w: number, h: number) => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
const panels: Record<string, { outline: { x: number; y: number }[]; rgb: number[] }> = {
  Red: { outline: rect(200, 140), rgb: [0xd6, 0x45, 0x45] },
  Blue: { outline: rect(200, 140), rgb: [0x3d, 0x6b, 0xd6] },
};

function inside(poly: { x: number; y: number }[], p: { x: number; y: number }): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i]!, b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

function nearest(projection: SpatialProjection, p: { x: number; y: number }): string | undefined {
  const hits: { id: string; depth: number }[] = [];
  for (const [id, panel] of Object.entries(panels)) {
    const hit = unprojectToSurface(projection, id, p);
    if (!hit) continue;
    const ring = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => inside(panel.outline, { x: hit.local.x + dx!, y: hit.local.y + dy! }));
    if (ring.some((v) => v !== inside(panel.outline, hit.local))) return undefined;
    if (!inside(panel.outline, hit.local)) continue;
    const s = projection.surfaces.get(id)!;
    const v = [0, 1, 2].map((k) => {
      const axis = (["x", "y", "z"] as const)[k]!;
      return s.origin[axis] + hit.plane.x * s.tx[axis] + hit.plane.y * s.ty[axis];
    });
    hits.push({ id, depth: Math.hypot(v[0]!, v[1]!, v[2]!) });
  }
  if (hits.length === 0) return undefined;
  hits.sort((a, b) => a.depth - b.depth);
  if (hits.length > 1 && hits[1]!.depth - hits[0]!.depth < 1) return undefined;
  return hits[0]!.id;
}

const out: unknown[] = [];
for (const [name, scene, t] of [["seams-split", seamed, 0], ["seams-unsplit", plain, 0], ["seams-drift", seamed, 2000]] as const) {
  const runtime = new AnimationRuntime(scene);
  const frame = runtime.evaluate(t);
  const layout = buildResolvedFrame(scene, sampleScene(scene, t), t);
  const projection = projectSpatialFrame(layout, layersFromScene(scene));
  const canvas = document.createElement("canvas");
  canvas.id = name;
  canvas.style.width = "640px";
  canvas.style.height = "360px";
  canvas.style.display = "block";
  document.body.appendChild(canvas);
  const renderer = new CanvasRenderer(canvas);
  renderer.resize(640, 360, 1);
  renderer.render(frame);
  const ctx = canvas.getContext("2d")!;
  let checked = 0, wrong = 0;
  const misses: unknown[] = [];
  for (let x = 0; x < 640; x += 4) {
    for (let y = 0; y < 360; y += 4) {
      const want = nearest(projection, { x, y });
      if (!want) continue;
      checked += 1;
      const px = Array.from(ctx.getImageData(x, y, 1, 1).data);
      const rgb = panels[want]!.rgb;
      if (rgb.some((c, k) => Math.abs(c - px[k]!) > 3)) {
        wrong += 1;
        if (misses.length < 8) misses.push({ x, y, want, px });
      }
    }
  }
  out.push({
    name,
    t,
    order: frame.drawItems.map((item) => item.nodeId),
    diagnostics: runtime.lastDiagnostics.map((d) => d.message),
    oracle: { checked, wrong, misses },
  });
}
(window as unknown as { __seamsStudio: unknown }).__seamsStudio = out;
