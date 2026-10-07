import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fixtureAdapter } from "./fixture-adapter";
import { importSource } from "./registry";
import { formatImportReport } from "./report";

const file = process.argv[2];
if (!file) {
  console.log("Usage: import-fixture <file>");
  process.exit(2);
}

const source = readFileSync(resolve(file), "utf8");
const result = importSource(fixtureAdapter, source, { sourceName: file });
console.log(formatImportReport(result));
process.exit(result.ok ? 0 : 1);
