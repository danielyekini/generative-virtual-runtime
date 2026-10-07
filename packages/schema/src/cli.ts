import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkManifest, formatDiagnostic } from "./harness";
import { validateSceneIR } from "./validate";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: validate-ir <fixture.json>");
  console.log("       validate-ir --manifest <manifest.json>");
  process.exit(2);
}

if (args[0] === "--manifest") {
  const manifestPath = resolve(args[1] ?? "");
  const results = checkManifest(manifestPath);
  let failed = 0;
  for (const result of results) {
    if (result.matched) {
      console.log(`PASS\t${result.file}`);
      continue;
    }
    failed += 1;
    console.log(`FAIL\t${result.file}`);
    console.log(`  expected ${result.expected}, ok=${result.ok}, codes=${result.codes.join(",") || "-"}`);
    for (const item of result.diagnostics) console.log(`  ${formatDiagnostic(item)}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

const file = resolve(args[0] ?? "");
const json = JSON.parse(readFileSync(file, "utf8")) as unknown;
const result = validateSceneIR(json);
if (result.ok) {
  console.log("PASS");
  process.exit(0);
}
console.log("FAIL");
for (const item of result.diagnostics) console.log(formatDiagnostic(item));
process.exit(1);
