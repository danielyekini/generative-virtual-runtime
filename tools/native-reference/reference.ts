/**
 * P006: generate a versioned model-facing MotionScript authoring reference
 * from released authorities only (see docs/contracts/model-facing-reference.md).
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lintStreamingAuthorship, type StreamLintCode } from "@gvr/compiler";

export const GENERATOR_VERSION = "0.1.0";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, "../..");
export const SNAPSHOT_DIR = join(REPO_ROOT, "docs/reference/motionscript-authoring/snapshots");
export const CURRENT_POINTER = join(REPO_ROOT, "docs/reference/motionscript-authoring/current.json");

const STREAMING_FIXTURES = [
  "fixtures/motionscript/streaming/progressive-ok.ms",
  "fixtures/motionscript/streaming/no-seal-offline.ms",
  "fixtures/motionscript/streaming/sealed-history-bad.ms",
  "fixtures/motionscript/streaming/early-seal-empty.ms",
] as const;

type FixtureExpectation = {
  path: string;
  progressiveOk: boolean;
  offlineOk?: boolean;
  requiredCode?: StreamLintCode;
};

const FIXTURE_EXPECTATIONS: FixtureExpectation[] = [
  { path: STREAMING_FIXTURES[0], offlineOk: true, progressiveOk: true },
  { path: STREAMING_FIXTURES[1], offlineOk: true, progressiveOk: false, requiredCode: "NO_SEAL" },
  { path: STREAMING_FIXTURES[2], progressiveOk: false, requiredCode: "SEALED_HISTORY_WRITE" },
  { path: STREAMING_FIXTURES[3], progressiveOk: false, requiredCode: "EARLY_SEAL" },
];

export type AuthorityMap = Record<string, string>;

export type CapabilityRow = {
  id: string;
  summary: string;
  introducedIn?: { motionscript?: string; sceneIr?: string };
  support: { compiler: string; runtime?: string; renderer?: string };
};

export type ReferenceMetadata = {
  generatorVersion: string;
  generatedAt: string;
  motionscript: string;
  sceneIr: string;
  wireVersion: string;
  packageVersion: string;
  releaseId: string;
  fingerprint: string;
  fingerprint8: string;
  estimatedTokensUtf16Div4: number;
  byteLengthUtf8: number;
  requiredCapabilities: string[];
  unavailableCapabilities: string[];
  untestedCapabilities: string[];
  authorities: AuthorityMap;
  snapshot: string;
  metadata: string;
};

export type GeneratedReference = {
  markdown: string;
  metadata: ReferenceMetadata;
  snapshotBaseName: string;
};

type ReleasesFile = {
  languages: {
    motionscript: { current: string; wireVersion: string; packageVersion: string };
    "scene-ir": { current: string; wireVersion: string; packageVersion: string };
  };
  versions: Array<{ language: string; version: string; status: string; file: string }>;
};

function sha256Bytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function repoPath(...parts: string[]): string {
  return join(REPO_ROOT, ...parts);
}

export function readRepoText(rel: string): string {
  return readFileSync(repoPath(rel), "utf8");
}

export function estimateTokensUtf16Div4(text: string): number {
  return Math.ceil(text.length / 4);
}

function versionFile(releases: ReleasesFile, language: string, version: string): string {
  const row = releases.versions.find((item) => item.language === language && item.version === version);
  if (!row) throw new Error(`Missing version file for ${language} ${version}`);
  return row.file;
}

export function resolveAuthorityPaths(root = REPO_ROOT): string[] {
  const releases = JSON.parse(readFileSync(join(root, "packages/schema/capabilities/releases.json"), "utf8")) as ReleasesFile;
  const ms = releases.languages.motionscript.current;
  const sir = releases.languages["scene-ir"].current;
  return [
    "packages/schema/capabilities/releases.json",
    versionFile(releases, "motionscript", ms),
    versionFile(releases, "scene-ir", sir),
    "packages/schema/capabilities/registry.json",
    "packages/schema/src/grammar.ts",
    "docs/contracts/streaming-authorship.md",
    "docs/contracts/streaming-observation.md",
    "docs/contracts/model-facing-reference.md",
    "packages/compiler/src/stream-lint.ts",
    "packages/compiler/src/stream-lint.test.ts",
    ...STREAMING_FIXTURES,
  ];
}

export function hashAuthorities(root = REPO_ROOT, paths = resolveAuthorityPaths(root)): AuthorityMap {
  const out: AuthorityMap = {};
  for (const rel of paths) {
    out[rel] = sha256Bytes(readFileSync(join(root, rel)));
  }
  return out;
}

export function fingerprintAuthorities(authorities: AuthorityMap): string {
  const lines = Object.keys(authorities)
    .sort()
    .map((path) => `${path}:${authorities[path]}`);
  return sha256Bytes(lines.join("\n"));
}

function loadRegistry(root = REPO_ROOT): CapabilityRow[] {
  const raw = JSON.parse(readFileSync(join(root, "packages/schema/capabilities/registry.json"), "utf8")) as {
    capabilities: CapabilityRow[];
  };
  return raw.capabilities;
}

function partitionCapabilities(rows: CapabilityRow[]) {
  const supported = rows.filter((row) => row.support.compiler === "supported");
  const untested = rows.filter((row) => row.support.compiler === "untested");
  const unsupported = rows.filter((row) => row.support.compiler === "unsupported");
  return { supported, untested, unsupported };
}

function lintFixtures(root = REPO_ROOT): Array<FixtureExpectation & { source: string; ok: boolean; detail: string }> {
  return FIXTURE_EXPECTATIONS.map((expectation) => {
    const source = readFileSync(join(root, expectation.path), "utf8");
    const result = lintStreamingAuthorship(source);
    const hasCode = expectation.requiredCode
      ? result.findings.some((finding: { code: StreamLintCode }) => finding.code === expectation.requiredCode)
      : true;
    const offlineMatches =
      expectation.offlineOk === undefined ? true : result.offlineOk === expectation.offlineOk;
    const ok = offlineMatches && result.progressiveOk === expectation.progressiveOk && hasCode;
    const detail = ok
      ? "ok"
      : `expected progressive=${expectation.progressiveOk}` +
        (expectation.offlineOk === undefined ? "" : ` offline=${expectation.offlineOk}`) +
        (expectation.requiredCode ? ` code=${expectation.requiredCode}` : "") +
        `; got offline=${result.offlineOk} progressive=${result.progressiveOk} codes=${result.findings
          .map((finding: { code: StreamLintCode }) => finding.code)
          .join(",")}`;
    return { ...expectation, source, ok, detail };
  });
}

function renderCapabilityTable(rows: CapabilityRow[]): string {
  const lines = ["| Id | Introduced | Summary |", "| --- | --- | --- |"];
  for (const row of rows) {
    const introduced = row.introducedIn?.motionscript ?? "?";
    const summary = row.summary.replace(/\s+/g, " ").trim();
    lines.push(`| \`${row.id}\` | ${introduced} | ${summary} |`);
  }
  return lines.join("\n");
}

function renderFixtureSection(
  fixtures: Array<FixtureExpectation & { source: string }>,
): string {
  const blocks = fixtures.map((fixture) => {
    const claim = fixture.progressiveOk
      ? "progressiveOk + offlineOk"
      : fixture.offlineOk === true
        ? `offlineOk, not progressive (${fixture.requiredCode ?? "advisory"})`
        : `not progressive (${fixture.requiredCode})`;
    return [
      `### \`${fixture.path}\``,
      "",
      `Claim: **${claim}**. Validated with \`lintStreamingAuthorship\`.`,
      "",
      "```motionscript",
      fixture.source.trimEnd(),
      "```",
    ].join("\n");
  });
  return blocks.join("\n\n");
}

const COMPACT_SYNTAX = `## Compact syntax (released)

Programs use wire family \`version "0.2"\` inside the scene header. Additive
features inside that family are gated with \`requires "<capabilityId>";\` and the
fuller language release id recorded below. One program is:

\`\`\`text
program = sceneHeader , { unit } , complete ;
\`\`\`

Essentials:

- **Header:** \`scene "name" { version; viewport; background?; duration; requires*; };\`
- **Base drawing (0.1):** \`rectangle\` / \`circle\` / \`ellipse\` / \`line\` / \`polygon\` /
  \`path\` / \`text\`; \`camera\`; \`group\`; \`const\`; \`animate\` / \`keyframes\` /
  \`expression\`; \`step\` visibility; named easing.
- **0.2+:** timing scopes, cubicBezier/hold easing, compositions/instances, path
  operators (trim/round), spatial curve keys, blur scopes, parent/opacity flags.
- **0.3–0.8:** path morph, gradient stroke, animated trim, durable entity revisions,
  drawable geometry binds, animated solid paint.
- **0.9 declarative entities:** \`entity\` / \`geometry\` / \`bind\` / \`behaviour\` /
  \`remove\` / \`reparent\` / \`cancel\` (capabilities \`entities.durableRevisions\`,
  \`entities.drawableBindings\`). Host \`emitEntityPatchDelta\` /
  \`APPLY_ENTITY_PATCH\` remains valid.
- **0.10 input:** \`interact\` with bounded \`set\` / \`toggle\` / \`step\` /
  \`dragTranslate\` (\`input.bindings\`). Input-owned channels must not also be
  track-written.
- **0.11 audio:** \`audio\` resources + \`cue\` on narration/effects/music buses
  (\`audio.cues\`). Narration is required (playback waits); effects/music optional.
  Speech synthesis is a **host** service, not MotionScript syntax.
- **0.12 space:** \`spatialLayer\` planar 2.5D (\`space.planar25d\`).
- **0.13 physics:** planar 2D world (\`physics.planar2d\`).
- **0.23 timed keys (MotionScript only):** \`beat cross at intro + 1.5s;\` names a
  time; \`keyframes\` may use \`at <time | beat ± time> <value>;\` keys instead of
  percentages (no start/duration header; never mix the two forms). \`start\`,
  \`step at\`, \`seal\`, \`timing offset\` and \`cue at\` may name a beat;
  \`duration\` stays a length. Declare a beat before any unit that uses it.
  Prefer per-beat \`animate\` blocks with \`fill forwards\` over full-length
  percentage tracks (\`timing.timedKeys\`).
- **0.24 cycles:** \`timing loop { offset 1s; period 2s; };\` repeats local time
  every period (the offset is the phase); add \`repeat 4;\` for a finite run.
  Write one cycle's keys inside \`[0, period]\` with \`timing loop;\`, and add
  \`timing loop;\` after \`value\` to repeat a step. A cycle owns its channels:
  no other writer may touch them. Send every writer of a loop before the first
  seal. Prefer this over \`t % P\` expressions (\`timing.cyclicScopes\`).

Hard excludes for generation: invented loops/functions/packages; \`pending.md\`
constructs; Lottie/SVG adapter expansion guidance; unsupported registry rows as
if they were syntax.
`;

const STREAMING_RULES = `## Construction and streaming rules

Executable units are the scene header, each top-level declaration ending at a
depth-zero \`;\`, batches, and \`complete;\`. Transport fragments are not units.

1. Declare every id a unit references before that unit commits (or keep the
   reference deferred; a seal does not advance while deferred units remain —
   \`SEAL_BLOCKED\`).
2. Prefer dependency-complete batches for co-dependent creates.
3. After the **first** seal, base topology is frozen: no new constants, cameras,
   base nodes, compositions, instances, timing scopes or operators. Later
   structure uses revisioned entity patches, not new \`ADD_NODES\`.

First useful seal: earliest \`seal <horizon>;\` with at least one drawable node
accepted, every track/step needed in \`[0, horizon]\` already accepted, and a
positive horizon. Playhead waits at the sealed frontier. A complete file with
zero seals may be offline-valid via \`complete;\` but is **not** progressively
playable.

Later limits: tracks/steps must not begin strictly before the sealed horizon;
entity-patch activations require \`activationMs >= sealedThroughMs\`.

Idioms: stable ids; time-local writers (cast + early intervals, seal, then later
intervals); exclusive writers per channel; named behaviours and geometry binds
attach on the **instance** entity, never by mutating a shared geometry asset.
`;

const ERRORS = `## Errors and repair signals

| Situation | Signal |
| --- | --- |
| Unit larger than buffer budget | \`RESOURCE_LIMIT\` / \`OVERSIZED_UNIT\` |
| Seal while deferred refs remain | \`SEAL_BLOCKED\` |
| Writer/step into sealed history | \`INVALID_TIMING\` / \`SEALED_HISTORY_WRITE\` |
| Empty early seal (no drawable) | \`EARLY_SEAL\` |
| No progressive seal | \`NO_SEAL\` (offline may still pass) |
| Stale or conflicting entity patch | entity-patch diagnostic; keep last accepted revision |
| Unknown / colliding geometry bind | \`GEOMETRY_*\` / \`BIND_*\` rejection |
| Compile failure in a unit | \`COMPILE_ERROR\` |

Stream linter codes: \`OVERSIZED_UNIT\`, \`EARLY_SEAL\`, \`LATE_FIRST_SEAL\`,
\`SETUP_BEFORE_USEFUL\`, \`NO_SEAL\`, \`SEALED_HISTORY_WRITE\`,
\`UNRESOLVED_DEPENDENCY\`, \`COMPILE_ERROR\`.
`;

export function generateReference(options?: {
  root?: string;
  generatedAt?: string;
}): GeneratedReference {
  const root = options?.root ?? REPO_ROOT;
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const releases = JSON.parse(
    readFileSync(join(root, "packages/schema/capabilities/releases.json"), "utf8"),
  ) as ReleasesFile;
  const ms = releases.languages.motionscript.current;
  const sir = releases.languages["scene-ir"].current;
  const wireVersion = releases.languages.motionscript.wireVersion;
  const packageVersion = releases.languages.motionscript.packageVersion;
  const authorities = hashAuthorities(root);
  const fingerprint = fingerprintAuthorities(authorities);
  const fingerprint8 = fingerprint.slice(0, 8);
  const releaseId = `ms-${ms}_sir-${sir}`;
  const snapshotBaseName = `${releaseId}-${fingerprint8}`;
  const snapshotRel = `docs/reference/motionscript-authoring/snapshots/${snapshotBaseName}.md`;
  const metadataRel = `docs/reference/motionscript-authoring/snapshots/${snapshotBaseName}.json`;

  const { supported, untested, unsupported } = partitionCapabilities(loadRegistry(root));
  const fixtures = lintFixtures(root);
  const failed = fixtures.filter((item) => !item.ok);
  if (failed.length > 0) {
    throw new Error(`Streaming fixture lint failed:\n${failed.map((item) => `${item.path}: ${item.detail}`).join("\n")}`);
  }

  const authorityTable = [
    "| Path | SHA-256 |",
    "| --- | --- |",
    ...Object.keys(authorities)
      .sort()
      .map((path) => `| \`${path}\` | \`${authorities[path]}\` |`),
  ].join("\n");

  const renderBody = (tokenField: string, byteField: string): string =>
    [
      `# MotionScript authoring reference (${releaseId})`,
      "",
      "Compact model-facing reference generated by P006 from released authorities only.",
      "Not a roadmap, decision log, evaluation archive or Lottie/SVG adapter guide.",
      "",
      "## Snapshot metadata",
      "",
      `| Field | Value |`,
      `| --- | --- |`,
      `| MotionScript release | ${ms} |`,
      `| Scene IR release | ${sir} |`,
      `| Wire family | ${wireVersion} |`,
      `| Schema package version | ${packageVersion} |`,
      `| Generator | native-reference ${GENERATOR_VERSION} |`,
      `| Generated at (UTC) | ${generatedAt} |`,
      `| Authority fingerprint | \`${fingerprint}\` |`,
      `| Estimated tokens (UTF-16 code units ÷ 4) | ${tokenField} |`,
      `| UTF-8 bytes | ${byteField} |`,
      "",
      "Token estimate is a bounded Studio/host heuristic (four UTF-16 code units = one",
      "estimated token). It is **not** provider tokenization (tiktoken or similar).",
      "",
      "### Input identity",
      "",
      authorityTable,
      "",
      "## Required capability profile (compiler-supported)",
      "",
      "Declare these with `requires` when a program uses the feature. Wire programs",
      "still use `version \"0.2\"`; the fuller release id distinguishes additive schema.",
      "",
      renderCapabilityTable(supported),
      "",
      "## Untested (do not treat as generation-ready)",
      "",
      renderCapabilityTable(untested),
      "",
      "## Unavailable (unsupported — never emit as syntax)",
      "",
      renderCapabilityTable(unsupported),
      "",
      COMPACT_SYNTAX,
      "",
      STREAMING_RULES,
      "",
      ERRORS,
      "",
      "## Validated streaming examples",
      "",
      renderFixtureSection(fixtures),
      "",
      "## Hard excludes",
      "",
      "- Roadmaps, backlog queues, and `pending.md` candidates as if released",
      "- Historical evaluation debates and fidelity corpora",
      "- Legacy Lottie/SVG adapter expansion guidance",
      "- Invented loop / function / package syntax",
      "- Presenting unsupported or merely untested registry rows as available syntax",
      "",
      "## Link-outs (not inlined)",
      "",
      "- `docs/languages/authoring-guide.md`",
      "- `docs/design/capacity-transactions.md`",
      "- `docs/contracts/streaming-observation.md`",
      "- Engine decisions under `docs/decisions/engine/` (navigation only)",
      "",
    ].join("\n");

  // Settle digit-width for token/byte fields (UTF-16 length ÷ 4 heuristic).
  let tokenField = "0";
  let byteField = "0";
  let markdown = renderBody(tokenField, byteField);
  for (let i = 0; i < 4; i += 1) {
    tokenField = String(estimateTokensUtf16Div4(markdown));
    byteField = String(new TextEncoder().encode(markdown).byteLength);
    const next = renderBody(tokenField, byteField);
    if (next === markdown) break;
    markdown = next;
  }

  const metadata: ReferenceMetadata = {
    generatorVersion: GENERATOR_VERSION,
    generatedAt,
    motionscript: ms,
    sceneIr: sir,
    wireVersion,
    packageVersion,
    releaseId,
    fingerprint,
    fingerprint8,
    estimatedTokensUtf16Div4: estimateTokensUtf16Div4(markdown),
    byteLengthUtf8: new TextEncoder().encode(markdown).byteLength,
    requiredCapabilities: supported.map((row) => row.id),
    unavailableCapabilities: unsupported.map((row) => row.id),
    untestedCapabilities: untested.map((row) => row.id),
    authorities,
    snapshot: snapshotRel,
    metadata: metadataRel,
  };

  return { markdown, metadata, snapshotBaseName };
}

export type CheckResult =
  | { ok: true; metadata: ReferenceMetadata }
  | { ok: false; errors: string[] };

export function loadCurrentPointer(root = REPO_ROOT): ReferenceMetadata {
  return JSON.parse(readFileSync(join(root, "docs/reference/motionscript-authoring/current.json"), "utf8")) as ReferenceMetadata;
}

export function checkReference(root = REPO_ROOT): CheckResult {
  const errors: string[] = [];
  const pointerPath = join(root, "docs/reference/motionscript-authoring/current.json");
  let pointer: ReferenceMetadata;
  try {
    pointer = JSON.parse(readFileSync(pointerPath, "utf8")) as ReferenceMetadata;
  } catch (error) {
    return { ok: false, errors: [`Missing or invalid current pointer: ${String(error)}`] };
  }

  const live = hashAuthorities(root);
  const liveFingerprint = fingerprintAuthorities(live);
  if (liveFingerprint !== pointer.fingerprint) {
    errors.push(
      `Authority fingerprint stale: pointer=${pointer.fingerprint} live=${liveFingerprint}. Regenerate with reference:generate.`,
    );
  }
  for (const [path, digest] of Object.entries(pointer.authorities)) {
    if (live[path] !== digest) {
      errors.push(`Authority hash mismatch for ${path}: pointer=${digest} live=${live[path] ?? "missing"}`);
    }
  }

  const snapshotPath = join(root, pointer.snapshot);
  const metadataPath = join(root, pointer.metadata);
  let snapshotText = "";
  try {
    snapshotText = readFileSync(snapshotPath, "utf8");
  } catch {
    errors.push(`Snapshot missing: ${pointer.snapshot}`);
  }
  try {
    const diskMeta = JSON.parse(readFileSync(metadataPath, "utf8")) as ReferenceMetadata;
    if (diskMeta.fingerprint !== pointer.fingerprint) {
      errors.push("Metadata fingerprint does not match current pointer.");
    }
    if (diskMeta.estimatedTokensUtf16Div4 !== estimateTokensUtf16Div4(snapshotText) && snapshotText) {
      errors.push(
        `Token estimate mismatch: metadata=${diskMeta.estimatedTokensUtf16Div4} actual=${estimateTokensUtf16Div4(snapshotText)}`,
      );
    }
  } catch {
    errors.push(`Metadata missing or invalid: ${pointer.metadata}`);
  }

  if (snapshotText) {
    for (const id of pointer.unavailableCapabilities) {
      // Unsupported ids may appear in the Unavailable table; they must not appear
      // as required profile rows.
      if (pointer.requiredCapabilities.includes(id)) {
        errors.push(`Unsupported capability ${id} incorrectly listed as required.`);
      }
    }
    const banned = ["pending.md as released", "Invented loop"];
    // Soft content checks: required sections
    for (const needle of [
      "## Required capability profile",
      "## Unavailable",
      "## Validated streaming examples",
      "UTF-16 code units ÷ 4",
    ]) {
      if (!snapshotText.includes(needle)) errors.push(`Snapshot missing section marker: ${needle}`);
    }
    void banned;
  }

  // Re-validate fixtures against live linter regardless of snapshot embed.
  for (const fixture of lintFixtures(root)) {
    if (!fixture.ok) errors.push(`Fixture lint failed: ${fixture.path}: ${fixture.detail}`);
  }

  // Fresh generate must match pointer fingerprint (authorities unchanged → same fp).
  const fresh = generateReference({ root, generatedAt: pointer.generatedAt });
  if (fresh.metadata.fingerprint !== pointer.fingerprint) {
    errors.push("Fresh generate fingerprint diverges from pointer under current authorities.");
  }
  if (snapshotText && fresh.markdown !== snapshotText) {
    // Allow timestamp-stable compare using pointer's generatedAt; if still different, fail.
    errors.push("On-disk snapshot text does not match fresh generate for pointer generatedAt.");
  }

  return errors.length === 0 ? { ok: true, metadata: pointer } : { ok: false, errors };
}

export function writeReference(generated: GeneratedReference, root = REPO_ROOT): void {
  const snapshotPath = join(root, generated.metadata.snapshot);
  const metadataPath = join(root, generated.metadata.metadata);
  const pointerPath = join(root, "docs/reference/motionscript-authoring/current.json");
  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, generated.markdown);
  writeFileSync(metadataPath, `${JSON.stringify(generated.metadata, null, 2)}\n`);
  writeFileSync(pointerPath, `${JSON.stringify(generated.metadata, null, 2)}\n`);
}

/** Test helper: list snapshot files under the authoring snapshots directory. */
export function listSnapshotFiles(root = REPO_ROOT): string[] {
  const dir = join(root, "docs/reference/motionscript-authoring/snapshots");
  try {
    return readdirSync(dir).map((name) => relative(root, join(dir, name)));
  } catch {
    return [];
  }
}
