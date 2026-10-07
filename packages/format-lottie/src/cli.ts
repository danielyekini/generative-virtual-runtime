import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { importSource } from "@gvr/format-import-core";
import { formatImportReport } from "@gvr/format-import-core";
import { lottieAdapter } from "./adapter";

const file = process.argv[2];
if (!file) {
  console.log("Usage: import-lottie <file.json>");
  process.exit(2);
}

const source = readFileSync(resolve(file), "utf8");
const result = importSource(lottieAdapter, source, { sourceName: file });
console.log(formatImportReport(result));
process.exit(result.ok ? 0 : 1);
