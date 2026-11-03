import {
  Telemetry,
  DEFAULT_LIMITS,
  DSL_VERSION,
  DSL_VERSION_02,
  IR_VERSION,
  IR_VERSION_02,
  diagnostic,
  estimateGenerativeAudioDurationMs,
  isKnownCapability,
  localTimeMs,
  parseExpression,
  resolveAddress,
  validateSceneIR,
  type AudioGenerativeSource,
  type AudioResourceDefinition,
  type Diagnostic,
  type Expr,
  type InteractionTarget,
  type PathAttachment,
  type NodeDefinition,
  type PathCommand,
  type RuntimeOperation,
  type SceneHeader,
  type SceneIR,
  type SceneIRDelta,
  type SegmentEasing,
  type Paint,
  type SourceSpan,
  type Stroke,
  type TrackDefinition,
  type Transform,
  type Vec2,
} from "@gvr/schema";
import type { AnimLiteral, AudioDeclAst, AudioGenerativeFields, AudioSugarAst, EaseAst, HeaderAst, NodeAst, ProgramAst, Prop, UnitAst } from "./ast";
import type { EntityPatchOp } from "@gvr/schema";
import {
  emitEntityStatementDelta,
  isEntityStatement,
  lowerEntityStatement,
} from "./entity-statements";
import { parseMotionScript } from "./parse";

const BUILTINS = new Set(["PI", "t", "local_t", "progress", "sin", "cos", "abs", "sqrt", "min", "max", "pow", "clamp", "lerp"]);

export interface CompileResult {
  ok: boolean;
  scene?: SceneIR;
  diagnostics: Diagnostic[];
  sealedThroughMs: number;
  completed: boolean;
  deltas: SceneIRDelta[];
}

export interface Session {
  telemetry?: Telemetry;
  scene: SceneIR;
  constants: Map<string, number>;
  sealedThroughMs: number;
  trackCount: number;
  stepCount: number;
  fontCount: number;
  diagnostics: Diagnostic[];
  /** Base nodes, constants and the camera stay fixed after the first seal. */
  frozen: boolean;
  deferred: UnitAst[];
  revision: number;
  /** Nested APPLY_ENTITY_PATCH revision counter (independent of scene delta revision). */
  entityPatchRevision: number;
  /** Entity ops deferred while applying a batch (emitDelta false). */
  pendingEntityOps: EntityPatchOp[];
  unitSerial: number;
  parsedUnits: number;
  deltas: SceneIRDelta[];
  pendingDeltas: SceneIRDelta[];
  authoringComplete: boolean;
  headerSpan: SourceSpan;
  /** Counter for anonymous audio.narration / audio.effects sugar ids. */
  generativeSugarCount: number;
  /**
   * Node ids removed by a rejected unit/batch. Later UNKNOWN_TARGET diagnostics that
   * only name these ids are cascade noise and are suppressed (E017 / A15).
   */
  rejectedNodeIds: Set<string>;
}

/** Compile one complete MotionScript file. A rejected unit leaves the accepted scene unchanged. */
export function compileMotionScript(source: string, telemetry?: Telemetry): CompileResult {
  const run = () => {
    const bytes = new TextEncoder().encode(source).byteLength;
    telemetry?.count('compile.source_bytes', bytes);
    if (bytes > DEFAULT_LIMITS.maxSourceBytes) {
      const issue = diagnostic({code: 'RESOURCE_LIMIT', phase: 'compile', category: 'resource', effect: 'PROGRAM_FATAL', message: `Source exceeds ${DEFAULT_LIMITS.maxSourceBytes} bytes.`});
      telemetry?.count('compile.rejected_sources');
      return {ok:false, diagnostics:[issue], sealedThroughMs:0, completed:false, deltas:[]};
    }
    const program = telemetry ? telemetry.measure('compile.lex_parse_ms', () => parseMotionScript(source)) : parseMotionScript(source);
    return compileProgram(program, telemetry);
  };
  return telemetry ? telemetry.measure('compile.total_ms', run) : run();
}

export function compileProgram(program: ProgramAst, telemetry?: Telemetry): CompileResult {
  const diagnostics = [...program.diagnostics];
  const header = program.header;
  if (!header || header.errors.length > 0 || !headerOk(header, diagnostics)) {
    return { ok: false, diagnostics, sealedThroughMs: 0, completed: false, deltas: [] };
  }
  const session = createSession(header, diagnostics);
  session.telemetry = telemetry;
  emitCreate(session, header.span);
  for (const unit of program.units) pushUnit(session, unit);
  return finishSession(session, program.completed);
}

/** Live compiler used by the fragment feeder. The header must already be valid. */
export function openSession(header: HeaderAst, diagnostics: Diagnostic[] = [], telemetry?: Telemetry): Session {
  const session = createSession(header, diagnostics);
  session.telemetry = telemetry;
  emitCreate(session, header.span);
  return session;
}

export function pushUnit(session: Session, unit: UnitAst): void {
  session.parsedUnits += 1;
  session.telemetry?.count("compile.units_seen");
  if (session.authoringComplete) {
    session.telemetry?.count("compile.rejected_units");
    session.diagnostics.push(problem("INVALID_TYPE", "Units cannot follow complete;.", unit.span));
    return;
  }
  if (session.deferred.length > 0 && unit.kind === "seal") {
    session.telemetry?.count("compile.rejected_units");
    blockSeal(session, unit, `Seal at ${unit.timeMs}ms is blocked by an unresolved reference.`);
    return;
  }
  if (isUnresolved(session, unit)) {
    if (unitHitsRejectedTarget(session, unit)) {
      // Primary rejection already reported; do not cascade UNKNOWN_TARGET.
      return;
    }
    if (session.deferred.length >= DEFAULT_LIMITS.maxDeferredUnits) {
      session.telemetry?.count("compile.rejected_units");
      session.diagnostics.push(problem("RESOURCE_LIMIT", "Too many deferred units.", unit.span));
      return;
    }
    session.deferred.push(unit);
    session.telemetry?.gauge("compile.deferred_units", session.deferred.length);
    return;
  }
  if (applyUnit(session, unit, true)) retryDeferred(session);
}

