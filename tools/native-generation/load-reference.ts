import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CURRENT_POINTER, REPO_ROOT, type ReferenceMetadata } from "../native-reference/reference.js";

export type LoadedReference = {
  metadata: ReferenceMetadata;
  markdown: string;
};

export function loadAuthoringReference(root = REPO_ROOT): LoadedReference {
  const metadata = JSON.parse(readFileSync(CURRENT_POINTER, "utf8")) as ReferenceMetadata;
  const markdown = readFileSync(join(root, metadata.snapshot), "utf8");
  return { metadata, markdown };
}
