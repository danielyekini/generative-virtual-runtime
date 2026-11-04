// E054 evidence: which story nodes move along keyed position (not a path
// attachment), and how many of those hand-author rotation that faces travel?
// Run from repo root: node --import tsx <this file> fixtures/motionscript/stories
import { readFileSync, readdirSync } from "node:fs";
import { compileMotionScript } from "../../../../packages/compiler/src/index.ts";
import { sampleScene } from "../../../../packages/runtime/src/sample.ts";

const dir = process.argv[2] ?? "fixtures/motionscript/stories";
const SAMPLES = 240;
const flat = (nodes: any[], out: any[] = []) => { for (const n of nodes) { out.push(n); if (n.children) flat(n.children, out); } return out; };
const wrap = (d: number) => ((d + 540) % 360) - 180;
let movers = 0, rotatedMovers = 0, facing = 0, attached = 0, flips = 0;
const lines: string[] = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".ms")).sort()) {
  const r = compileMotionScript(readFileSync(`${dir}/${f}`, "utf8"));
  if (!r.scene) { lines.push(`${f}\tCOMPILE_FAIL`); continue; }
  const scene = r.scene as any;
  attached += (scene.pathAttachments ?? []).length;
  const ch = new Map<string, Set<string>>();
  for (const t of scene.timeline.tracks) if (t.target.kind === "node") (ch.get(t.target.nodeId) ?? ch.set(t.target.nodeId, new Set()).get(t.target.nodeId)!).add(t.target.channel);
  const dur = scene.durationMs ?? scene.timeline.durationMs ?? 10000;
  const poses: Map<string, { x: number; y: number; r: number }>[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const s = sampleScene(scene, (dur * i) / SAMPLES);
    poses.push(new Map(flat(s.nodes).map((n: any) => [n.id, { x: n.transform.position.x, y: n.transform.position.y, r: n.transform.rotation }])));
  }
  const rows: string[] = [];
  for (const [id, set] of ch) {
    const moves = [...set].some((c) => c.startsWith("transform.position"));
    const xy = set.has("transform.position") || (set.has("transform.position.x") && set.has("transform.position.y"));
    if (!moves || !xy) continue; // 1-D slides cannot need facing
    movers++;
    const rot = set.has("transform.rotation");
    if (rot) rotatedMovers++;
    const flip = set.has("transform.scale.x") || set.has("transform.scale");
    if (flip) flips++;
    // heading vs rotation over moving samples, best constant offset
    const pairs: [number, number][] = [];
    for (let i = 1; i <= SAMPLES; i++) {
      const a = poses[i - 1].get(id), b = poses[i].get(id); if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y; if (Math.hypot(dx, dy) < 0.5) continue;
      pairs.push([(Math.atan2(dy, dx) * 180) / Math.PI, (a.r + b.r) / 2]);
    }
    if (!pairs.length) continue;
    const headings = new Set(pairs.map(([h]) => Math.round(h / 5)));
    let best = Infinity;
    for (let off = -180; off < 180; off += 1) {
      const errs = pairs.map(([h, r]) => Math.abs(wrap(r - h - off))).sort((p, q) => p - q);
      best = Math.min(best, errs[Math.floor(errs.length * 0.9)]);
    }
    const isFacing = rot && best <= 10 && headings.size > 2;
    if (isFacing) facing++;
    if (rot || flip || headings.size > 6) rows.push(`${id}(rot=${rot},flip=${flip},headings=${headings.size},p90err=${best.toFixed(0)}°${isFacing ? ",FACING" : ""})`);
  }
  lines.push(`${f}\tattachments=${(scene.pathAttachments ?? []).length}\t${rows.join(" ")}`);
}
console.log(lines.join("\n"));
console.log(`TOTAL 2-D keyed movers=${movers} withRotationTrack=${rotatedMovers} velocityFacing=${facing} withScaleXTrack=${flips} pathAttachments=${attached}`);