export function finishSession(session: Session, sourceCompleted: boolean, span?: SourceSpan): CompileResult {
  const unresolved = session.deferred.splice(0);
  session.telemetry?.gauge("compile.deferred_units", 0);
  session.telemetry?.count("compile.unresolved_units", unresolved.length);
  session.telemetry?.count("compile.rejected_units", unresolved.length);
  for (const unit of unresolved) {
    if (unitHitsRejectedTarget(session, unit)) continue;
    if (unit.kind === "instance") {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved composition ${unit.definition}.`, unit.span));
      continue;
    }
    if (unit.kind === "operators" || unit.kind === "interact") {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved node ${unit.nodeId}.`, unit.span));
      continue;
    }
    if (unit.kind === "attach") {
      const missing = missingAttachNode(session, unit);
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved node ${missing ?? unit.nodeId}.`, unit.span));
      continue;
    }
    if (unit.kind === "spatialLayer") {
      const missing = missingSurfaceNode(session, unit);
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved node ${missing ?? unit.layer.id}.`, unit.span));
      continue;
    }
    if (unit.kind === "physics") {
      const missing = missingPhysicsEntity(session, unit);
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved node ${missing ?? unit.world.id}.`, unit.span));
      continue;
    }
    if (unit.kind === "cue") {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved audio resource ${unit.cue.resourceId}.`, unit.span));
      continue;
    }
    if (unit.kind === "timing") {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved timing parent ${unit.parent ?? ""}.`, unit.span));
      continue;
    }
    if (unit.kind === "node" && unit.shape === "group") {
      const missing = missingClipTarget(session, unit);
      if (missing !== undefined) {
        session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved clip geometry ${missing}.`, unit.span));
      }
      continue;
    }
    if ((unit.kind === "animate" || unit.kind === "keyframes") && unit.timingScopeId) {
      if (!session.scene.timingScopes?.some((scope) => scope.id === unit.timingScopeId)) {
        session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved timing scope ${unit.timingScopeId}.`, unit.span));
        continue;
      }
    }
    if (unit.kind !== "animate" && unit.kind !== "keyframes" && unit.kind !== "step") continue;
    if (waitsForAttachment(session, unit)) {
      session.diagnostics.push(problem("INVALID_TRACK_TARGET", `${unit.target} needs a path attachment on its node.`, unit.span));
      continue;
    }
    const resolved = resolveAddress(
      unit.target,
      session.scene.nodes.map((node) => node.id),
      ["main"],
    );
    session.diagnostics.push(
      problem(
        resolved.ok ? "UNKNOWN_TARGET" : resolved.code,
        resolved.ok ? `Unresolved reference ${unit.target}.` : resolved.message,
        unit.span,
      ),
    );
  }
  if (!sourceCompleted) {
    session.diagnostics.push(
      diagnostic({
        code: "MISSING_REQUIRED",
        phase: "compile",
        category: "syntax",
        effect: "UNIT_REJECTED",
        message: "The program has no complete;.",
        sourceSpan: span,
      }),
    );
  }
  const validated = measured(session, 'compile.validate_ms', () => validateSceneIR(session.scene));
  if (!validated.ok) session.diagnostics.push(...validated.diagnostics);
  const honorComplete = sourceCompleted && unresolved.length === 0 && validated.ok;
  if (honorComplete) {
    session.sealedThroughMs = Math.max(session.sealedThroughMs, session.scene.timeline.durationMs);
    session.authoringComplete = true;
    session.frozen = true;
    emit(session, [{ op: "COMPLETE_PROGRAM" }], span ?? session.headerSpan);
  }
  const ok = session.diagnostics.length === 0 && session.authoringComplete && validated.ok;
  return {
    ok,
    scene: session.scene,
    diagnostics: session.diagnostics,
    sealedThroughMs: session.sealedThroughMs,
    completed: session.authoringComplete,
    deltas: session.deltas,
  };
}

export function drainDeltas(session: Session): SceneIRDelta[] {
  const deltas = session.pendingDeltas;
  session.pendingDeltas = [];
  session.telemetry?.gauge("compile.pending_deltas", 0);
  return deltas;
}

function retryDeferred(session: Session): void {
  if (session.deferred.length === 0) return;
  // Repeat while a pass accepts a unit: a deferred unit (a path.progress track)
  // may wait on another deferred unit (its attach) that sits later in the queue.
  let accepted = true;
  while (accepted && session.deferred.length > 0) {
    accepted = false;
    const pending = session.deferred;
    session.deferred = [];
    for (const unit of pending) {
      if (isUnresolved(session, unit)) {
        session.deferred.push(unit);
        session.telemetry?.gauge("compile.deferred_units", session.deferred.length);
        continue;
      }
      if (applyUnit(session, unit, true)) accepted = true;
    }
  }
  session.telemetry?.gauge("compile.deferred_units", session.deferred.length);
}

function isUnresolved(session: Session, unit: UnitAst): boolean {
  if (unit.errors.length > 0) return false;
  if (unit.kind === "instance") {
    return !session.scene.compositions?.some((composition) => composition.id === unit.definition);
  }
  if (unit.kind === "operators") return !knownNodeIds(session).has(unit.nodeId);
  if (unit.kind === "attach") return missingAttachNode(session, unit) !== undefined;
  if (unit.kind === "spatialLayer") return missingSurfaceNode(session, unit) !== undefined;
  if (unit.kind === "physics") return missingPhysicsEntity(session, unit) !== undefined;
  if (unit.kind === "cue") {
    return !session.scene.resources.some((resource) => resource.kind === "audio" && resource.id === unit.cue.resourceId);
  }
  if (unit.kind === "interact") {
    const ids = new Set(session.scene.nodes.map((node) => node.id));
    return [unit.nodeId, ...unit.bindings.map((binding) => binding.nodeId)].some((id) => id !== undefined && !ids.has(id));
  }
  if (unit.kind === "timing") {
    return Boolean(unit.parent) && !session.scene.timingScopes?.some((scope) => scope.id === unit.parent);
  }
  if (unit.kind === "node" && unit.shape === "group") {
    const clipId = missingClipTarget(session, unit);
    if (clipId !== undefined) return true;
  }
  if (unit.kind !== "animate" && unit.kind !== "keyframes" && unit.kind !== "step") return false;
  const resolved = resolveAddress(
    unit.target,
    session.scene.nodes.map((node) => node.id),
    ["main"],
  );
  const missingTarget = !resolved.ok && resolved.code === "UNKNOWN_TARGET";
  const missingScope =
    (unit.kind === "animate" || unit.kind === "keyframes") &&
    Boolean(unit.timingScopeId) &&
    !session.scene.timingScopes?.some((scope) => scope.id === unit.timingScopeId);
  return missingTarget || missingScope || waitsForAttachment(session, unit);
}

function blockSeal(session: Session, unit: Extract<UnitAst, { kind: "seal" }>, message: string): void {
  session.diagnostics.push(
    diagnostic({
      code: "SEAL_BLOCKED",
      phase: "compile",
      category: "temporal",
      effect: "SEAL_BLOCKED",
      severity: "error",
      recovery: "Leave the sealed horizon unchanged.",
      message,
      sourceSpan: unit.span,
    }),
  );
}

interface Capture {
  nodes: number;
  audioCues: number;
  tracks: number;
  steps: number;
  resources: string;
  cameras: string;
  sealed: number;
  profile: string;
}

function capture(session: Session): Capture {
  return measured(session, 'compile.capture_ms', () => captureInner(session));
}
function captureInner(session: Session): Capture {
  return {
    nodes: session.scene.nodes.length,
    audioCues: session.scene.audioCues?.length ?? 0,
    tracks: session.scene.timeline.tracks.length,
    steps: session.scene.timeline.steps.length,
    resources: JSON.stringify(session.scene.resources),
    cameras: JSON.stringify(session.scene.cameras),
    sealed: session.sealedThroughMs,
    profile: JSON.stringify({
      compositions: session.scene.compositions,
      instances: session.scene.instances,
      timingScopes: session.scene.timingScopes,
      requiredCapabilities: session.scene.requiredCapabilities,
      geometryOperators: session.scene.geometryOperators,
      interactions: session.scene.interactions,
      spatialLayers: session.scene.spatialLayers,
      physics: session.scene.physics,
      pathAttachments: session.scene.pathAttachments,
    }),
  };
}

function noteChanges(session: Session, unit: UnitAst, before: Capture): void {
  const ops: RuntimeOperation[] = [];
  const headerChanged =
    JSON.stringify(session.scene.resources) !== before.resources ||
    JSON.stringify(session.scene.cameras) !== before.cameras ||
    capture(session).profile !== before.profile;
  if (headerChanged) ops.push({ op: "CREATE_SCENE", scene: sceneHeader(session) });
  const nodes = session.scene.nodes.slice(before.nodes);
  if (nodes.length > 0) ops.push({ op: "ADD_NODES", nodes });
  const tracks = session.scene.timeline.tracks.slice(before.tracks);
  if (tracks.length > 0) ops.push({ op: "ADD_TRACKS", tracks });
  const steps = session.scene.timeline.steps.slice(before.steps);
  if (steps.length > 0) ops.push({ op: "ADD_STEPS", steps });
  const cues = (session.scene.audioCues ?? []).slice(before.audioCues);
  if (cues.length > 0) ops.push({ op: "ADD_AUDIO_CUES", cues });
  if (session.sealedThroughMs !== before.sealed) ops.push({ op: "SEAL_TIMELINE", horizonMs: session.sealedThroughMs });
  if (ops.length > 0) emit(session, ops, unit.span);
}

function emitCreate(session: Session, span: SourceSpan): void {
  emit(session, [{ op: "CREATE_SCENE", scene: sceneHeader(session) }], span);
}

function emit(session: Session, operations: RuntimeOperation[], sourceSpan: SourceSpan): void {
  const expectedRevision = session.revision;
  session.revision += 1;
  session.unitSerial += 1;
  const delta: SceneIRDelta = {
    generationId: "local",
    unitId: session.unitSerial,
    expectedRevision,
    nextRevision: session.revision,
    operations,
    sourceSpan,
  };
  session.deltas.push(delta);
  session.pendingDeltas.push(delta);
  session.telemetry?.gauge("compile.pending_deltas", session.pendingDeltas.length);
}

function flushPendingEntityOps(session: Session, sourceSpan: SourceSpan): void {
  if (session.pendingEntityOps.length === 0) return;
  const operations = session.pendingEntityOps;
  session.pendingEntityOps = [];
  const expectedRevision = session.revision;
  session.revision += 1;
  session.unitSerial += 1;
  const patchExpected = session.entityPatchRevision;
  session.entityPatchRevision += 1;
  const delta = emitEntityStatementDelta({
    generationId: "local",
    unitId: session.unitSerial,
    expectedRevision,
    nextRevision: session.revision,
    patchExpectedRevision: patchExpected,
    patchNextRevision: session.entityPatchRevision,
    operations,
    sourceSpan,
  });
  session.deltas.push(delta);
  session.pendingDeltas.push(delta);
  session.telemetry?.gauge("compile.pending_deltas", session.pendingDeltas.length);
}

function sceneHeader(session: Session): SceneHeader {
  const header: SceneHeader = {
    irVersion: session.scene.irVersion,
    sceneId: session.scene.sceneId,
    viewport: session.scene.viewport,
    background: session.scene.background,
    resources: [...session.scene.resources],
    cameras: [...session.scene.cameras],
    initialCameraId: session.scene.initialCameraId,
    durationMs: session.scene.timeline.durationMs,
  };
  if (session.scene.irVersion === "0.2") {
    header.compositions = [...(session.scene.compositions ?? [])];
    header.instances = [...(session.scene.instances ?? [])];
    header.timingScopes = [...(session.scene.timingScopes ?? [])];
    header.requiredCapabilities = [...(session.scene.requiredCapabilities ?? [])];
    header.geometryOperators = [...(session.scene.geometryOperators ?? [])];
    if (session.scene.interactions) header.interactions = [...session.scene.interactions];
    if (session.scene.spatialLayers) header.spatialLayers = [...session.scene.spatialLayers];
    if (session.scene.physics) header.physics = structuredClone(session.scene.physics);
    if (session.scene.pathAttachments) header.pathAttachments = session.scene.pathAttachments.map((entry) => ({ ...entry }));
  }
  return header;
}

function headerOk(header: HeaderAst, diagnostics: Diagnostic[]): boolean {
  let ok = true;
  if (!header.sceneId) {
    diagnostics.push(problem("MISSING_REQUIRED", "A scene needs a name."));
    ok = false;
  }
  if (header.version !== DSL_VERSION && header.version !== DSL_VERSION_02) {
    diagnostics.push(problem("UNSUPPORTED_IR_VERSION", `MotionScript version must be "${DSL_VERSION}" or "${DSL_VERSION_02}".`));
    ok = false;
  }
  if (header.version === DSL_VERSION && header.requires.length > 0) {
    diagnostics.push(problem("UNSUPPORTED_IR_VERSION", 'MotionScript 0.1 cannot declare requires.'));
    ok = false;
  }
  for (const name of header.requires) {
    if (!isKnownCapability(name)) {
      diagnostics.push(problem("INVALID_ENUM", `Unknown capability ${name}.`));
      ok = false;
    }
  }
  if (new Set(header.requires).size !== header.requires.length) {
    diagnostics.push(problem("INVALID_ENUM", "A capability can be required only once."));
    ok = false;
  }
  if (!header.viewport || header.viewport.width <= 0 || header.viewport.height <= 0) {
    diagnostics.push(problem("INVALID_GEOMETRY", "The viewport needs a positive width and height."));
    ok = false;
  }
  if (!header.background) {
    diagnostics.push(problem("MISSING_REQUIRED", "The scene needs a background colour."));
    ok = false;
  }
  if (header.durationMs === undefined || header.durationMs <= 0) {
    diagnostics.push(problem("INVALID_TIMING", "The scene needs a positive duration."));
    ok = false;
  }
  return ok;
}

function createSession(header: HeaderAst, diagnostics: Diagnostic[]): Session {
  const width = header.viewport?.width ?? 1280;
  const height = header.viewport?.height ?? 720;
  const v02 = header.version === DSL_VERSION_02;
  const scene: SceneIR = {
    irVersion: v02 ? IR_VERSION_02 : IR_VERSION,
    sceneId: header.sceneId ?? "scene",
    viewport: { width, height, fit: "contain" },
    background: header.background ?? { type: "solid", r: 0, g: 0, b: 0, a: 1 },
    resources: [],
    nodes: [],
    cameras: [{ id: "main", position: { x: width / 2, y: height / 2 }, zoom: 1, rotation: 0 }],
    initialCameraId: "main",
    timeline: { durationMs: header.durationMs ?? 1000, tracks: [], steps: [] },
    ...(v02
      ? {
          compositions: [],
          instances: [],
          timingScopes: [],
          requiredCapabilities: [...header.requires],
          geometryOperators: [],
        }
      : {}),
  };
  return {
    scene,
    constants: new Map(),
    sealedThroughMs: 0,
    trackCount: 0,
    stepCount: 0,
    fontCount: 0,
    diagnostics,
    frozen: false,
    deferred: [],
    revision: 0,
    entityPatchRevision: 0,
    pendingEntityOps: [],
    unitSerial: 0,
    parsedUnits: 0,
    deltas: [],
    pendingDeltas: [],
    authoringComplete: false,
    headerSpan: header.span,
    generativeSugarCount: 0,
    rejectedNodeIds: new Set(),
  };
}

function applyUnit(session: Session, unit: UnitAst, emitDelta: boolean): boolean {
  const accepted = applyUnitInner(session, unit, emitDelta);
  if (emitDelta) session.telemetry?.count(accepted ? 'compile.accepted_units' : 'compile.rejected_units');
  if (!accepted) session.telemetry?.event('compile.unit_rejected', {kind: unit.kind, span: unit.span, diagnostics: session.diagnostics.slice(-4)});
  return accepted;
}

function measured<T>(session: Session, name: string, work: () => T): T {
  return session.telemetry ? session.telemetry.measure(name, work) : work();
}

function applyUnitInner(session: Session, unit: UnitAst, emitDelta: boolean): boolean {
  if (
    session.frozen &&
    (unit.kind === "node" ||
      unit.kind === "const" ||
      unit.kind === "camera" ||
      unit.kind === "composition" ||
      unit.kind === "instance" ||
      unit.kind === "timing" ||
      unit.kind === "operators" ||
      unit.kind === "interact" ||
      unit.kind === "attach" ||
      unit.kind === "audio" ||
      unit.kind === "audioSugar" ||
      unit.kind === "spatialLayer" ||
      unit.kind === "physics" ||
      (unit.kind === "batch" && unit.items.some((item) => item.kind === "node")))
  ) {
    session.diagnostics.push(
      diagnostic({
        code: "INVALID_TIMING",
        phase: "compile",
        category: "temporal",
        effect: "UNIT_REJECTED",
        message: "Base definitions are frozen after the first seal.",
        sourceSpan: unit.span,
      }),
    );
    return false;
  }
  if (unit.kind === "batch") {
    if (unit.errors.length > 0) {
      session.diagnostics.push(...unit.errors);
      return false;
    }
    const snapshot = measured(session, 'compile.snapshot_ms', () => snapshotScene(session.scene));
    const sealed = session.sealedThroughMs;
    const state = {trackCount: session.trackCount, stepCount: session.stepCount, fontCount: session.fontCount, frozen: session.frozen};
    const constants = new Map(session.constants);
    const before = capture(session);
    const priorPending = session.pendingEntityOps;
    session.pendingEntityOps = [];
    let failed = false;
    for (const item of unit.items) {
      if (!applyUnit(session, item, false)) failed = true;
    }
    // The enclosing batch is the dependency-complete transaction. Intermediate
    // child prefixes may refer to definitions added later in that same batch.
    if (!failed && emitDelta) {
      const validated = measured(session, 'compile.validate_ms', () => validateSceneIR(session.scene));
      if (!validated.ok) {
        session.diagnostics.push(
          ...validated.diagnostics.map((issue) => (issue.sourceSpan ? issue : { ...issue, sourceSpan: unit.span })),
        );
        failed = true;
      }
    }
    if (failed) {
      rememberRejectedNodes(session, snapshot);
      measured(session, 'compile.rollback_ms', () => restore(session, snapshot, sealed, constants, state));
      session.pendingEntityOps = priorPending;
      return false;
    }
    if (emitDelta) {
      noteChanges(session, unit, before);
      flushPendingEntityOps(session, unit.span);
    } else {
      priorPending.push(...session.pendingEntityOps);
      session.pendingEntityOps = priorPending;
    }
    return true;
  }
  if (unit.errors.length > 0) {
    session.diagnostics.push(...unit.errors);
    return false;
  }
  if (isEntityStatement(unit)) {
    const beforeDiag = session.diagnostics.length;
    const ops = measured(session, "compile.lower_ms", () =>
      lowerEntityStatement(unit, {
        sealedThroughMs: session.sealedThroughMs,
        diagnostics: session.diagnostics,
        ensureCapability: (name) => ensureCapability(session, name),
        lowerNode: (ast, parentId) => lowerNode(session, ast, parentId),
      }),
    );
    if (!ops || session.diagnostics.length > beforeDiag) return false;
    if (emitDelta) {
      session.pendingEntityOps.push(...ops);
      flushPendingEntityOps(session, unit.span);
    } else {
      session.pendingEntityOps.push(...ops);
    }
    return true;
  }
  const snapshot = measured(session, 'compile.snapshot_ms', () => snapshotScene(session.scene));
  const sealed = session.sealedThroughMs;
  const state = {trackCount: session.trackCount, stepCount: session.stepCount, fontCount: session.fontCount, frozen: session.frozen};
  const constants = new Map(session.constants);
  const beforeDiag = session.diagnostics.length;
  const before = capture(session);
  measured(session, 'compile.lower_ms', () => lower(session, unit));
  if (session.diagnostics.length > beforeDiag) {
    rememberRejectedNodes(session, snapshot);
    measured(session, 'compile.rollback_ms', () => restore(session, snapshot, sealed, constants, state));
    return false;
  }
  if (emitDelta) {
    const validated = measured(session, 'compile.validate_ms', () => validateSceneIR(session.scene));
    if (!validated.ok) {
      const prior = validateSceneIR(snapshot);
      const priorKeys = new Set(!prior.ok ? prior.diagnostics.map((item) => `${item.code}:${item.message}`) : []);
      const fresh = validated.diagnostics.filter((item) => !priorKeys.has(`${item.code}:${item.message}`));
      if (fresh.length > 0) {
        session.diagnostics.push(
          ...fresh.map((issue) => (issue.sourceSpan ? issue : { ...issue, sourceSpan: unit.span })),
        );
        rememberRejectedNodes(session, snapshot);
        measured(session, 'compile.rollback_ms', () => restore(session, snapshot, sealed, constants, state));
        return false;
      }
    }
  }
  if (unit.kind === "seal") session.frozen = true;
  if (emitDelta) noteChanges(session, unit, before);
  return true;
}

/** Lowering appends/replaces list entries; accepted nested values are immutable.
 * Copy list containers only, retaining geometry/keyframes across transactions.
 * See docs/design/capacity-transactions.md before adding in-place mutations. */
function snapshotScene(scene: SceneIR): SceneIR {
  return {
    ...scene,
    nodes: [...scene.nodes], cameras: [...scene.cameras], resources: [...scene.resources],
    timeline: {...scene.timeline, tracks: [...scene.timeline.tracks], steps: [...scene.timeline.steps]},
    ...(scene.compositions ? {compositions: [...scene.compositions]} : {}),
    ...(scene.instances ? {instances: [...scene.instances]} : {}),
    ...(scene.timingScopes ? {timingScopes: [...scene.timingScopes]} : {}),
    ...(scene.requiredCapabilities ? {requiredCapabilities: [...scene.requiredCapabilities]} : {}),
    ...(scene.geometryOperators ? {geometryOperators: [...scene.geometryOperators]} : {}),
    ...(scene.interactions ? {interactions: [...scene.interactions]} : {}),
    ...(scene.audioCues ? {audioCues: [...scene.audioCues]} : {}),
    ...(scene.spatialLayers ? {spatialLayers: [...scene.spatialLayers]} : {}),
    ...(scene.physics ? {physics: structuredClone(scene.physics)} : {}),
    ...(scene.pathAttachments ? {pathAttachments: [...scene.pathAttachments]} : {}),
  };
}

function restoreList<K extends "compositions" | "instances" | "timingScopes" | "requiredCapabilities" | "geometryOperators" | "interactions" | "audioCues" | "spatialLayers" | "pathAttachments">(
  scene: SceneIR,
  snapshot: SceneIR,
  key: K,
): void {
  if (snapshot[key] === undefined) delete scene[key];
  else scene[key] = snapshot[key];
}

function restore(session: Session, snapshot: SceneIR, sealed: number, constants: Map<string, number>, state: Pick<Session, "trackCount" | "stepCount" | "fontCount" | "frozen">): void {
  Object.assign(session, state);
  session.scene.nodes = snapshot.nodes;
  session.scene.cameras = snapshot.cameras;
  session.scene.resources = snapshot.resources;
  session.scene.timeline = snapshot.timeline;
  restoreList(session.scene, snapshot, "compositions");
  restoreList(session.scene, snapshot, "instances");
  restoreList(session.scene, snapshot, "timingScopes");
  restoreList(session.scene, snapshot, "requiredCapabilities");
  restoreList(session.scene, snapshot, "geometryOperators");
  restoreList(session.scene, snapshot, "interactions");
  restoreList(session.scene, snapshot, "audioCues");
  restoreList(session.scene, snapshot, "spatialLayers");
  restoreList(session.scene, snapshot, "pathAttachments");
  if (snapshot.physics === undefined) delete session.scene.physics;
  else session.scene.physics = structuredClone(snapshot.physics);
  session.sealedThroughMs = sealed;
  session.constants = constants;
}

function lower(session: Session, unit: UnitAst): void {
  if (unit.kind === "const") {
    if (session.constants.has(unit.name) || !unit.name) {
      session.diagnostics.push(problem("DUPLICATE_ID", `Constant ${unit.name} is already defined.`, unit.span));
      return;
    }
    session.constants.set(unit.name, unit.value);
    return;
  }
  if (unit.kind === "camera") {
    if (unit.name !== "main") {
      session.diagnostics.push(problem("INVALID_CAMERA", 'The V1 camera must be named "main".', unit.span));
      return;
    }
    const current = session.scene.cameras[0];
    session.scene.cameras = [
      {
        id: "main",
        position: unit.position ?? current?.position ?? { x: 640, y: 360 },
        zoom: unit.zoom ?? current?.zoom ?? 1,
        rotation: unit.rotation ?? current?.rotation ?? 0,
      },
    ];
    return;
  }
  if (unit.kind === "node") {
    const nodes = lowerNode(session, unit, null);
    if (!nodes) return;
    session.scene.nodes.push(...nodes);
    return;
  }
  if (unit.kind === "interact") {
    if (session.scene.irVersion !== "0.2") {
      session.diagnostics.push(problem("UNSUPPORTED_IR_VERSION", "MotionScript 0.1 cannot declare interactions.", unit.span));
      return;
    }
    lowerInteract(session, unit);
    return;
  }
  if (unit.kind === "attach") {
    if (session.scene.irVersion !== "0.2") {
      session.diagnostics.push(problem("UNSUPPORTED_IR_VERSION", "MotionScript 0.1 cannot declare path attachments.", unit.span));
      return;
    }
    lowerAttach(session, unit);
    return;
  }
  if (unit.kind === "audio" || unit.kind === "audioSugar" || unit.kind === "cue") {
    if (session.scene.irVersion !== "0.2") {
      session.diagnostics.push(problem("UNSUPPORTED_IR_VERSION", "MotionScript 0.1 cannot declare audio.", unit.span));
      return;
    }
    if (unit.kind === "audio") lowerAudio(session, unit);
    else if (unit.kind === "audioSugar") lowerAudioSugar(session, unit);
    else lowerCue(session, unit);
    return;
  }
  if (unit.kind === "spatialLayer") {
    if (session.scene.irVersion !== "0.2") {
      session.diagnostics.push(problem("UNSUPPORTED_IR_VERSION", "MotionScript 0.1 cannot declare spatial layers.", unit.span));
      return;
    }
    lowerSpatialLayer(session, unit);
    return;
  }
  if (unit.kind === "physics") {
    if (session.scene.irVersion !== "0.2") {
      session.diagnostics.push(problem("UNSUPPORTED_IR_VERSION", "MotionScript 0.1 cannot declare physics.", unit.span));
      return;
    }
    lowerPhysics(session, unit);
    return;
  }
  if (unit.kind === "timing" || unit.kind === "composition" || unit.kind === "instance" || unit.kind === "operators") {
    if (session.scene.irVersion !== "0.2") {
      session.diagnostics.push(problem("UNSUPPORTED_IR_VERSION", "MotionScript 0.1 cannot use timing scopes, compositions, instances, or operators.", unit.span));
      return;
    }
    if (unit.kind === "timing") lowerTiming(session, unit);
    else if (unit.kind === "composition") lowerComposition(session, unit);
    else if (unit.kind === "instance") lowerInstance(session, unit);
    else lowerOperators(session, unit);
    return;
  }
  if (unit.kind === "animate" || unit.kind === "keyframes") {
    const track = lowerTrack(session, unit);
    if (track) session.scene.timeline.tracks.push(track);
    return;
  }
  if (unit.kind === "step") {
    const nodeIds = session.scene.nodes.map((node) => node.id);
    const resolved = resolveAddress(unit.target, nodeIds, ["main"]);
    if (!resolved.ok || resolved.animation !== "step" || resolved.target.kind !== "node") {
      session.diagnostics.push(
        problem("INVALID_TRACK_TARGET", "A step can write a node's visible or content property.", unit.span),
      );
      return;
    }
    const stepTarget = resolved.target;
    const channel = stepTarget.channel;
    if (channel !== "visible" && channel !== "content") {
      session.diagnostics.push(
        problem("INVALID_TRACK_TARGET", "A step can write a node's visible or content property.", unit.span),
      );
      return;
    }
    if (channel === "visible" && typeof unit.value !== "boolean") {
      session.diagnostics.push(problem("INVALID_TRACK_VALUE", "visible steps require a boolean value.", unit.span));
      return;
    }
    if (channel === "content") {
      if (typeof unit.value !== "string") {
        session.diagnostics.push(problem("INVALID_TRACK_VALUE", "content steps require a string value.", unit.span));
        return;
      }
      const target = session.scene.nodes.find((node) => node.id === stepTarget.nodeId);
      if (!target || target.kind !== "text") {
        session.diagnostics.push(
          problem("INVALID_TRACK_TARGET", "content steps require a text node.", unit.span),
        );
        return;
      }
      if (target.numeric) {
        session.diagnostics.push(
          problem(
            "OVERLAPPING_WRITERS",
            `${stepTarget.nodeId}.content is owned by its numeric binding.`,
            unit.span,
          ),
        );
        return;
      }
      ensureCapability(session, "text.dynamicContent");
    }
    if (unit.timeMs + 1e-9 < session.sealedThroughMs) {
      session.diagnostics.push(problem("INVALID_TIMING", `${unit.target} steps at ${unit.timeMs}ms, before the seal at ${session.sealedThroughMs}ms.`, unit.span));
      return;
    }
    if (unit.timeMs < 0 || unit.timeMs > session.scene.timeline.durationMs) {
      session.diagnostics.push(problem("INVALID_TIMING", "A step must lie within the scene duration.", unit.span));
      return;
    }
    session.stepCount += 1;
    session.scene.timeline.steps.push({
      id: `step${session.stepCount}`,
      target: { kind: "node", nodeId: stepTarget.nodeId, channel },
      timeMs: unit.timeMs,
      value: unit.value,
    });
    return;
  }
  if (unit.kind === "seal") {
    if (unit.timeMs <= session.sealedThroughMs + 1e-9 || unit.timeMs > session.scene.timeline.durationMs) {
      session.diagnostics.push(
        diagnostic({
          code: "SEAL_BLOCKED",
          phase: "compile",
          category: "temporal",
          effect: "SEAL_BLOCKED",
          severity: "error",
          recovery: "Leave the sealed horizon unchanged.",
          message: `Seal at ${unit.timeMs}ms does not advance ${session.sealedThroughMs}ms within the scene.`,
          sourceSpan: unit.span,
        }),
      );
      return;
    }
    session.sealedThroughMs = unit.timeMs;
  }
}

function lowerNode(session: Session, ast: NodeAst, parentId: string | null): NodeDefinition[] | undefined {
  if (ast.errors.length > 0) {
    session.diagnostics.push(...ast.errors);
    return undefined;
  }
  const id = parentId ? `${parentId}.${ast.name}` : ast.name;
  const prop = indexProps(ast.props);
  if (parentId && prop.space) {
    session.diagnostics.push(problem("SPACE_VIOLATION", "Only a root may declare space.", ast.span));
    return undefined;
  }
  const transform = transformFrom(prop);
  if (needsProfile(prop) && session.scene.irVersion !== "0.2") {
    session.diagnostics.push(
      problem(
        "UNSUPPORTED_IR_VERSION",
        "MotionScript 0.1 cannot use gradients, images, rounded corners, transform parents, or compositing.",
        ast.span,
      ),
    );
    return undefined;
  }
  const base = {
    id,
    name: ast.name,
    parentId,
    zIndex: prop.zIndex ?? 0,
    transform,
    opacity: prop.opacity ?? 1,
    visible: prop.visible ?? true,
    ...(prop.transformParent ? { transformParentId: prop.transformParent } : {}),
    ...(prop.inheritOpacity === false ? { inheritOpacity: false as const } : {}),
  };
  if (prop.transformParent || prop.inheritOpacity === false) ensureCapability(session, "transform.parent");
  let node: NodeDefinition;
  if (ast.shape === "group") {
    const compositing = groupCompositing(prop, id, ast, knownNodeIds(session));
    if (compositing?.isolated) ensureCapability(session, "compositing.isolatedOpacity");
    if (compositing?.blend) ensureCapability(session, "compositing.blend");
    if (compositing?.effect?.type === "blur") ensureCapability(session, "effects.blur");
    if (compositing?.clip) ensureCapability(session, "compositing.mask");
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: "group",
      ...(compositing ? { compositing } : {}),
    };
  } else if (ast.shape === "rectangle" || ast.shape === "ellipse") {
    if (!prop.size) {
      session.diagnostics.push(problem("MISSING_REQUIRED", `${ast.name} needs a size.`, ast.span));
      return undefined;
    }
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: ast.shape,
      size: prop.size,
      ...(ast.shape === "rectangle" && prop.cornerRadius ? { cornerRadius: prop.cornerRadius } : {}),
      ...(prop.fill ? { fill: prop.fill } : {}),
      ...(prop.stroke ? { stroke: prop.stroke } : {}),
    };
    if (ast.shape === "rectangle" && prop.cornerRadius) ensureCapability(session, "geometry.roundedRect");
    if (prop.fill && prop.fill.type !== "solid") {
      ensureCapability(session, prop.fill.type === "linear" ? "paint.linearGradient" : "paint.radialGradient");
    }
    ensureStrokePaintCapability(session, prop.stroke);
  } else if (ast.shape === "circle") {
    if (prop.radius === undefined) {
      session.diagnostics.push(problem("MISSING_REQUIRED", `${ast.name} needs a radius.`, ast.span));
      return undefined;
    }
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: "circle",
      radius: prop.radius,
      ...(prop.fill ? { fill: prop.fill } : {}),
      ...(prop.stroke ? { stroke: prop.stroke } : {}),
    };
    if (prop.fill && prop.fill.type !== "solid") {
      ensureCapability(session, prop.fill.type === "linear" ? "paint.linearGradient" : "paint.radialGradient");
    }
    ensureStrokePaintCapability(session, prop.stroke);
  } else if (ast.shape === "line") {
    if (!prop.from || !prop.to || !prop.stroke) {
      session.diagnostics.push(problem("MISSING_REQUIRED", `${ast.name} needs from, to, and a stroke.`, ast.span));
      return undefined;
    }
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: "line",
      from: prop.from,
      to: prop.to,
      stroke: prop.stroke,
    };
    ensureStrokePaintCapability(session, prop.stroke);
  } else if (ast.shape === "polygon") {
    if (ast.points.length < 3) {
      session.diagnostics.push(problem("INVALID_GEOMETRY", `${ast.name} needs at least three points.`, ast.span));
      return undefined;
    }
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: "polygon",
      points: ast.points,
      ...(prop.fill ? { fill: prop.fill } : {}),
      ...(prop.stroke ? { stroke: prop.stroke } : {}),
    };
    if (prop.fill && prop.fill.type !== "solid") {
      ensureCapability(session, prop.fill.type === "linear" ? "paint.linearGradient" : "paint.radialGradient");
    }
    ensureStrokePaintCapability(session, prop.stroke);
  } else if (ast.shape === "path") {
    if (ast.commands.length === 0) {
      session.diagnostics.push(problem("MALFORMED_PATH", `${ast.name} needs a path command.`, ast.span));
      return undefined;
    }
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: "path",
      commands: ast.commands,
      fillRule: prop.fillRule ?? "nonzero",
      ...(prop.fill ? { fill: prop.fill } : {}),
      ...(prop.stroke ? { stroke: prop.stroke } : {}),
    };
    if (prop.fill && prop.fill.type !== "solid") {
      ensureCapability(session, prop.fill.type === "linear" ? "paint.linearGradient" : "paint.radialGradient");
    }
    ensureStrokePaintCapability(session, prop.stroke);
  } else if (ast.shape === "image") {
    if (!prop.href || !prop.size) {
      session.diagnostics.push(problem("MISSING_REQUIRED", `${ast.name} needs href and size.`, ast.span));
      return undefined;
    }
    const resourceId = `image${session.scene.resources.length + 1}`;
    session.scene.resources.push({ id: resourceId, kind: "image", href: prop.href, readiness: "ready" });
    ensureCapability(session, "resources.image");
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: "image",
      resourceId,
      size: prop.size,
    };
  } else {
    if (!prop.content || prop.fontSize === undefined || !prop.fill || prop.fill.type !== "solid") {
      session.diagnostics.push(problem("MISSING_REQUIRED", `${ast.name} needs content, fontSize, and fill.`, ast.span));
      return undefined;
    }
    const family = prop.fontFamily ?? "sans";
    ensureFont(session, family);
    const formatFields = {
      ...(prop.fractionDigits !== undefined ? { fractionDigits: prop.fractionDigits } : {}),
      ...(prop.minIntegerDigits !== undefined ? { minIntegerDigits: prop.minIntegerDigits } : {}),
      ...(prop.sign !== undefined ? { sign: prop.sign } : {}),
      ...(prop.group !== undefined ? { group: prop.group } : {}),
      ...(prop.decimal !== undefined ? { decimal: prop.decimal } : {}),
      ...(prop.prefix !== undefined ? { prefix: prop.prefix } : {}),
      ...(prop.suffix !== undefined ? { suffix: prop.suffix } : {}),
    };
    const hasFormat = Object.keys(formatFields).length > 0;
    if (hasFormat && prop.number === undefined) {
      session.diagnostics.push(
        problem("MISSING_REQUIRED", `${ast.name} format fields require number.`, ast.span),
      );
      return undefined;
    }
    if (prop.number !== undefined) {
      ensureCapability(session, "text.dynamicContent");
    }
    node = {
      ...base,
      ...(parentId ? {} : { space: prop.space ?? "world" }),
      kind: "text",
      content: prop.content,
      font: {
        family,
        size: prop.fontSize,
        weight: prop.fontWeight ?? 400,
        style: prop.fontStyle ?? "normal",
      },
      align: prop.align ?? "left",
      baseline: prop.baseline ?? "alphabetic",
      fill: prop.fill,
      ...(prop.stroke ? { stroke: prop.stroke } : {}),
      ...(prop.number !== undefined
        ? {
            numeric: {
              value: prop.number,
              ...(hasFormat ? { format: formatFields } : {}),
            },
          }
        : {}),
    };
    ensureStrokePaintCapability(session, prop.stroke);
  }
  const nodes = [node];
  for (const child of ast.children) {
    const lowered = lowerNode(session, child, id);
    if (!lowered) return undefined;
    nodes.push(...lowered);
  }
  return nodes;
}

function lowerTrack(session: Session, unit: Extract<UnitAst, { kind: "animate" | "keyframes" }>): TrackDefinition | undefined {
  const nodeIds = session.scene.nodes.map((node) => node.id);
  const resolved = resolveAddress(unit.target, nodeIds, ["main"]);
  if (!resolved.ok) {
    session.diagnostics.push(problem(resolved.code, resolved.message, unit.span));
    return undefined;
  }
  if (resolved.animation !== "track") {
    session.diagnostics.push(problem("INVALID_TRACK_TARGET", `${unit.target} is changed with a step, not a track.`, unit.span));
    return undefined;
  }
  const startMs = unit.startMs ?? 0;
  if (session.scene.irVersion !== "0.2" && (unit.timingScopeId || unit.order !== undefined || easeIsNew(unit) || hasSpatial(unit))) {
    session.diagnostics.push(
      problem("UNSUPPORTED_IR_VERSION", "MotionScript 0.1 cannot use cubic easing, hold, spatial curves, timing scopes, or composition order.", unit.span),
    );
    return undefined;
  }
  if (unit.timingScopeId && !session.scene.timingScopes?.some((scope) => scope.id === unit.timingScopeId)) {
    session.diagnostics.push(problem("UNKNOWN_TARGET", `Timing scope ${unit.timingScopeId} does not exist.`, unit.span));
    return undefined;
  }
  const sealLocal = unit.timingScopeId
    ? localTimeMs(session.scene.timingScopes ?? [], unit.timingScopeId, session.sealedThroughMs)
    : session.sealedThroughMs;
  if (sealLocal !== undefined && startMs + 1e-9 < sealLocal) {
    session.diagnostics.push(
      problem("INVALID_TIMING", `${unit.target} starts at ${startMs}ms, before the seal at ${session.sealedThroughMs}ms.`, unit.span),
    );
    return undefined;
  }
  if (unit.durationMs === undefined || unit.durationMs <= 0) {
    session.diagnostics.push(problem("INVALID_TIMING", `${unit.target} needs a positive duration.`, unit.span));
    return undefined;
  }
  const fill = { before: "none" as const, after: unit.fill ?? "forwards" };
  session.trackCount += 1;
  const id = `track${session.trackCount}`;
  if (unit.kind === "animate" && unit.expression !== undefined) {
    if (unit.from || unit.to) {
      session.diagnostics.push(problem("INVALID_TRACK_TARGET", "An expression track does not also take from and to.", unit.span));
      return undefined;
    }
    if (resolved.type === "vec2") {
      session.diagnostics.push(problem("INVALID_TRACK_TARGET", "V1 expressions produce a number.", unit.span));
      return undefined;
    }
    const substituted = substituteConstants(unit.expression, session.constants);
    const parsed = parseExpression(substituted);
    if (!parsed.ok) {
      session.diagnostics.push(...parsed.diagnostics);
      return undefined;
    }
    if (unit.timingScopeId) ensureCapability(session, "timing.localScopes");
    return {
      id,
      kind: "expression",
      target: resolved.target,
      valueType: resolved.type === "angle" ? "angle" : "number",
      startMs,
      durationMs: unit.durationMs,
      fill,
      source: substituted,
      ast: parsed.ast,
      ...(unit.timingScopeId ? { timingScopeId: unit.timingScopeId } : {}),
    };
  }
  const frames =
    unit.kind === "keyframes"
      ? unit.frames.map((frame, index) => ({
          offset: frame.offset,
          value: literalValue(frame.value),
          easing: frame.ease ?? (index === unit.frames.length - 1 ? undefined : unit.ease),
          ...(frame.spatial ? { spatial: frame.spatial } : {}),
        }))
      : animateFrames(unit.from, unit.to, unit.ease);
  if (!frames) {
    session.diagnostics.push(problem("MISSING_REQUIRED", `${unit.target} needs from and to, or an expression.`, unit.span));
    return undefined;
  }
  const valueType =
    resolved.type === "vec2"
      ? "vec2"
      : resolved.type === "angle"
        ? "angle"
        : resolved.type === "path"
          ? "path"
          : "number";
  for (const frame of frames) {
    noteEase(session, frame.easing);
    if ("spatial" in frame && frame.spatial) ensureCapability(session, "geometry.spatialCurve");
  }
  if (valueType === "path") ensureCapability(session, "geometry.pathMorph");
  if (
    resolved.target.kind === "node" &&
    (resolved.target.channel === "trim.start" ||
      resolved.target.channel === "trim.end" ||
      resolved.target.channel === "trim.offset")
  ) {
    ensureCapability(session, "geometry.trimPath");
    ensureCapability(session, "geometry.animatedTrim");
  }
  if (resolved.target.kind === "node" && resolved.target.channel === "path.progress") {
    ensureCapability(session, "geometry.pathProgress");
  }
  if (resolved.target.kind === "node" && resolved.target.channel === "text.number") {
    ensureCapability(session, "text.dynamicContent");
    const nodeId = resolved.target.nodeId;
    const target = session.scene.nodes.find((node) => node.id === nodeId);
    if (!target || target.kind !== "text" || target.numeric === undefined) {
      session.diagnostics.push(
        problem("INVALID_TRACK_TARGET", `${unit.target} needs a numeric binding on its text node.`, unit.span),
      );
      return undefined;
    }
  }
  if (
    resolved.target.kind === "node" &&
    (resolved.target.channel === "fill.r" ||
      resolved.target.channel === "fill.g" ||
      resolved.target.channel === "fill.b" ||
      resolved.target.channel === "fill.a" ||
      resolved.target.channel === "stroke.r" ||
      resolved.target.channel === "stroke.g" ||
      resolved.target.channel === "stroke.b" ||
      resolved.target.channel === "stroke.a" ||
      resolved.target.channel === "stroke.width")
  ) {
    ensureCapability(session, "paint.animatedSolid");
  }
  if (unit.timingScopeId) ensureCapability(session, "timing.localScopes");
  return {
    id,
    kind: "keyframe",
    target: resolved.target,
    valueType,
    startMs,
    durationMs: unit.durationMs,
    fill,
    keyframes: frames.map((frame) => (frame.easing ? frame : { offset: frame.offset, value: frame.value })),
    ...(unit.timingScopeId ? { timingScopeId: unit.timingScopeId } : {}),
    ...(unit.order !== undefined ? { composition: { order: unit.order, mode: "replace" as const } } : {}),
  };
}

function animateFrames(
  from: AnimLiteral | undefined,
  to: AnimLiteral | undefined,
  ease: EaseAst | undefined,
): { offset: number; value: number | Vec2 | PathCommand[]; easing?: SegmentEasing }[] | undefined {
  if (!from || !to || from.kind !== to.kind) return undefined;
  return [
    { offset: 0, value: literalValue(from), ...(ease ? { easing: ease } : { easing: "linear" as const }) },
    { offset: 1, value: literalValue(to) },
  ];
}

function literalValue(value: AnimLiteral): number | Vec2 | PathCommand[] {
  return value.value;
}

function ensureFont(session: Session, family: string): void {
  if (session.scene.resources.some((resource) => resource.kind === "font" && resource.family === family)) return;
  session.fontCount += 1;
  session.scene.resources.push({ id: `font${session.fontCount}`, kind: "font", family, source: "builtin" });
}

function transformFrom(prop: IndexedProps): Transform {
  return {
    position: prop.position ?? { x: 0, y: 0 },
    pivot: prop.pivot ?? { x: 0, y: 0 },
    rotation: prop.rotation ?? 0,
    scale: prop.scale ?? { x: 1, y: 1 },
  };
}

interface IndexedProps {
  position?: Vec2;
  pivot?: Vec2;
  scale?: Vec2;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
  space?: "world" | "screen";
  size?: Vec2;
  radius?: number;
  from?: Vec2;
  to?: Vec2;
  fill?: Paint;
  cornerRadius?: number;
  inheritOpacity?: boolean;
  transformParent?: string;
  href?: string;
  clip?: string;
  isolated?: boolean;
  blend?: "source-over" | "multiply" | "screen" | "overlay";
  blur?: number;
  stroke?: Stroke;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  align?: "left" | "center" | "right";
  baseline?: "alphabetic" | "middle" | "top" | "bottom";
  fillRule?: "nonzero" | "evenodd";
  number?: number;
  fractionDigits?: number;
  minIntegerDigits?: number;
  sign?: "auto" | "always" | "never";
  group?: string;
  decimal?: string;
  prefix?: string;
  suffix?: string;
}

function indexProps(props: Prop[]): IndexedProps {
  const indexed: IndexedProps = {};
  for (const prop of props) {
    switch (prop.name) {
      case "position":
      case "pivot":
      case "scale":
      case "size":
      case "from":
      case "to":
        indexed[prop.name] = prop.vec;
        break;
      case "fill":
        indexed.fill = prop.color;
        break;
      case "stroke":
        indexed.stroke = prop.stroke;
        break;
      case "content":
        indexed.content = prop.text;
        break;
      case "fontFamily":
      case "transformParent":
      case "href":
      case "clip":
      case "group":
      case "decimal":
      case "prefix":
      case "suffix":
        indexed[prop.name] = prop.text;
        break;
      case "sign":
        indexed.sign = prop.value;
        break;
      case "inheritOpacity":
      case "isolated":
        indexed[prop.name] = prop.value;
        break;
      case "blend":
        indexed.blend = prop.value;
        break;
      case "cornerRadius":
      case "blur":
        indexed[prop.name] = prop.value;
        break;
      case "visible":
        indexed.visible = prop.value;
        break;
      case "space":
        indexed.space = prop.value;
        break;
      case "fillRule":
        indexed.fillRule = prop.value;
        break;
      case "fontStyle":
        indexed.fontStyle = prop.value;
        break;
      case "align":
        indexed.align = prop.value;
        break;
      case "baseline":
        indexed.baseline = prop.value;
        break;
      default:
        indexed[prop.name] = prop.value;
    }
  }
  return indexed;
}

function substituteConstants(source: string, constants: Map<string, number>): string {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const ch = source[index] ?? "";
    if (isIdentStart(ch)) {
      let end = index + 1;
      while (end < source.length && isIdentPart(source[end] ?? "")) end += 1;
      const name = source.slice(index, end);
      let look = end;
      while (look < source.length && (source[look] === " " || source[look] === "\t")) look += 1;
      const call = source[look] === "(";
      const value = constants.get(name);
      if (!call && value !== undefined && !BUILTINS.has(name)) out += formatLiteral(value);
      else out += name;
      index = end;
      continue;
    }
    out += ch;
    index += 1;
  }
  return out;
}

function formatLiteral(value: number): string {
  if (value < 0) return `(${value})`;
  return String(value);
}

function isIdentStart(ch: string): boolean {
  return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_";
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || (ch >= "0" && ch <= "9");
}

function lowerTiming(session: Session, unit: Extract<UnitAst, { kind: "timing" }>): void {
  const scopes = session.scene.timingScopes ?? [];
  if (!unit.name || scopes.some((scope) => scope.id === unit.name) || session.scene.nodes.some((node) => node.id === unit.name)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Timing scope ${unit.name} is already defined.`, unit.span));
    return;
  }
  const stretch = unit.stretch ?? 1;
  if (stretch === 0 || !Number.isFinite(stretch)) {
    session.diagnostics.push(problem("INVALID_TIMING", "Timing stretch must be a non-zero finite number.", unit.span));
    return;
  }
  scopes.push({ id: unit.name, parentId: unit.parent ?? null, offsetMs: unit.offsetMs ?? 0, stretch });
  session.scene.timingScopes = scopes;
  ensureCapability(session, "timing.localScopes");
}

