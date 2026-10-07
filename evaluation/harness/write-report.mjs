/**
 * Builds the Word report from evidence already produced by the harness.
 *   node evaluation/harness/write-report.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"));
const { PNG } = require("pngjs");
const {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require("docx");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidence = resolve(root, "evidence");
const results = JSON.parse(readFileSync(resolve(evidence, "results.json"), "utf8")).fixtures;
const manifest = JSON.parse(readFileSync(resolve(evidence, "manifest.json"), "utf8"));
const rendered = JSON.parse(readFileSync(resolve(evidence, "render-results.json"), "utf8"));
const environment = JSON.parse(readFileSync(resolve(evidence, "environment.json"), "utf8"));

const judged = {
  "LOT-00": {
    overall: "PARTIAL",
    reference: "PASS",
    render: "PARTIAL",
    summary: "Full pipeline. Endpoints and midpoint match. Quarter-cycle pan is visibly offset.",
  },
  "LOT-01": {
    overall: "FAIL",
    reference: "PASS",
    render: "NOT_REACHED",
    summary: "Root composition is one precomp. Production import returns no scene.",
  },
  "LOT-02": {
    overall: "PARTIAL",
    reference: "PASS",
    render: "PARTIAL",
    summary: "Pipeline plays a remnant. Button, text, gradient, and trim are missing.",
  },
  "LOT-03": {
    overall: "FAIL",
    reference: "FAIL",
    render: "NOT_REACHED",
    summary: "Production import stops on the 512 KiB limit. Reference canvas stayed empty after a player exception.",
  },
  "LOT-04": {
    overall: "PARTIAL",
    reference: "PASS",
    render: "PARTIAL",
    summary: "Pipeline plays two static paths. The moving type is inside a precomp and is absent.",
  },
  "LOT-05": {
    overall: "PARTIAL",
    reference: "PASS",
    render: "PARTIAL",
    summary: "Pipeline plays one white rectangle. The play-button artwork is a precomp.",
  },
  "LOT-06": {
    overall: "PARTIAL",
    reference: "PASS",
    render: "PARTIAL",
    summary: "Pipeline plays a broken figure. Animated paths and the hex solid background are lost.",
  },
  "LOT-07": {
    overall: "PARTIAL",
    reference: "PASS",
    render: "PARTIAL",
    summary: "Pipeline plays static dots. Gradient strokes and animated wave paths are absent, and there are no tracks.",
  },
  "SVG-01": {
    overall: "FAIL",
    reference: "PASS",
    render: "NOT_REACHED",
    summary: "SMIL confetti is not imported. Validation then rejects 564 nodes, so production returns no scene.",
  },
  "SVG-02": {
    overall: "FAIL",
    reference: "PASS",
    render: "NOT_REACHED",
    summary: "SMIL jump is not imported. Validation then rejects depth 20, so production returns no scene.",
  },
};

const byId = Object.fromEntries(results.map((item) => [item.id, item]));
const renderById = Object.fromEntries(rendered.fixtures.map((item) => [item.id, item]));
for (const fixture of manifest.fixtures) {
  if (!byId[fixture.id] || !judged[fixture.id] || !renderById[fixture.id]) {
    throw new Error(`Fixture ${fixture.id} is missing from results, judgement, or render results.`);
  }
}
if (manifest.fixtures.length !== 10 || results.length !== 10) {
  throw new Error(`Expected 10 fixtures, manifest ${manifest.fixtures.length}, results ${results.length}.`);
}

const counts = { PASS: 0, PARTIAL: 0, FAIL: 0, BLOCKED: 0 };
const referenceCounts = { PASS: 0, FAIL: 0, BLOCKED: 0 };
for (const item of Object.values(judged)) {
  counts[item.overall] += 1;
  referenceCounts[item.reference] += 1;
}

const outcomes = {
  judgedAt: new Date().toISOString(),
  fixtureCount: 10,
  overall: counts,
  reference: referenceCounts,
  rule: "Overall PASS/PARTIAL/FAIL/BLOCKED follows inspection of production playback. A diagnostic scene is not a pass. Pixel fractions do not decide the outcome.",
  fixtures: manifest.fixtures.map((fixture) => ({
    id: fixture.id,
    ...judged[fixture.id],
    productionFidelity: byId[fixture.id].production?.fidelity ?? null,
    earliestBlockingStage: byId[fixture.id].earliestBlockingStage,
  })),
};
writeFileSync(resolve(evidence, "outcomes.json"), JSON.stringify(outcomes, null, 2));

const children = [];
const text = (value, options = {}) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: value, font: "Calibri", size: 22, ...options })] });
const h1 = (value) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun(value)] });
const h2 = (value) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun(value)] });
const bullet = (value) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: value, font: "Calibri", size: 22 })] });

function stageOf(fixture, name) {
  return fixture.stages.find((item) => item.name === name)?.status ?? "NOT_REACHED";
}

function cell(value, width, header = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(value), bold: header, font: "Calibri", size: header ? 14 : 15 })],
      }),
    ],
  });
}

function table(headers, rows, widths) {
  return new Table({
    width: { size: widths.reduce((sum, item) => sum + item, 0), type: WidthType.DXA },
    rows: [
      new TableRow({ children: headers.map((header, index) => cell(header, widths[index], true)), tableHeader: true }),
      ...rows.map((row) => new TableRow({ children: row.map((value, index) => cell(value, widths[index])) })),
    ],
  });
}

function figure(relativePath, caption) {
  const absolute = resolve(evidence, relativePath.replace(/^evidence\//, ""));
  const png = PNG.sync.read(readFileSync(absolute));
  const width = 680;
  const height = Math.max(1, Math.round((width * png.height) / png.width));
  children.push(
    new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [
        new ImageRun({
          type: "png",
          data: readFileSync(absolute),
          transformation: { width, height },
          altText: { title: caption, description: caption, name: caption },
        }),
      ],
    }),
  );
  children.push(text(caption, { italics: true, size: 18 }));
}

children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("MotionScript animation compatibility")] }));
children.push(text("Evaluation of the current import, MotionScript, compile, runtime, and canvas path against the supplied Lottie and SVG pack. No production code was changed. No source animation was edited."));

children.push(h1("1. Executive summary"));
children.push(text(`Ten fixtures were executed: eight Lottie JSON files, including the panning-landscape baseline, and two SMIL SVGs. Overall outcomes are PASS ${counts.PASS}, PARTIAL ${counts.PARTIAL}, FAIL ${counts.FAIL}, BLOCKED ${counts.BLOCKED}. Reference playback is PASS ${referenceCounts.PASS}, FAIL ${referenceCounts.FAIL}, BLOCKED ${referenceCounts.BLOCKED}.`));
children.push(text("Nothing in this pack is a native PASS. The baseline completes the production pipeline and matches the reference at the start, the midpoint, and near the end, but the pan is in a different place at 25% and 75%. Six other Lottie files produce a compiled scene and a canvas frame that drops the subject of the animation. Two Lottie files and both SVGs produce no accepted production scene."));
children.push(text("The losses that show up in the pictures are precomp layers left unexpanded, text and gradients omitted, animated paths frozen or dropped, SMIL left as a static tree, and two resource limits that reject the SVG trees after lowering. A separate reference-player failure left lottie_ex1 blank in lottie-web, so that file has no usable visual comparison."));

children.push(h1("2. Environment, methodology, and limitations"));
children.push(h2("Environment"));
children.push(text(`Captured ${environment.capturedAt}. Repository ${environment.repository}. Git HEAD: no commits on main (${environment.gitHead}). Node ${environment.node}, npm ${environment.npm}, ${environment.platform}.`));
children.push(text(`Adapters: import core ${environment.versions.importCore}, Lottie ${environment.versions.lottieAdapter}, SVG ${environment.versions.svgAdapter}, emitter ${environment.versions.emitter}, Scene IR ${environment.versions.ir}, MotionScript ${environment.versions.dsl}. SVG static duration shim ${environment.versions.svgStaticDurationMs} ms. Import size limit and scene budgets are the schema defaults (512 KiB source, 500 nodes, depth 16, 30 s, 1000 tracks).`));
children.push(text(`Browser: ${rendered.controls.userAgent}. Chrome binary reports ${environment.chrome}. Device scale factor 1, set with Emulation.setDeviceMetricsOverride and --force-device-scale-factor=1. Reference Lottie player: lottie-web ${environment.lottieWeb}, canvas renderer, loop false, autoplay false, goToAndStop(frame, true), then composited onto the same background as the native frame. Reference SVG: the same Chrome document, SVGSVGElement.setCurrentTime, then a viewport screenshot.`));
children.push(text("Commands, from the repository root: npx tsx evaluation/harness/run-pipeline.ts; npx tsx evaluation/harness/continue-diagnostic.ts; npx tsx evaluation/harness/drive-browser.ts; node evaluation/harness/write-report.mjs. The report tools need npm install in evaluation/ (docx, pngjs)."));

children.push(h2("What was executed"));
children.push(bullet("Production route: importSource on lottieAdapter or svgAdapter, which parses, normalises, and validateSceneIR. A failed validation or size check returns no scene."));
children.push(bullet("When that returns a scene: emitMotionScript, compileMotionScript, AnimationRuntime.evaluate at the sample times, then CanvasRenderer in Chrome."));
children.push(bullet("When production returns no scene, the harness calls adapter.parse and adapter.normalise again and labels the result diagnostic. That path is not a native pass. LOT-03, SVG-01, and SVG-02 have diagnostic scenes. LOT-01 does not, because the parser finds no supported root layer."));
children.push(bullet("Sample times are 0%, 25%, 50%, 75%, and 99.5% of one source cycle. SVG-01 adds the SMIL visibility fraction 0.926. SVG-02 adds 0.600 and 0.640. Lottie near-end stays inside the out point."));
children.push(bullet("Pixel difference uses Euclidean RGB distance. Pixels above 24 are marked on the diff image. The fraction is recorded and was not used as the pass rule."));

children.push(h2("Documented behaviour versus this implementation"));
children.push(text("The Lottie docs say precomps, images, text, masks, mattes, effects, skew, auto-orient, spatial tangents, gradients, trim, repeaters, animated paint, and non-zero rectangle corners are unsupported and should be reported. Bezier easing is documented as approximated to linear, easeIn, easeOut, or easeInOut. The SVG docs say SMIL and CSS animation are unsupported in v0.1, scripts produce no scene, and a static file gets a 1000 ms duration and no tracks."));
children.push(text("In this tree, precomp, text, gradients, trim, rounded corners, and animated paths are reported and omitted. Mattes (tt), effects (ef), and position spatial tangents (ti/to) occur in the pack and do not appear in the import diagnostics. Solid colours stored as hex strings are not read. Those are implementation observations, not extra documented features."));

children.push(h2("Limitations"));
children.push(bullet("The repository has no commit, so this result is tied to the working tree at capture time, not to a SHA."));
children.push(bullet("The lottie-web micro-fixture (a 20px box moving from x=10 to x=80) produced identical canvases at frame 0 and frame 15. Time control for the supplied files is shown separately: every Lottie reference except LOT-03 has more than one distinct frame hash across the five seeks."));
children.push(bullet("The SVG micro-fixture changed from red to blue under setCurrentTime (fraction of pixels beyond the threshold: 1). SMIL time control in this Chrome works."));
children.push(bullet("LOT-03 reference frames are all the compositing colour #101014. The page log is: Uncaught TypeError: Cannot read properties of undefined (reading 's'). A second Lottie renderer was not run. Reference status is FAIL. The harness PNG existing is not treated as reference success."));
children.push(bullet("Hover Button.json is a finite timeline. It has no pointer stream. The window is one composition cycle, 0 to 7.533 s."));
children.push(bullet("Both SVGs use repeatCount indefinite. The window is one dur cycle (4.033 s and 1 s). No pointer input."));
children.push(bullet("LOT-04 viewport height is 888.89. Both players were placed in a 500 by 889 CSS box at DPR 1. Native contain-fit can add a fraction of a pixel of letterbox."));
children.push(bullet("Lottie native background is the importer default #101014 unless the file paints its own. SVG native background is transparent over the renderer's black letterbox; both SVGs also paint their own light background rect, and the reference stage used black behind that."));
children.push(bullet("Timings are one call each on this machine, with no warmup and no separate GPU trace. They are not a budget measurement."));
children.push(bullet("No reduced reproducer was cut from a source file. No fixture was modified to make it pass."));
children.push(bullet("Masks, skew, auto-orient, expressions, blend modes, CSS animation, scripts, and Lottie image layers (ty 2) do not occur in this pack, so they are untested here."));

children.push(h1("3. Fixture results"));
children.push(text("Stage words come from the production route. Render is NOT_REACHED when production import returned no scene, even if a diagnostic canvas was saved. Reference is judged from the pixels and the player log, not from the harness flag that a PNG file exists."));

const stageHeaders = ["ID", "File", "Import", "Emit", "Compile", "Runtime", "Render", "Reference", "Overall"];
const stageWidths = [900, 2500, 1100, 1400, 1100, 1100, 1500, 1200, 1100];
const stageRows = manifest.fixtures.map((fixture) => {
  const item = byId[fixture.id];
  const decision = judged[fixture.id];
  return [
    fixture.id,
    fixture.fileName,
    stageOf(item, "import"),
    stageOf(item, "motionscript_emit"),
    stageOf(item, "compile"),
    stageOf(item, "runtime"),
    decision.render,
    decision.reference,
    decision.overall,
  ];
});
children.push(table(stageHeaders, stageRows, stageWidths));
children.push(text(" "));

const inventoryRows = manifest.fixtures.map((fixture) => {
  const item = byId[fixture.id];
  const complexity = item.complexity;
  return [
    fixture.id,
    `${fixture.width}×${fixture.height}`,
    fixture.frameRate ?? "—",
    fixture.durationMs ? `${Math.round(fixture.durationMs)} ms` : "—",
    complexity ? `${complexity.nodes} n / ${complexity.tracks} t` : "—",
    `${item.timingsMs.import.toFixed(1)} / ${item.timingsMs.compile.toFixed(1)}`,
  ];
});
children.push(table(["ID", "Size", "fps", "Duration", "Scene", "Import / compile ms"], inventoryRows, [900, 1600, 800, 1600, 2200, 2600]));
children.push(text("Scene counts are the production scene when one was accepted, otherwise the diagnostic scene (LOT-03, SVG-01, SVG-02). LOT-01 has neither. Import and compile times are the production calls. Compile is 0 when emit did not run."));
children.push(text("Pack inventory: the lottie directory had seven JSON files and no SVG, archive, or subfolder. The svg directory had two SVG files and no archive. The baseline JSON was supplied separately. Copies and SHA-256 values are in evidence/manifest.json and evidence/sources/."));

children.push(h1("4. Findings"));
children.push(text("Each finding separates the observed fact from the cause. Downstream pictures are not counted as extra root causes when they follow a dropped precomp or a rejected scene."));

const findings = [
  {
    id: "F-01",
    title: "Named easing moves the baseline pan off the reference at the quarter points",
    fixtures: "LOT-00",
    stage: "import interpretation; MotionScript expressiveness",
    severity: "Medium",
    impact: "The landscape is complete, but clouds, trees, and hills are in a different place at 25% and 75%.",
    expected: "Position along the Lottie cubic at those frames.",
    observed: "Start fraction beyond threshold 0.00010, mean distance 1.09. At 25%: 0.131, mean 15.2. At 50%: 0.00014, mean 1.07. At 75%: 0.144, mean 18.5. Near end: 0.010. The centre pixel at 25% is hill green in the reference (30, 96, 51) and mountain blue in the native frame (92, 115, 148).",
    diagnostic: "IMPORT_APPROXIMATED: Bezier easing on layer_100.transform.position.x was mapped to Scene IR easing names. The same note is emitted for position.y. Six approximated diagnostics, zero unsupported. Compile and runtime succeed. 55 nodes, 6 tracks, 26 draw items.",
    source: "Baseline composition, 1280×720, 30 fps, frames 0–240, 8000 ms. The only motion diagnostics are those easing notes.",
    cause: "Confirmed. The adapter maps non-matching cubics to easeInOut (normalise.ts mapEasing). The pictures meet at the key samples and separate between them, which is what that mapping does. Confidence high.",
    evidence: "evidence/captures/LOT-00/q25-strip.png, evidence/captures/LOT-00/q50-strip.png, evidence/fixtures/LOT-00/import-diagnostics.json",
  },
  {
    id: "F-02",
    title: "Precomp layers are not expanded, so several files lose their artwork",
    fixtures: "LOT-01, LOT-02, LOT-03, LOT-04, LOT-05",
    stage: "import interpretation",
    severity: "High",
    impact: "LOT-01 has no picture. LOT-04 loses the word list. LOT-05 loses the play button and keeps a white rectangle. LOT-02 loses the nested text precomp and keeps a broken button.",
    expected: "Precomp contents painted in the root, as in lottie-web.",
    observed: "Root layer counts: LOT-01 one precomp and nothing else. LOT-04 one precomp plus two shape layers, native draw items 2, zero tracks. LOT-05 one precomp plus one shape, native draw items 1. LOT-02 one precomp plus text plus shapes. Asset layer counts are in the inventory and are not imported.",
    diagnostic: "IMPORT_UNSUPPORTED: Layer type 0 is outside the v0.1 subset. LOT-01 also has IMPORT_UNSUPPORTED scene: No supported layers were found. Production scene is absent for LOT-01.",
    source: "$.layers entries with ty 0. Example names: LOT-01 asset comp_0; LOT-04 root layer named Text; LOT-05 root layer named Play button; LOT-02 root layer Edit Text Here 1.",
    cause: "Confirmed. parse.ts maps ty other than 1, 3, and 4 to unsupported and does not read assets[].layers. The reference frames show the missing artwork, so this is not only an unsupported message. Confidence high.",
    evidence: "evidence/captures/LOT-01/q25-reference.png, evidence/captures/LOT-04/q50-strip.png, evidence/captures/LOT-05/q25-strip.png",
  },
  {
    id: "F-03",
    title: "The 512 KiB import limit rejects lottie_ex1 before parse",
    fixtures: "LOT-03",
    stage: "budget",
    severity: "High",
    impact: "No production MotionScript, compile, runtime, or render. The diagnostic scene that was rendered is a white field, and the reference is blank, so the white field is not a compared picture.",
    expected: "The file is parsed, then unsupported features are reported.",
    observed: "Source is 877884 bytes. The default limit is 524288. importSource returns IMPORT_LIMIT: Source exceeds the import size limit. in 0.68 ms, with no scene. A diagnostic call that skips that gate validates, emits 2157 characters, compiles with no diagnostics, and evaluates 8 draw items. Those 8 items are 1 rectangle and 7 ellipses from the root, with 0 tracks. The reference PNG is 1080×689, every sample identical, corner pixel (16, 16, 20).",
    diagnostic: "Browser log: Uncaught TypeError: Cannot read properties of undefined (reading 's').",
    source: "lottie_ex1.json, 1080×689, 60 fps, 7116.7 ms. Root is seven precomps, eight shapes, and one solid. Assets hold 168 shape layers, 7 precomps, and 7 text layers.",
    cause: "Confirmed for the production stop: format-import-core registry compares source bytes with maxSourceBytes before parse. The empty reference is a separate player failure (F-12). The diagnostic white frame is consistent with a root solid plus precomps not being expanded; that part was not compared to a real reference frame. Confidence high on the limit, low on the visual match.",
    evidence: "evidence/fixtures/LOT-03/import-diagnostics.json, evidence/fixtures/LOT-03/diagnostic-scene.json, evidence/captures/LOT-03/start-strip.png, evidence/captures/LOT-03/browser-log.txt",
  },
  {
    id: "F-04",
    title: "Text layers and named fonts are dropped",
    fixtures: "LOT-02, LOT-04, LOT-05, and asset text in LOT-03",
    stage: "import interpretation; resources",
    severity: "High",
    impact: "LOT-04's picture is the type. It is absent natively. LOT-02's label is absent. Fonts are never requested.",
    expected: "Glyphs in Host Grotesk, Inter Tight, or Haskoy.",
    observed: "Inventory fonts: LOT-02 Host Grotesk and HostGrotesk-Bold (2 text layers). LOT-04 Inter Tight / InterTight-Medium (13 text layers, all inside assets). LOT-05 Haskoy (3 text layers inside the precomp). No font resource is attached to the accepted scenes. Native frames show no glyphs.",
    diagnostic: "IMPORT_UNSUPPORTED: Layer type 5 is outside the v0.1 subset. Text inside a precomp is not reached, so LOT-04 and LOT-05 do not emit a text diagnostic; the precomp diagnostic is the one that fires.",
    source: "$.layers ty 5, and $.assets[].layers ty 5.",
    cause: "Confirmed for root text. For text inside precomps, the text loss is a consequence of F-02, not a second parser result. Confidence high.",
    evidence: "evidence/captures/LOT-04/q50-strip.png, evidence/fixtures/LOT-02/import-diagnostics.json",
  },
  {
    id: "F-05",
    title: "Animated path geometry is omitted, so the figure and the wave lose their motion",
    fixtures: "LOT-06, LOT-07",
    stage: "import interpretation; MotionScript expressiveness",
    severity: "High",
    impact: "Punches shows fragments of a body on the wrong background and does not hold the punch pose. Wave keeps dots and loses the coloured rings. Native wave frames are identical across the cycle; the reference frames are not.",
    expected: "Path shapes follow their keyframed vertices, and gradient strokes draw the rings.",
    observed: "LOT-06: 24 IMPORT_UNSUPPORTED sh.animated notes, 39 easing approximations, 79 nodes, 39 tracks, 13 draw items. Reference corner (245, 245, 245), native corner (16, 16, 20). LOT-07: 5 animated-path notes, 6 gradient-stroke notes, 0 tracks, 17 draw items, one native hash across five times, five distinct reference hashes.",
    diagnostic: "Animated path geometry is outside the v0.1 subset. Shape item gs is outside the v0.1 subset.",
    source: "Shape ty sh with ks.a 1. LOT-07 also has shape ty gs.",
    cause: "Confirmed. parse-shapes.ts returns unsupported when ks.a === 1 and does not build a path. There is no path track in Scene IR, so this is both an importer stop and a representation gap. The gradient-stroke loss is independent and accounts for the missing ring colour even on static paths. Confidence high.",
    evidence: "evidence/captures/LOT-06/q50-strip.png, evidence/captures/LOT-07/q50-strip.png",
  },
  {
    id: "F-06",
    title: "A solid colour written as a hex string produces an empty group",
    fixtures: "LOT-06",
    stage: "source parsing",
    severity: "Medium",
    impact: "The native frame sits on #101014. The reference sits on #f5f5f5, which is the solid in the file. Most of the pixel error is this background plus the broken body.",
    expected: "A 720×720 rectangle filled #f5f5f5 behind the figure.",
    observed: "Compiled scene has group layer_23 at zIndex 0 and no child rectangle. Corner pixel of the native frame is the importer background (16, 16, 20).",
    diagnostic: "No diagnostic mentions the solid. The layer is counted as supported and then not given geometry.",
    source: "Punches.json layers[22], nm White Solid 1, ty 1, sw 720, sh 720, sc \"#f5f5f5\".",
    cause: "Confirmed. parse.ts readRgb accepts only a numeric array. A hex string leaves solidColor undefined, and normalise.ts skips lowerSolid. The docs describe sc as RGB [0..1]×3, so a hex string is outside that reading, but it is a real Bodymovin encoding and it fails silently. Confidence high.",
    evidence: "evidence/fixtures/LOT-06/compiled-scene.json layer_23, evidence/captures/LOT-06/q50-reference.png",
  },
  {
    id: "F-07",
    title: "Rounded corners, gradients, and trim remove the hover button's chrome",
    fixtures: "LOT-02",
    stage: "import interpretation",
    severity: "High",
    impact: "The reference is a blue pill, cursor, and side blobs. The native frame is a dark oval, three dots, and a cursor, without the label or the pill.",
    expected: "Rounded rectangle, gradient fills, and trim, plus the text from F-04.",
    observed: "Diagnostics: rc.r ×9, tm ×4, gf ×2, layer type 5 ×1, layer type 0 ×1, plus 16 easing approximations. 50 nodes, 24 tracks, draw items 6 to 9 across the cycle. Both sides do animate (five distinct hashes each).",
    diagnostic: "Rounded rectangle corners are outside the v0.1 subset. Shape item tm is outside the v0.1 subset. Shape item gf is outside the v0.1 subset.",
    source: "Hover Button.json, 1920×1080, 30 fps, 7533 ms. Root names include Button, Rectangle, Gradien blur, Stroke mask, cursor, Dot 1–3, Edit Text Here 2.",
    cause: "Confirmed as a set of reported omissions. Mattes and effects in the same file are a separate silent gap (F-08) and were not isolated. Confidence high that the pill and label are absent for the reported reasons.",
    evidence: "evidence/captures/LOT-02/q50-strip.png, evidence/fixtures/LOT-02/import-diagnostics.json",
  },
  {
    id: "F-08",
    title: "Mattes, effects, and spatial tangents are present and not reported",
    fixtures: "LOT-02, LOT-03, LOT-05, LOT-06",
    stage: "import interpretation",
    severity: "Medium",
    impact: "Not isolated. These files already fail for reported features, so the picture does not prove the visual weight of the silence.",
    expected: "The unsupported document says mattes, effects, and spatial tangents produce an unsupported diagnostic.",
    observed: "Inventory: LOT-02 mattes 3, effects 5, spatial tangents 47. LOT-03 mattes 18. LOT-05 mattes 4. LOT-06 spatial tangents 47. None of those strings appear in the import diagnostics. Masks, skew, and auto-orient counts are 0 in this pack.",
    diagnostic: "No IMPORT_UNSUPPORTED for tt, ef, ti, or to.",
    source: "Layer field tt, layer field ef, and keyframe fields ti/to on ks.p.",
    cause: "Confirmed for the omission. parse.ts records masks, skew, and auto-orient only. readVec2Property copies keyframe s and does not read ti/to. Whether each one would have been visible on top of the other failures was not separated. Confidence high on the missing diagnostic, medium on visual contribution.",
    evidence: "evidence/results.json inventories; packages/format-lottie/src/parse.ts; packages/format-lottie/src/property.ts",
  },
  {
    id: "F-09",
    title: "SVG SMIL is lowered to a static scene with no tracks",
    fixtures: "SVG-01, SVG-02",
    stage: "MotionScript expressiveness; import interpretation",
    severity: "High",
    impact: "Celebrations confetti does not travel. Jumping Jack stays in the rest pose while the reference raises the arms.",
    expected: "One cycle of the SMIL timeline: 4.033 s for celebrations, 1 s for the jack.",
    observed: "Lexical counts: SVG-01 animate 201, animateTransform 136, animateMotion 54, set 74, dur 4.033s and 0.033s, repeatCount indefinite. SVG-02 animateTransform 106, animate 37, dur 1s, five embedded PNG images, one clipPath. Both diagnostic scenes have 0 tracks and one native hash across the cycle. Reference hashes: SVG-01 five distinct of six samples, SVG-02 seven of seven. SVG-02 start fraction beyond threshold is 0.0057 and the torso pixel matches (214, 98, 39). At 50% and at key 0.60 the reference pose changes and the native pose does not.",
    diagnostic: "IMPORT_UNSUPPORTED for animate, animateTransform, and animateMotion on the elements the walker visits (SVG-01: 101, 68, and 27). The lexical counts are higher because elements under the dropped defs subtree are not visited one by one. Static SVG uses a 1000ms duration is also reported.",
    source: "Celebrations Begin.svg viewBox 0 0 400 400, width and height 100%. Jumping Jack.svg viewBox 0 0 720 720, width and height 100%. No script, style block, or foreignObject.",
    cause: "Confirmed. The SVG adapter has no animation lowering. Percent width and height fall through to the viewBox in parse.ts, so the viewport still resolves. The 100% size is not what blocks the scene. Confidence high.",
    evidence: "evidence/captures/SVG-01/q25-strip.png, evidence/captures/SVG-02/q50-strip.png, evidence/captures/SVG-02/start-strip.png",
  },
  {
    id: "F-10",
    title: "SVG node and depth budgets reject the static trees",
    fixtures: "SVG-01, SVG-02",
    stage: "compiler / validation",
    severity: "High",
    impact: "Production import returns no scene, so emit, compile, and native render are NOT_REACHED. The diagnostic canvases exist only as extra evidence.",
    expected: "A static snapshot if the node and depth limits allowed it. It would still not animate (F-09).",
    observed: "SVG-01 diagnostic scene: 564 nodes, depth 8, 95 draw items at t=0. validateSceneIR: Node count 564 exceeds 500. Emit succeeds (60617 chars) and compile fails with the same limit. SVG-02: 185 nodes, depth 20, 37 draw items. Hierarchy depth 20 exceeds 16. Emit succeeds (42893 chars) and compile fails the same way. Runtime.evaluate does not re-check the budget and did draw those diagnostic frames.",
    diagnostic: "IMPORT_INVALID_IR after the unsupported SMIL notes. The fidelity object is partial before validation; importSource then drops the scene and reports failed.",
    source: "Group nesting in the two SVGs. Jumping Jack's depth is the transform groups around the limbs.",
    cause: "Confirmed. The budget is the earliest production block. SMIL loss is independent and would remain if the limits were higher. Confidence high.",
    evidence: "evidence/fixtures/SVG-01/import-diagnostics.json, evidence/fixtures/SVG-02/import-diagnostics.json, evidence/fixtures/SVG-01/diagnostic.motion",
  },
  {
    id: "F-11",
    title: "Embedded SVG images and a clipPath are outside the static snapshot",
    fixtures: "SVG-02, SVG-01",
    stage: "resources; import interpretation",
    severity: "Low",
    impact: "At the Jumping Jack rest pose the torso matches and about 0.6% of pixels differ. That remainder is consistent with the embedded shoe images and the clip, and it was not isolated further.",
    expected: "Five data-URI PNGs painted, and the clipPath applied.",
    observed: "SVG-02 importer notes include image ×2. Lexical image tags: 5, all the same data URI. Both files have one clipPath inside defs. defs is dropped as a whole, so the clip is not applied and is not given its own diagnostic.",
    diagnostic: "IMPORT_UNSUPPORTED: <image> is outside the SVG subset. IMPORT_DROPPED: <defs> has no painted result.",
    source: "Jumping Jack.svg image href data:image/png;base64. clipPath is the single defs child in each file.",
    cause: "Confirmed for the missing image primitive. The clip's visual share was not measured separately. Confidence high on the omission, medium on how much of the 0.6% it explains.",
    evidence: "evidence/fixtures/SVG-02/import-diagnostics.json, evidence/captures/SVG-02/start-strip.png",
  },
  {
    id: "F-12",
    title: "lottie-web canvas throws on lottie_ex1 and draws nothing",
    fixtures: "LOT-03",
    stage: "reference player",
    severity: "High",
    impact: "No reference picture for the largest file. This is not a MotionScript result.",
    expected: "The tool demo animating in lottie-web 5.13 canvas.",
    observed: "Five identical 1080×689 frames, corner (16, 16, 20), which is the compositing fill behind a transparent canvas. Console: Cannot read properties of undefined (reading 's').",
    diagnostic: "evidence/captures/LOT-03/browser-log.txt",
    source: "lottie_ex1.json",
    cause: "Observed player failure. Cause inside lottie-web was not traced. A SVG renderer retry was not run. Confidence high that the frames are empty, low on the player bug's root.",
    evidence: "evidence/captures/LOT-03/start-reference.png",
  },
];

for (const finding of findings) {
  children.push(h2(`${finding.id}. ${finding.title}`));
  children.push(text(`Fixtures: ${finding.fixtures}. Stage: ${finding.stage}. Severity: ${finding.severity}.`));
  children.push(text(`Visual impact: ${finding.impact}`));
  children.push(text(`Expected: ${finding.expected}`));
  children.push(text(`Observed: ${finding.observed}`));
  children.push(text(`Diagnostic: ${finding.diagnostic}`));
  children.push(text(`Source: ${finding.source}`));
  children.push(text(`Cause: ${finding.cause}`));
  children.push(text(`Evidence: ${finding.evidence}`));
}

children.push(h2("Representative frames"));
children.push(text("Strips are reference, native, then the diff. Red marks pixels whose Euclidean RGB distance is above 24. Grey is the reference where the two sides are within that tolerance. LOT-01 has no native frame, so the figure is the reference alone."));
figure("captures/LOT-00/q50-strip.png", "LOT-00 at 50%. Reference, native, diff. The pan matches here. evidence/captures/LOT-00/q50-strip.png");
figure("captures/LOT-00/q25-strip.png", "LOT-00 at 25%. The diff lights clouds, trees, and hill edges. evidence/captures/LOT-00/q25-strip.png");
figure("captures/LOT-01/q25-reference.png", "LOT-01 reference at 25%. Confetti plays in lottie-web. There is no native frame. evidence/captures/LOT-01/q25-reference.png");
figure("captures/LOT-02/q50-strip.png", "LOT-02 at 50%. The pill, label, and gradient are missing natively. evidence/captures/LOT-02/q50-strip.png");
figure("captures/LOT-04/q50-strip.png", "LOT-04 at 50%. The reference is the word list. The native pane does not carry those glyphs. evidence/captures/LOT-04/q50-strip.png");
figure("captures/LOT-05/q25-strip.png", "LOT-05 at 25%. Native output is the white rectangle. evidence/captures/LOT-05/q25-strip.png");
figure("captures/LOT-06/q50-strip.png", "LOT-06 at 50%. Reference punch on #f5f5f5. Native fragments on #101014. evidence/captures/LOT-06/q50-strip.png");
figure("captures/LOT-07/q50-strip.png", "LOT-07 at 50%. Rings are in the reference only. Native dots do not move across the cycle. evidence/captures/LOT-07/q50-strip.png");
figure("captures/LOT-03/start-strip.png", "LOT-03 at the start. Reference is empty. The white pane is the diagnostic scene, not production playback. evidence/captures/LOT-03/start-strip.png");
figure("captures/SVG-01/q25-strip.png", "SVG-01 at 25% of 4.033 s. Reference confetti versus the diagnostic static cluster. Production render was not reached. evidence/captures/SVG-01/q25-strip.png");
figure("captures/SVG-02/start-strip.png", "SVG-02 at the start of the 1 s cycle. Rest pose is close. evidence/captures/SVG-02/start-strip.png");
figure("captures/SVG-02/q50-strip.png", "SVG-02 at 50%. Reference arms are up. The diagnostic native pose is unchanged. evidence/captures/SVG-02/q50-strip.png");

children.push(h1("5. Capability coverage"));
children.push(text("Tested support means a pack fixture exercised the feature and the native frame agreed with the reference on that feature. Partial means the feature was exercised and the frame changed or dropped it. Unsupported means the implementation refused it and the picture shows the refusal. Untested means the pack does not contain the feature."));
const matrix = [
  ["Composition timing, viewport", "All accepted Lottie scenes", "Tested support", "Duration matches (op-ip)/fr. LOT-04 height is fractional."],
  ["Shape, null, parenting, static paint", "LOT-00", "Tested support", "Match at 0% and 50%. 26 draw items."],
  ["Position keyframes", "LOT-00, LOT-02, LOT-06", "Partial", "Tracks exist. Quarter-cycle positions differ where easing was renamed."],
  ["Bezier easing to named easing", "LOT-00", "Partial", "Documented approximation. Visible on this file."],
  ["Hold keyframes", "LOT-06 has 2", "Untested in isolation", "Buried under the broken body."],
  ["Precomp ty 0", "LOT-01, 02, 03, 04, 05", "Unsupported", "Reported. Artwork missing."],
  ["Text ty 5 and fonts", "LOT-02, 04, 05", "Unsupported", "Root text reported. Fonts never loaded."],
  ["Image ty 2", "None in pack", "Untested", "SVG images are a different finding."],
  ["Solid ty 1, array colour", "LOT-03 diagnostic white solid", "Untested against a good reference", "Reference player failed."],
  ["Solid ty 1, hex sc", "LOT-06 #f5f5f5", "Unsupported, silent", "Empty group, default background remains."],
  ["Rounded rect, gradient, trim", "LOT-02, LOT-07 gs", "Unsupported", "Reported. Chrome or rings missing."],
  ["Animated path", "LOT-06, LOT-07", "Unsupported", "Reported. No path tracks."],
  ["Masks", "Count 0", "Untested", "Docs say unsupported."],
  ["Mattes tt", "LOT-02, 03, 05", "Present, not reported", "Docs say unsupported. No diagnostic."],
  ["Effects ef", "LOT-02 has 5", "Present, not reported", "No diagnostic."],
  ["Spatial tangents ti/to", "LOT-02, LOT-06", "Present, not reported", "Straight keyframes instead."],
  ["Skew, auto-orient, expressions, blends, 3D", "Count 0", "Untested", ""],
  ["SMIL animate / transform / motion", "SVG-01, SVG-02", "Unsupported", "Zero tracks. Reference moves."],
  ["CSS animation, scripts, foreignObject", "None in these SVGs", "Untested", "The script regex did not fire on either file."],
  ["SVG image, clipPath", "SVG-02, both clipPaths", "Unsupported", "defs dropped as a unit."],
  ["SVG static geometry", "SVG-02 at t=0", "Partial, then rejected", "Rest pose is close. Depth 20 drops the scene."],
  ["Node, depth, and byte budgets", "LOT-03, SVG-01, SVG-02", "Enforced", "512 KiB, 500 nodes, depth 16. These three hit them."],
  ["Runtime sample and canvas draw", "Every accepted scene", "Tested support", "evaluate and CanvasRenderer ran. Draw times are below 20 ms per sample here."],
];
children.push(table(["Feature", "Where seen", "Result", "Note"], matrix, [2800, 2600, 2200, 3600]));
children.push(text(" "));

children.push(h1("6. Failure map"));
children.push(text("Arrows mean the later item does not get a chance, or only gets a chance on a diagnostic object. Independent items can both be true."));
const mapRows = [
  ["Precomp not expanded", "Import", "LOT-01 blocks here. LOT-02, 04, 05 still compile a remnant.", "Text and shapes inside assets are a consequence, not a second import of those layers."],
  ["Byte limit", "Budget, before parse", "LOT-03 production stops here.", "Diagnostic parse then hits the precomp gap and still compiles a root-only scene."],
  ["Hex solid colour", "Parse", "LOT-06", "Independent of the animated-path loss on the same file."],
  ["Animated paths", "Import / representation", "LOT-06, LOT-07", "Independent of gradients on LOT-07."],
  ["Gradients, trim, rounded rect, root text", "Import", "LOT-02, and gs on LOT-07", "Independent of each other. Together they remove the button chrome."],
  ["Silent matte, effect, spatial tangent", "Import", "LOT-02, 03, 05, 06", "Not separated from the reported failures."],
  ["SMIL ignored", "Import / language", "SVG-01, SVG-02", "Independent of the budgets. A larger budget would still be static."],
  ["Node limit 500", "Validation", "SVG-01", "Drops the scene after the SMIL notes."],
  ["Depth limit 16", "Validation", "SVG-02", "Drops the scene after the SMIL notes."],
  ["Reference player exception", "lottie-web", "LOT-03", "Independent of the import limit."],
];
children.push(table(["Group", "Owning stage", "Fixtures", "Dependency"], mapRows, [2600, 2000, 3200, 3400]));
children.push(text(" "));

children.push(h1("7. Gaps and open questions"));
children.push(bullet("Is a root that contains only a precomp supposed to fail closed, as LOT-01 does, or should the asset's layers be walked?"));
children.push(bullet("The solid-colour reader accepts an RGB array and ignores a hex string. Punches uses the hex form. Is that encoding in the v0.1 subset or an input the parser should reject out loud?"));
children.push(bullet("Mattes, effects, and spatial tangents are in the unsupported document and in these files, and they produce no diagnostic. Was that silence intentional?"));
children.push(bullet("The 512 KiB check runs before parse. LOT-03 is 877884 bytes and never reaches the precomp diagnostic on the production route. Is the limit meant to apply to authored Lottie JSON?"));
children.push(bullet("SVG-01 is 564 nodes and SVG-02 is depth 20 after a static lower that also discards SMIL. The budgets are what remove the scene. The missing animation would remain if the budgets moved."));
children.push(bullet("On the baseline, easeInOut in place of the authored cubic is visible at 25% and 75% and invisible at 0%, 50%, and the end. Is that the accepted approximation, or is the cubic required?"));
children.push(bullet("LOT-03 has no trustworthy reference frame. The canvas renderer threw, and a second renderer was not run."));
children.push(bullet("The Lottie time-control micro-fixture did not change pixels. The supplied files, except LOT-03, did. The micro-fixture should be treated as inconclusive."));
children.push(bullet("This pack does not contain a mask, a skew, an expression, a blend mode, a Lottie image layer, a CSS animation, or a script. Those rows stay untested."));
children.push(bullet("There is no commit SHA. Repeating the run after any edit to packages/ needs a new capture."));

children.push(h1("Evidence index"));
children.push(bullet("evidence/manifest.json — fixture ids, sizes, hashes, source paths."));
children.push(bullet("evidence/results.json — per-stage production results, inventories, timings."));
children.push(bullet("evidence/outcomes.json — judged overall and reference status."));
children.push(bullet("evidence/render-results.json — frame metrics, controls, browser notes."));
children.push(bullet("evidence/environment.json — versions and commands."));
children.push(bullet("evidence/fixtures/<id>/ — import report, MotionScript, scenes, diagnostics."));
children.push(bullet("evidence/captures/<id>/ — reference, native, diff, and strip PNGs."));
children.push(bullet("evidence/sources/ — unmodified copies of the ten inputs."));
children.push(bullet("harness/run-pipeline.ts, continue-diagnostic.ts, drive-browser.ts, render/main.ts, write-report.mjs."));

const document = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE, width: 15840, height: 12240 },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children,
    },
  ],
});

const buffer = await Packer.toBuffer(document);
const out = resolve(root, "MotionScript_Animation_Compatibility_Report.docx");
writeFileSync(out, buffer);
console.log(out, buffer.length);
console.log("outcomes", JSON.stringify(counts), "reference", JSON.stringify(referenceCounts));
