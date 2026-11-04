import { readFileSync, readdirSync } from "node:fs";
import { measureContentWidth } from "../../../../packages/schema/src/text-metrics.ts";
const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith(".ms"));
let totalText = 0, totalStackedNodes = 0, totalGroups = 0;
const rows: string[] = [];
for (const f of files) {
  const src = readFileSync(`${dir}/${f}`, "utf8");
  const nodes: any[] = [];
  const re = /text\s+([\w.]+)\s*\{([^}]*)\}/g; let m;
  while ((m = re.exec(src))) {
    const b = m[2];
    const pos = /position\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/.exec(b);
    const content = /content\s+"((?:[^"\\]|\\.)*)"/.exec(b);
    const size = /fontSize\s+([\d.]+)/.exec(b);
    const align = /align\s+(\w+)/.exec(b);
    if (!pos || !content) continue;
    nodes.push({ id: m[1], x: +pos[1], y: +pos[2], content: content[1], size: size ? +size[1] : 16, align: align ? align[1] : "left" });
  }
  totalText += nodes.length;
  // stacked line groups: same x/align/size, consecutive y gap 1.0..1.9 * size, distinct content
  const key = (n: any) => `${n.x}|${n.align}|${n.size}`;
  const by = new Map<string, any[]>();
  for (const n of nodes) (by.get(key(n)) ?? by.set(key(n), []).get(key(n))!).push(n);
  let groups = 0, stacked = 0; const examples: string[] = [];
  for (const list of by.values()) {
    const ys = [...new Set(list.map((n) => n.y))].sort((a, b) => a - b);
    let run: number[] = [ys[0]];
    const flush = () => { if (run.length >= 2) { groups++; const members = list.filter((n) => run.includes(n.y)); stacked += members.length; if (examples.length < 2) examples.push(members.slice(0, 3).map((n) => `${n.id}@${n.y}:"${n.content.slice(0, 40)}"`).join(" / ")); } };
    for (let i = 1; i < ys.length; i++) { const g = ys[i] - ys[i - 1]; const s = list[0].size; if (g >= s * 1.0 && g <= s * 1.9) run.push(ys[i]); else { flush(); run = [ys[i]]; } }
    flush();
  }
  const longest = nodes.reduce((a, n) => Math.max(a, measureContentWidth(n.content, { family: "sans", size: n.size })), 0);
  totalStackedNodes += stacked; totalGroups += groups;
  rows.push(`${f}\ttext=${nodes.length}\tstackedGroups=${groups}\tstackedNodes=${stacked}\tmaxWidthPx=${longest.toFixed(0)}\t${examples.join(" | ")}`);
}
console.log(rows.join("\n"));
console.log(`TOTAL files=${files.length} text=${totalText} groups=${totalGroups} stackedNodes=${totalStackedNodes}`);