function lowerComposition(session: Session, unit: Extract<UnitAst, { kind: "composition" }>): void {
  const compositions = session.scene.compositions ?? [];
  if (!unit.name || compositions.some((composition) => composition.id === unit.name) || session.scene.nodes.some((node) => node.id === unit.name)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Composition ${unit.name} is already defined.`, unit.span));
    return;
  }
  const nodes: NodeDefinition[] = [];
  for (const child of unit.nodes) {
    const lowered = lowerNode(session, child, null);
    if (!lowered) return;
    nodes.push(...lowered);
  }
  compositions.push({ id: unit.name, nodes });
  session.scene.compositions = compositions;
  ensureCapability(session, "composition.definitions");
}

function lowerInstance(session: Session, unit: Extract<UnitAst, { kind: "instance" }>): void {
  const instances = session.scene.instances ?? [];
  if (!unit.name || instances.some((item) => item.id === unit.name) || session.scene.nodes.some((node) => node.id === unit.name)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Instance ${unit.name} is already defined.`, unit.span));
    return;
  }
  if (!session.scene.compositions?.some((composition) => composition.id === unit.definition)) {
    session.diagnostics.push(problem("UNKNOWN_TARGET", `Composition ${unit.definition} does not exist.`, unit.span));
    return;
  }
  if (unit.endMs === undefined) {
    session.diagnostics.push(problem("MISSING_REQUIRED", `${unit.name} needs an end time.`, unit.span));
    return;
  }
  if (!unit.timing || !session.scene.timingScopes?.some((scope) => scope.id === unit.timing)) {
    session.diagnostics.push(problem("UNKNOWN_TARGET", `Timing scope ${unit.timing ?? ""} does not exist.`, unit.span));
    return;
  }
  instances.push({
    id: unit.name,
    definitionId: unit.definition,
    parentId: unit.parent ?? null,
    transformParentId: unit.transformParent ?? null,
    transform: {
      position: unit.position ?? { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    },
    opacity: 1,
    visible: true,
    activation: { startMs: unit.startMs ?? 0, endMs: unit.endMs },
    timingScopeId: unit.timing,
  });
  session.scene.instances = instances;
  ensureCapability(session, "composition.definitions");
}

