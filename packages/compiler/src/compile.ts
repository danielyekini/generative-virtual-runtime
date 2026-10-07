import {
  DEFAULT_LIMITS,
  DSL_VERSION,
  DSL_VERSION_02,
  IR_VERSION,
  IR_VERSION_02,
  diagnostic,
  isKnownCapability,
  localTimeMs,
  parseExpression,
  resolveAddress,
  validateSceneIR,
  type Diagnostic,
  type Expr,
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
import type { AnimLiteral, EaseAst, HeaderAst, NodeAst, ProgramAst, Prop, UnitAst } from "./ast";
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
  unitSerial: number;
  parsedUnits: number;
  deltas: SceneIRDelta[];
  pendingDeltas: SceneIRDelta[];
  authoringComplete: boolean;
  headerSpan: SourceSpan;
}

/** Compile one complete MotionScript file. A rejected unit leaves the accepted scene unchanged. */
export function compileMotionScript(source: string): CompileResult {
  const program = parseMotionScript(source);
  return compileProgram(program);
}

export function compileProgram(program: ProgramAst): CompileResult {
  const diagnostics = [...program.diagnostics];
  const header = program.header;
  if (!header || header.errors.length > 0 || !headerOk(header, diagnostics)) {
    return { ok: false, diagnostics, sealedThroughMs: 0, completed: false, deltas: [] };
  }
  const session = createSession(header, diagnostics);
  emitCreate(session, header.span);
  for (const unit of program.units) pushUnit(session, unit);
  return finishSession(session, program.completed);
}

/** Live compiler used by the fragment feeder. The header must already be valid. */
export function openSession(header: HeaderAst, diagnostics: Diagnostic[] = []): Session {
  const session = createSession(header, diagnostics);
  emitCreate(session, header.span);
  return session;
}

export function pushUnit(session: Session, unit: UnitAst): void {
  session.parsedUnits += 1;
  if (session.authoringComplete) {
    session.diagnostics.push(problem("INVALID_TYPE", "Units cannot follow complete;.", unit.span));
    return;
  }
  if (session.deferred.length > 0 && unit.kind === "seal") {
    blockSeal(session, unit, `Seal at ${unit.timeMs}ms is blocked by an unresolved reference.`);
    return;
  }
  if (isUnresolved(session, unit)) {
    if (session.deferred.length >= DEFAULT_LIMITS.maxDeferredUnits) {
      session.diagnostics.push(problem("RESOURCE_LIMIT", "Too many deferred units.", unit.span));
      return;
    }
    session.deferred.push(unit);
    return;
  }
  if (applyUnit(session, unit, true)) retryDeferred(session);
}

