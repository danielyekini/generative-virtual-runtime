import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatImportReport, importSource } from "@gvr/format-import-core";
import { svgAdapter } from "./adapter";

const file = process.argv[2];
if (!file) {
  console.log("Usage: import-svg <file.svg>");
  process.exit(2);
}

const source = readFileSync(resolve(file), "utf8");
const result = importSource(svgAdapter, source, { sourceName: file });
console.log(formatImportReport(result));
process.exit(result.ok ? 0 : 1);