function lowerOperators(session: Session, unit: Extract<UnitAst, { kind: "operators" }>): void {
  if (!knownNodeIds(session).has(unit.nodeId)) {
    session.diagnostics.push(problem("UNKNOWN_TARGET", `Node ${unit.nodeId} does not exist.`, unit.span));
    return;
  }
  if (unit.operators.length === 0) {
    session.diagnostics.push(problem("MISSING_REQUIRED", `${unit.nodeId} needs an operator.`, unit.span));
    return;
  }
  const lists = session.scene.geometryOperators ?? [];
  lists.push({ nodeId: unit.nodeId, operators: unit.operators });
  session.scene.geometryOperators = lists;
  ensureCapability(session, "geometry.operators");
}

function lowerInteract(session: Session, unit: Extract<UnitAst, { kind: "interact" }>): void {
  const ids = new Set(session.scene.nodes.map((node) => node.id));
  for (const id of [unit.nodeId, ...unit.bindings.map((binding) => binding.nodeId)]) {
    if (id !== undefined && !ids.has(id)) {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Node ${id} does not exist.`, unit.span));
      return;
    }
  }
  const list = session.scene.interactions ?? [];
  if (list.some((target) => target.nodeId === unit.nodeId)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `${unit.nodeId} already has an interact declaration.`, unit.span));
    return;
  }
  const target: InteractionTarget = { nodeId: unit.nodeId };
  if (unit.pointer !== undefined) target.pointer = unit.pointer;
  if (unit.focusable !== undefined) target.focusable = unit.focusable;
  if (unit.tabIndex !== undefined) target.tabIndex = unit.tabIndex;
  if (unit.bindings.length > 0) target.bindings = unit.bindings.map((binding) => structuredClone(binding));
  // Replace the container so earlier emitted headers keep their own list.
  session.scene.interactions = [...list, target];
  ensureCapability(session, "input.bindings");
}

/** First node of an attachment (traveller or path) that does not exist yet; declaration may precede it. */
function missingAttachNode(session: Session, unit: Extract<UnitAst, { kind: "attach" }>): string | undefined {
  const ids = new Set(session.scene.nodes.map((node) => node.id));
  return [unit.nodeId, unit.pathId].find((id) => !ids.has(id));
}

/**
 * A `path.progress` track feeds an attachment sampler, so it waits (like any
 * forward reference) until the attachment on its node has been accepted.
 */
function waitsForAttachment(session: Session, unit: Extract<UnitAst, { kind: "animate" | "keyframes" | "step" }>): boolean {
  if (unit.kind === "step") return false;
  const resolved = resolveAddress(
    unit.target,
    session.scene.nodes.map((node) => node.id),
    ["main"],
  );
  if (!resolved.ok || resolved.target.kind !== "node" || resolved.target.channel !== "path.progress") return false;
  const nodeId = resolved.target.nodeId;
  return !session.scene.pathAttachments?.some((entry) => entry.nodeId === nodeId);
}

function lowerAttach(session: Session, unit: Extract<UnitAst, { kind: "attach" }>): void {
  const nodes = session.scene.nodes;
  for (const id of [unit.nodeId, unit.pathId]) {
    if (!nodes.some((node) => node.id === id)) {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Node ${id} does not exist.`, unit.span));
      return;
    }
  }
  if (nodes.find((node) => node.id === unit.pathId)?.kind !== "path") {
    session.diagnostics.push(problem("INVALID_GEOMETRY", `${unit.pathId} is not a path node; attach needs a path to travel along.`, unit.span));
    return;
  }
  const list = session.scene.pathAttachments ?? [];
  if (list.some((entry) => entry.nodeId === unit.nodeId)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `${unit.nodeId} already has an attach declaration.`, unit.span));
    return;
  }
  const attachment: PathAttachment = { nodeId: unit.nodeId, pathId: unit.pathId, progress: unit.progress ?? 0 };
  if (unit.orient !== undefined) attachment.orient = unit.orient;
  if (unit.rollRadius !== undefined) attachment.rollRadius = unit.rollRadius;
  // Replace the container so earlier emitted headers keep their own list.
  session.scene.pathAttachments = [...list, attachment];
  ensureCapability(session, "geometry.pathProgress");
}

