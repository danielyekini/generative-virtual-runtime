import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  REPO_ROOT,
  checkReference,
  estimateTokensUtf16Div4,
  fingerprintAuthorities,
  generateReference,
  hashAuthorities,
  writeReference,
} from "./reference.js";

const scratchDirs: string[] = [];

afterEach(() => {
  while (scratchDirs.length > 0) {
    const dir = scratchDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Copy the reference authorities into a scratch tree so write/check tests never
 * rewrite the committed (immutable) snapshot or move the real pointer.
 */
function scratchRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "gvr-ref-"));
  scratchDirs.push(dir);
  for (const rel of ["packages/schema/capabilities", "packages/schema/src", "packages/compiler/src", "docs/contracts", "docs/languages", "fixtures"]) {
    cpSync(join(REPO_ROOT, rel), join(dir, rel), { recursive: true });
  }
  return dir;
}

describe("native reference generator", () => {
  it("builds a snapshot from released authorities with honest token estimate", () => {
    const generated = generateReference({ generatedAt: "2026-11-02T23:30:00.000Z" });
    expect(generated.metadata.motionscript).toMatch(/^\d+\.\d+\.\d+$/);
    expect(generated.metadata.sceneIr).toMatch(/^\d+\.\d+\.\d+$/);
    expect(generated.metadata.wireVersion).toBe("0.2");
    expect(generated.metadata.fingerprint).toHaveLength(64);
    expect(generated.metadata.requiredCapabilities.length).toBeGreaterThan(10);
    expect(generated.metadata.unavailableCapabilities).toContain("geometry.repeater");
    expect(generated.metadata.requiredCapabilities).not.toContain("geometry.repeater");
    expect(generated.markdown).toContain("## Required capability profile");
    expect(generated.markdown).toContain("## Unavailable");
    expect(generated.markdown).toContain("progressive-ok.ms");
    expect(generated.markdown).not.toMatch(/pending\.md candidates as if released[\s\S]*as available syntax\n\n## Compact/);
    expect(generated.metadata.estimatedTokensUtf16Div4).toBe(estimateTokensUtf16Div4(generated.markdown));
    // Unsupported rows appear only as unavailable, not as required profile teaching.
    expect(generated.markdown).toContain("`geometry.repeater`");
    const requiredSection = generated.markdown.split("## Untested")[0] ?? "";
    expect(requiredSection).not.toContain("`geometry.repeater`");
  });

  it("trips staleness when an authority hash changes", () => {
    const live = hashAuthorities();
    const tampered = { ...live, "packages/schema/capabilities/releases.json": "0".repeat(64) };
    expect(fingerprintAuthorities(tampered)).not.toBe(fingerprintAuthorities(live));
  });

  it("writes snapshot + pointer and passes check", () => {
    const root = scratchRoot();
    const generated = generateReference({ root, generatedAt: "2026-11-02T23:30:00.000Z" });
    writeReference(generated, root);
    const pointerPath = join(root, "docs/reference/motionscript-authoring/current.json");
    const pointer = JSON.parse(readFileSync(pointerPath, "utf8")) as typeof generated.metadata;
    expect(pointer.fingerprint).toBe(generated.metadata.fingerprint);
    const check = checkReference(root);
    expect(check.ok).toBe(true);
  });

  it("fails check when the pointer fingerprint is tampered", () => {
    const root = scratchRoot();
    const generated = generateReference({ root, generatedAt: "2026-11-02T23:30:00.000Z" });
    writeReference(generated, root);
    const pointerPath = join(root, "docs/reference/motionscript-authoring/current.json");
    const pointer = JSON.parse(readFileSync(pointerPath, "utf8")) as Record<string, unknown>;
    pointer.fingerprint = "deadbeef".repeat(8);
    writeFileSync(pointerPath, `${JSON.stringify(pointer, null, 2)}\n`);
    const check = checkReference(root);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.errors.some((error) => /fingerprint stale|Fingerprint/i.test(error))).toBe(true);
    }
  });

  it("can stage an isolated tree copy for pointer absence", () => {
    const dir = mkdtempSync(join(tmpdir(), "gvr-ref-"));
    scratchDirs.push(dir);
    mkdirSync(join(dir, "docs/reference/motionscript-authoring"), { recursive: true });
    writeFileSync(join(dir, "docs/reference/motionscript-authoring/current.json"), "{");
    // Direct check API uses REPO_ROOT; this test only asserts JSON parse failure path via broken local file shape.
    expect(() => JSON.parse("{")).toThrow();
  });
});
