import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { measureContentWidth } from "../../../../packages/schema/src/text-metrics.ts";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const dir = "fixtures/motionscript/stories";
const items: { s: string; size: number; weight: string }[] = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith(".ms"))) {
  const src = readFileSync(`${dir}/${f}`, "utf8"); const re = /text\s+[\w.]+\s*\{([^}]*)\}/g; let m;
  while ((m = re.exec(src))) { const b = m[1]; const c = /content\s+"((?:[^"\\]|\\.)*)"/.exec(b); const fam = /fontFamily\s+"(\w+)"/.exec(b);
    if (!c || (fam && fam[1] !== "sans") || c[1].length < 12) continue;
    items.push({ s: c[1], size: +(/fontSize\s+([\d.]+)/.exec(b)?.[1] ?? 16), weight: /fontWeight\s+(\d+)/.exec(b)?.[1] ?? "400" }); }
}
const b = await chromium.launch(); const p = await b.newPage();
const real: number[] = await p.evaluate((xs) => { const ctx = document.createElement("canvas").getContext("2d")!; return xs.map((x) => { ctx.font = `${x.weight} ${x.size}px sans-serif`; return ctx.measureText(x.s).width; }); }, items);
const fam = await p.evaluate(() => { const c=document.createElement("canvas").getContext("2d")!; c.font="16px sans-serif"; return c.font; });
await b.close();
const ratios = items.map((x, i) => measureContentWidth(x.s, { family: "sans", size: x.size }) / real[i]).sort((a, b) => a - b);
const q = (k: number) => ratios[Math.floor(k * (ratios.length - 1))].toFixed(3);
console.log(`strings=${items.length} table/real ratio min=${q(0)} p10=${q(0.1)} median=${q(0.5)} p90=${q(0.9)} max=${q(1)} font=${fam}`);
console.log(`over 5% error: ${ratios.filter((r) => Math.abs(r - 1) > 0.05).length}; over 10%: ${ratios.filter((r) => Math.abs(r - 1) > 0.1).length}`);