/** First surface or parent node of a layer that does not exist yet (declaration may precede it). */
function missingSurfaceNode(session: Session, unit: Extract<UnitAst, { kind: "spatialLayer" }>): string | undefined {
  const ids = new Set(session.scene.nodes.map((node) => node.id));
  return unit.layer.surfaces.map((surface) => surface.nodeId).find((id) => !ids.has(id));
}

function lowerSpatialLayer(session: Session, unit: Extract<UnitAst, { kind: "spatialLayer" }>): void {
  const list = session.scene.spatialLayers ?? [];
  if (list.some((layer) => layer.id === unit.layer.id)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Spatial layer ${unit.layer.id} already exists.`, unit.span));
    return;
  }
  const owned = new Set(list.flatMap((layer) => layer.surfaces.map((surface) => surface.nodeId)));
  const inLayer = new Set(unit.layer.surfaces.map((surface) => surface.nodeId));
  for (const surface of unit.layer.surfaces) {
    if (owned.has(surface.nodeId)) {
      session.diagnostics.push(problem("DUPLICATE_ID", `Node ${surface.nodeId} is already a spatial surface.`, unit.span));
      return;
    }
    if (surface.parent !== undefined && !inLayer.has(surface.parent)) {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Surface ${surface.nodeId} names parent ${surface.parent}, which is not a surface of layer ${unit.layer.id}.`, unit.span));
      return;
    }
  }
  const surfaces = new Set(unit.layer.surfaces.map((surface) => surface.nodeId));
  for (const edge of unit.layer.seams?.edges ?? []) {
    for (const id of [edge.a, edge.b]) {
      if (!surfaces.has(id)) {
        session.diagnostics.push(problem("UNKNOWN_TARGET", `Seam edge names ${id}, which is not a surface of layer ${unit.layer.id}.`, unit.span));
        return;
      }
    }
  }
  // Replace the container so earlier emitted headers keep their own list.
  session.scene.spatialLayers = [...list, structuredClone(unit.layer)];
  ensureCapability(session, "space.planar25d");
  if (unit.layer.seams) ensureCapability(session, "space.planarSeams");
}

