// Usage (repo root): node docs/runs/engine/a19397e7-a982-42b7-b4d4-2a8194f8ec71/spatial-render.cjs <outdir>
const path = require("node:path");
const fs = require("node:fs");
const esbuild = require("esbuild");
const { chromium } = require("playwright");

(async () => {
  const here = __dirname;
  const outDir = path.resolve(process.argv[2] || here);
  fs.mkdirSync(outDir, { recursive: true });
  const bundle = await esbuild.build({
    entryPoints: [path.join(here, "spatial-render.entry.ts")],
    bundle: true, write: false, format: "iife", platform: "browser",
    absWorkingDir: path.resolve(here, "../../../.."),
  });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 4000 }, deviceScaleFactor: 1 });
  await page.setContent("<!doctype html><body style='margin:0;background:#fff'></body>");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const result = await page.evaluate(() => window.__spatial);
  for (const shot of result) await page.locator(`#${shot.name}`).screenshot({ path: path.join(outDir, `${shot.name}.png`) });
  await browser.close();
  let failures = 0;
  for (const shot of result) {
    for (const probe of shot.probes) {
      const ok = probe.expectHit === undefined || probe.hit === probe.expectHit;
      if (!ok) failures += 1;
      console.log(`${ok ? "PASS" : "FAIL"} ${shot.name} ${probe.label} hit=${probe.hit} pixel=${probe.pixel.join(",")}`);
    }
    console.log(`     ${shot.name} order: ${shot.order.join(" < ")}`);
  }
  fs.writeFileSync(path.join(outDir, "spatial-render.json"), JSON.stringify(result, null, 2) + "\n");
  process.exit(failures ? 1 : 0);
})();
