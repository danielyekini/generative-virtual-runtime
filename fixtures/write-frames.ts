import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateResolvedFrame } from "../packages/schema/src/validate";
import { buildFrames } from "./frame-cases";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "frames");
mkdirSync(dir, { recursive: true });

const frames = buildFrames();
for (const [id, frame] of Object.entries(frames)) {
  const result = validateResolvedFrame(frame);
  if (!result.ok) {
    throw new Error(`${id}\n${result.diagnostics.map((item) => item.message).join("\n")}`);
  }
  writeFileSync(resolve(dir, `${id}.json`), `${JSON.stringify(frame, null, 2)}\n`);
}
console.log(`wrote ${Object.keys(frames).length} frames`);