/** First body/constraint entity that does not exist yet (declaration may precede it). */
function missingPhysicsEntity(session: Session, unit: Extract<UnitAst, { kind: "physics" }>): string | undefined {
  const ids = new Set(session.scene.nodes.map((node) => node.id));
  for (const body of unit.world.bodies) {
    const entityId = body.entityId ?? body.id;
    if (!ids.has(entityId)) return entityId;
  }
  for (const constraint of unit.world.constraints ?? []) {
    if (!ids.has(constraint.a)) return constraint.a;
    if (!ids.has(constraint.b)) return constraint.b;
  }
  return undefined;
}

function lowerPhysics(session: Session, unit: Extract<UnitAst, { kind: "physics" }>): void {
  if (session.scene.physics) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Physics world ${session.scene.physics.id} already exists; only one world is allowed.`, unit.span));
    return;
  }
  if (unit.world.mode === "dynamic" && unit.world.bodies.length === 0) {
    session.diagnostics.push(problem("MISSING_REQUIRED", "A dynamic physics world needs at least one body.", unit.span));
    return;
  }
  if (unit.world.mode === "authored" && (unit.world.constraints?.length ?? 0) === 0) {
    session.diagnostics.push(problem("MISSING_REQUIRED", "An authored physics world needs at least one constraint.", unit.span));
    return;
  }
  const bodyIds = new Set<string>();
  for (const body of unit.world.bodies) {
    if (bodyIds.has(body.id)) {
      session.diagnostics.push(problem("DUPLICATE_ID", `Physics body ${body.id} already exists.`, unit.span));
      return;
    }
    bodyIds.add(body.id);
  }
  for (const joint of unit.world.joints ?? []) {
    if (!bodyIds.has(joint.bodyA) || !bodyIds.has(joint.bodyB)) {
      session.diagnostics.push(
        problem("UNKNOWN_TARGET", `Joint ${joint.id} names unknown body ${!bodyIds.has(joint.bodyA) ? joint.bodyA : joint.bodyB}.`, unit.span),
      );
      return;
    }
  }
  session.scene.physics = structuredClone(unit.world);
  ensureCapability(session, "physics.planar2d");
}

function generativeResource(id: string, fields: AudioGenerativeFields): AudioResourceDefinition {
  const durationMs = estimateGenerativeAudioDurationMs(fields.modality, fields.prompt, fields.durationHintMs);
  const source: AudioGenerativeSource = {
    type: "generative",
    modality: fields.modality,
    prompt: fields.prompt,
  };
  if (fields.voice !== undefined) source.voice = fields.voice;
  if (fields.durationHintMs !== undefined) source.durationHintMs = fields.durationHintMs;
  if (fields.loop !== undefined) source.loop = fields.loop;
  if (fields.seed !== undefined) source.seed = fields.seed;
  if (fields.style !== undefined) source.style = { ...fields.style };
  return { id, kind: "audio", durationMs, readiness: "pending", source };
}

function lowerAudio(session: Session, unit: AudioDeclAst): void {
  if (session.scene.resources.some((resource) => resource.id === unit.id)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Resource ${unit.id} already exists.`, unit.span));
    return;
  }
  if (unit.generative) {
    if (!unit.generative.prompt) {
      session.diagnostics.push(problem("MISSING_REQUIRED", "Generative audio needs a non-empty prompt.", unit.span));
      return;
    }
    session.scene.resources = [...session.scene.resources, generativeResource(unit.id, unit.generative)];
    ensureCapability(session, "audio.cues");
    ensureCapability(session, "audio.generative");
    return;
  }
  // Href form: readiness is host-reported (loader decode); the program declares none.
  session.scene.resources = [
    ...session.scene.resources,
    { id: unit.id, kind: "audio", href: unit.href ?? "", durationMs: unit.durationMs ?? 0 },
  ];
  ensureCapability(session, "audio.cues");
}