export function finishSession(session: Session, sourceCompleted: boolean, span?: SourceSpan): CompileResult {
  const unresolved = session.deferred.splice(0);
  for (const unit of unresolved) {
    if (unit.kind === "instance") {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved composition ${unit.definition}.`, unit.span));
      continue;
    }
    if (unit.kind === "operators") {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved node ${unit.nodeId}.`, unit.span));
      continue;
    }
    if (unit.kind === "timing") {
      session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved timing parent ${unit.parent ?? ""}.`, unit.span));
      continue;
    }
    if ((unit.kind === "animate" || unit.kind === "keyframes") && unit.timingScopeId) {
      if (!session.scene.timingScopes?.some((scope) => scope.id === unit.timingScopeId)) {
        session.diagnostics.push(problem("UNKNOWN_TARGET", `Unresolved timing scope ${unit.timingScopeId}.`, unit.span));
        continue;
      }
    }
    if (unit.kind !== "animate" && unit.kind !== "keyframes" && unit.kind !== "step") continue;
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
  const validated = validateSceneIR(session.scene);
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
  return deltas;
}

function retryDeferred(session: Session): void {
  if (session.deferred.length === 0) return;
  const pending = session.deferred;
  session.deferred = [];
  for (const unit of pending) {
    if (isUnresolved(session, unit)) {
      session.deferred.push(unit);
      continue;
    }
    applyUnit(session, unit, true);
  }
}

function isUnresolved(session: Session, unit: UnitAst): boolean {
  if (unit.errors.length > 0) return false;
  if (unit.kind === "instance") {
    return !session.scene.compositions?.some((composition) => composition.id === unit.definition);
  }
  if (unit.kind === "operators") return !knownNodeIds(session).has(unit.nodeId);
  if (unit.kind === "timing") {
    return Boolean(unit.parent) && !session.scene.timingScopes?.some((scope) => scope.id === unit.parent);
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
  return missingTarget || missingScope;
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
  tracks: number;
  steps: number;
  resources: string;
  cameras: string;
  sealed: number;
  profile: string;
}

function capture(session: Session): Capture {
  return {
    nodes: session.scene.nodes.length,
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
}

function sceneHeader(session: Session): SceneHeader {
  const header: SceneHeader = {
    irVersion: session.scene.irVersion,
    sceneId: session.scene.sceneId,
    viewport: session.scene.viewport,
    background: session.scene.background,
    resources: session.scene.resources,
    cameras: session.scene.cameras,
    initialCameraId: session.scene.initialCameraId,
    durationMs: session.scene.timeline.durationMs,
  };
  if (session.scene.irVersion === "0.2") {
    header.compositions = session.scene.compositions ?? [];
    header.instances = session.scene.instances ?? [];
    header.timingScopes = session.scene.timingScopes ?? [];
    header.requiredCapabilities = session.scene.requiredCapabilities ?? [];
    header.geometryOperators = session.scene.geometryOperators ?? [];
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
    unitSerial: 0,
    parsedUnits: 0,
    deltas: [],
    pendingDeltas: [],
    authoringComplete: false,
    headerSpan: header.span,
  };
}

function applyUnit(session: Session, unit: UnitAst, emitDelta: boolean): boolean {
  if (
    session.frozen &&
    (unit.kind === "node" ||
      unit.kind === "const" ||
      unit.kind === "camera" ||
      unit.kind === "composition" ||
      unit.kind === "instance" ||
      unit.kind === "timing" ||
      unit.kind === "operators" ||
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
    const snapshot = structuredClone(session.scene);
    const sealed = session.sealedThroughMs;
    const constants = new Map(session.constants);
    const before = capture(session);
    let failed = false;
    for (const item of unit.items) {
      if (!applyUnit(session, item, false)) failed = true;
    }
    if (failed) {
      restore(session, snapshot, sealed, constants);
      return false;
    }
    if (emitDelta) noteChanges(session, unit, before);
    return true;
  }
  if (unit.errors.length > 0) {
    session.diagnostics.push(...unit.errors);
    return false;
  }
  const snapshot = structuredClone(session.scene);
  const sealed = session.sealedThroughMs;
  const constants = new Map(session.constants);
  const beforeDiag = session.diagnostics.length;
  const before = capture(session);
  lower(session, unit);
  if (session.diagnostics.length > beforeDiag) {
    restore(session, snapshot, sealed, constants);
    return false;
  }
  const validated = validateSceneIR(session.scene);
  if (!validated.ok) {
    const prior = validateSceneIR(snapshot);
    const priorKeys = new Set(!prior.ok ? prior.diagnostics.map((item) => `${item.code}:${item.message}`) : []);
    const fresh = validated.diagnostics.filter((item) => !priorKeys.has(`${item.code}:${item.message}`));
    if (fresh.length > 0) {
      session.diagnostics.push(...fresh);
      restore(session, snapshot, sealed, constants);
      return false;
    }
  }
  if (unit.kind === "seal") session.frozen = true;
  if (emitDelta) noteChanges(session, unit, before);
  return true;
}

function restoreList<K extends "compositions" | "instances" | "timingScopes" | "requiredCapabilities" | "geometryOperators">(
  scene: SceneIR,
  snapshot: SceneIR,
  key: K,
): void {
  if (snapshot[key] === undefined) delete scene[key];
  else scene[key] = snapshot[key];
}

function restore(session: Session, snapshot: SceneIR, sealed: number, constants: Map<string, number>): void {
  session.scene.nodes = snapshot.nodes;
  session.scene.cameras = snapshot.cameras;
  session.scene.resources = snapshot.resources;
  session.scene.timeline = snapshot.timeline;
  restoreList(session.scene, snapshot, "compositions");
  restoreList(session.scene, snapshot, "instances");
  restoreList(session.scene, snapshot, "timingScopes");
  restoreList(session.scene, snapshot, "requiredCapabilities");
  restoreList(session.scene, snapshot, "geometryOperators");
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
      session.diagnostics.push(problem("INVALID_TRACK_TARGET", "A step can write only a node's visible property.", unit.span));
      return;
    }
    if (unit.timeMs < 0 || unit.timeMs > session.scene.timeline.durationMs) {
      session.diagnostics.push(problem("INVALID_TIMING", "A step must lie within the scene duration.", unit.span));
      return;
    }
    session.stepCount += 1;
    session.scene.timeline.steps.push({
      id: `step${session.stepCount}`,
      target: { kind: "node", nodeId: resolved.target.nodeId, channel: "visible" },
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
    const compositing = groupCompositing(prop);
    if (compositing?.isolated) ensureCapability(session, "compositing.isolatedOpacity");
    if (compositing?.blend) ensureCapability(session, "compositing.blend");
    if (compositing?.effect?.type === "blur") ensureCapability(session, "effects.blur");
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
        indexed[prop.name] = prop.text;
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

function knownNodeIds(session: Session): Set<string> {
  const ids = new Set(session.scene.nodes.map((node) => node.id));
  for (const composition of session.scene.compositions ?? []) {
    for (const node of composition.nodes) ids.add(node.id);
  }
  return ids;
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
    prop.href !== undefined ||
    (prop.fill !== undefined && prop.fill.type !== "solid")
  );
}

function groupCompositing(prop: IndexedProps): NodeDefinition extends infer _ ? Extract<NodeDefinition, { kind: "group" }>["compositing"] : never {
  if (!prop.isolated && !prop.blend && prop.blur === undefined) return undefined;
  return {
    isolated: prop.isolated ?? Boolean(prop.blend || prop.blur !== undefined),
    ...(prop.blend ? { blend: prop.blend } : {}),
    ...(prop.blur !== undefined ? { effect: { type: "blur" as const, radius: prop.blur } } : {}),
  };
}

function hasSpatial(unit: Extract<UnitAst, { kind: "animate" | "keyframes" }>): boolean {
  return unit.kind === "keyframes" && unit.frames.some((frame) => frame.spatial !== undefined);
}

function noteEase(session: Session, ease: SegmentEasing | undefined): void {
  if (!ease || typeof ease === "string") return;
  ensureCapability(session, ease.type === "hold" ? "easing.hold" : "easing.cubicBezier");
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
