#!/usr/bin/env node
import { checkReference, generateReference, writeReference } from "./reference.js";

const check = process.argv.includes("--check");

if (check) {
  const result = checkReference();
  if (!result.ok) {
    console.error("reference:check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `reference:check ok (${result.metadata.releaseId}, fingerprint ${result.metadata.fingerprint8}, ~${result.metadata.estimatedTokensUtf16Div4} est. tokens)`,
  );
  process.exit(0);
}

const generated = generateReference();
writeReference(generated);
console.log(`Wrote ${generated.metadata.snapshot}`);
console.log(`Wrote ${generated.metadata.metadata}`);
console.log(`Updated docs/reference/motionscript-authoring/current.json`);
console.log(
  `fingerprint=${generated.metadata.fingerprint8} estimatedTokensUtf16Div4=${generated.metadata.estimatedTokensUtf16Div4}`,
);