function lowerAudioSugar(session: Session, unit: AudioSugarAst): void {
  if (!unit.generative.prompt) {
    session.diagnostics.push(problem("MISSING_REQUIRED", "Audio sugar needs a non-empty prompt.", unit.span));
    return;
  }
  session.generativeSugarCount += 1;
  const prefix = unit.bus === "narration" ? "GenNarration" : "GenEffects";
  const resourceId = `${prefix}${session.generativeSugarCount}`;
  const cueId = `${prefix}Cue${session.generativeSugarCount}`;
  if (session.scene.resources.some((resource) => resource.id === resourceId)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Resource ${resourceId} already exists.`, unit.span));
    return;
  }
  session.scene.resources = [...session.scene.resources, generativeResource(resourceId, unit.generative)];
  ensureCapability(session, "audio.cues");
  ensureCapability(session, "audio.generative");
  lowerCue(session, {
    kind: "cue",
    cue: { id: cueId, resourceId, bus: unit.bus, startMs: unit.startMs },
    span: unit.span,
    errors: [],
  });
}

function lowerCue(session: Session, unit: Extract<UnitAst, { kind: "cue" }>): void {
  const list = session.scene.audioCues ?? [];
  if (list.some((cue) => cue.id === unit.cue.id)) {
    session.diagnostics.push(problem("DUPLICATE_ID", `Audio cue ${unit.cue.id} already exists.`, unit.span));
    return;
  }
  if (unit.cue.startMs + 1e-9 < session.sealedThroughMs) {
    session.diagnostics.push(
      problem("INVALID_TIMING", `Cue ${unit.cue.id} starts before the sealed horizon ${session.sealedThroughMs}ms.`, unit.span),
    );
    return;
  }
  // Replace the container so earlier emitted deltas keep their own list.
  session.scene.audioCues = [...list, { ...unit.cue }];
  ensureCapability(session, "audio.cues");
}

function knownNodeIds(session: Session): Set<string> {
  const ids = new Set(session.scene.nodes.map((node) => node.id));
  for (const composition of session.scene.compositions ?? []) {
    for (const node of composition.nodes) ids.add(node.id);
  }
  return ids;
}

/** Forward clip refs defer until the geometry node exists; same-unit children are resolved. */
function missingClipTarget(session: Session, unit: Extract<UnitAst, { kind: "node" }>): string | undefined {
  const clipProp = unit.props.find((prop) => prop.name === "clip");
  if (!clipProp || clipProp.name !== "clip") return undefined;
  const id = clipProp.text;
  if (knownNodeIds(session).has(id)) return undefined;
  if (unit.children.some((child) => child.name === id)) return undefined;
  return id;
}

function easeIsNew(unit: Extract<UnitAst, { kind: "animate" | "keyframes" }>): boolean {
  if (isAdvancedEase(unit.ease)) return true;
  return unit.kind === "keyframes" && unit.frames.some((frame) => isAdvancedEase(frame.ease));
}

function isAdvancedEase(ease: EaseAst | undefined): boolean {
  return typeof ease === "object";
}

function needsProfile(prop: IndexedProps): boolean {
  return (
    prop.inheritOpacity === false ||
    prop.transformParent !== undefined ||
    prop.cornerRadius !== undefined ||
    prop.isolated === true ||
    prop.blur !== undefined ||
    prop.blend !== undefined ||
    prop.clip !== undefined ||
    prop.href !== undefined ||
    (prop.fill !== undefined && prop.fill.type !== "solid")
  );
}

function groupCompositing(
  prop: IndexedProps,
  groupId: string,
  ast: NodeAst,
  known: Set<string>,
): NodeDefinition extends infer _ ? Extract<NodeDefinition, { kind: "group" }>["compositing"] : never {
  if (!prop.isolated && !prop.blend && prop.blur === undefined && !prop.clip) return undefined;
  let clipId = prop.clip;
  if (clipId && !known.has(clipId) && ast.children.some((child) => child.name === clipId)) {
    clipId = `${groupId}.${clipId}`;
  }
  return {
    isolated: prop.isolated ?? Boolean(prop.blend || prop.blur !== undefined || prop.clip),
    ...(prop.blend ? { blend: prop.blend } : {}),
    ...(prop.blur !== undefined ? { effect: { type: "blur" as const, radius: prop.blur } } : {}),
    ...(clipId ? { clip: { geometryId: clipId } } : {}),
  };
}

function hasSpatial(unit: Extract<UnitAst, { kind: "animate" | "keyframes" }>): boolean {
  return unit.kind === "keyframes" && unit.frames.some((frame) => frame.spatial !== undefined);
}

function noteEase(session: Session, ease: SegmentEasing | undefined): void {
  if (!ease) return;
  // Representation-independent: string "hold" and { type: "hold" } both claim easing.hold.
  if (typeof ease === "string") {
    if ((ease as string) === "hold") ensureCapability(session, "easing.hold");
    return;
  }
  ensureCapability(session, ease.type === "hold" ? "easing.hold" : "easing.cubicBezier");
}

/** Record node ids that a rejected unit added, so dependent UNKNOWN_TARGET noise can be dropped. */
function rememberRejectedNodes(session: Session, snapshot: SceneIR): void {
  const kept = new Set(snapshot.nodes.map((node) => node.id));
  for (const node of session.scene.nodes) {
    if (!kept.has(node.id)) session.rejectedNodeIds.add(node.id);
  }
}

function addressHitsRejected(session: Session, address: string): boolean {
  for (const id of session.rejectedNodeIds) {
    if (address === id || address.startsWith(`${id}.`)) return true;
  }
  return false;
}

function unitHitsRejectedTarget(session: Session, unit: UnitAst): boolean {
  if (session.rejectedNodeIds.size === 0) return false;
  if (unit.kind === "operators" || unit.kind === "interact") {
    return session.rejectedNodeIds.has(unit.nodeId);
  }
  if (unit.kind === "attach") {
    return session.rejectedNodeIds.has(unit.nodeId) || session.rejectedNodeIds.has(unit.pathId);
  }
  if (unit.kind === "animate" || unit.kind === "keyframes" || unit.kind === "step") {
    return addressHitsRejected(session, unit.target);
  }
  if (unit.kind === "node" && unit.shape === "group") {
    const missing = missingClipTarget(session, unit);
    return missing !== undefined && session.rejectedNodeIds.has(missing);
  }
  if (unit.kind === "spatialLayer") {
    const missing = missingSurfaceNode(session, unit);
    return missing !== undefined && session.rejectedNodeIds.has(missing);
  }
  if (unit.kind === "physics") {
    const missing = missingPhysicsEntity(session, unit);
    return missing !== undefined && session.rejectedNodeIds.has(missing);
  }
  return false;
}

function ensureStrokePaintCapability(session: Session, stroke: Stroke | undefined): void {
  if (!stroke || stroke.color.type === "solid") return;
  ensureCapability(session, "paint.gradientStroke");
}

function ensureCapability(session: Session, name: string): void {
  if (session.scene.irVersion !== "0.2") return;
  const list = session.scene.requiredCapabilities ?? [];
  if (!list.includes(name)) list.push(name);
  session.scene.requiredCapabilities = list;
}

function problem(code: Diagnostic["code"], message: string, sourceSpan?: Diagnostic["sourceSpan"]): Diagnostic {
  return diagnostic({
    code,
    phase: "compile",
    category: code === "UNKNOWN_TARGET" ? "reference" : "type",
    effect: "UNIT_REJECTED",
    message,
    sourceSpan,
  });
}

export type { Expr, PathCommand };
