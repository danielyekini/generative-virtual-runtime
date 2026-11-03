import {
  diagnostic,
  lex,
  type Diagnostic,
  type InteractionBinding,
  type InteractionChannel,
  type Paint,
  type PathCommand,
  type PhysicsBodyDefinition,
  type PhysicsColliderDefinition,
  type PhysicsConstraintDefinition,
  type PhysicsJointDefinition,
  type SourceSpan,
  type SpatialSurfaceDefinition,
  type SpatialTransformDefinition,
  type SpatialVec3,
  type Stroke,
  type Token,
} from "@gvr/schema";
import type {
  AnimLiteral,
  AnimateAst,
  AttachAst,
  BatchAst,
  BeatAst,
  BeatRef,
  BehaviourDeclAst,
  BindDeclAst,
  CameraAst,
  CancelBehaviourAst,
  CompositionAst,
  ConstAst,
  EaseAst,
  EntityDeclAst,
  GeometryDeclAst,
  InteractAst,
  AudioDeclAst,
  AudioGenerativeFields,
  AudioSugarAst,
  CueDeclAst,
  PhysicsAst,
  SpatialLayerAst,
  HeaderAst,
  InstanceAst,
  KeyframeAst,
  NodeAst,
  OperatorsAst,
  ProgramAst,
  Prop,
  RemoveEntityAst,
  ReparentDeclAst,
  SealAst,
  StepAst,
  TimedFrameAst,
  TimingAst,
  UnitAst,
  Vec,
} from "./ast";

const NODE_SHAPES = new Set(["group", "rectangle", "circle", "ellipse", "line", "polygon", "path", "image", "text"]);
const EASING = new Set(["linear", "easeIn", "easeOut", "easeInOut"]);

interface Parser {
  tokens: Token[];
  index: number;
  diagnostics: Diagnostic[];
}

export function parseMotionScript(source: string): ProgramAst {
  const lexed = lex(source);
  const parser: Parser = { tokens: lexed.tokens, index: 0, diagnostics: [...lexed.diagnostics] };
  if (lexed.diagnostics.length > 0) {
    return { units: [], completed: false, diagnostics: parser.diagnostics };
  }
  const header = parseHeader(parser);
  const units: UnitAst[] = [];
  while (!done(parser) && !at(parser, "keyword", "complete")) {
    const unit = parseUnit(parser);
    if (!unit) break;
    units.push(unit);
  }
  let completed = false;
  if (eat(parser, "keyword", "complete")) {
    expectSemi(parser);
    completed = true;
  } else {
    fail(parser, "A program ends with complete;.");
  }
  if (!done(parser)) fail(parser, "Tokens follow complete;.");
  return { header, units, completed, diagnostics: parser.diagnostics };
}

/** Parse one top-level slice that already ends on its depth-zero semicolon. */
export function parseLeadingSlice(tokens: Token[]):
  | { kind: "header"; header: HeaderAst }
  | { kind: "unit"; unit: UnitAst }
  | { kind: "complete"; span: SourceSpan }
  | { kind: "invalid"; diagnostics: Diagnostic[] } {
  const parser: Parser = { tokens, index: 0, diagnostics: [] };
  const first = peek(parser);
  if (!first) return { kind: "invalid", diagnostics: [] };
  if (first.type === "keyword" && first.lexeme === "complete") {
    eat(parser, "keyword", "complete");
    expectSemi(parser);
    if (!done(parser)) fail(parser, "Tokens follow complete;.");
    if (parser.diagnostics.length > 0) return { kind: "invalid", diagnostics: parser.diagnostics };
    const end = prev(parser)?.span.end ?? first.span.end;
    return { kind: "complete", span: { start: first.span.start, end } };
  }
  if (first.type === "keyword" && first.lexeme === "scene") {
    const header = parseHeader(parser);
    if (!done(parser)) fail(parser, "Tokens follow the scene header.");
    if (parser.diagnostics.length > 0 || header.errors.length > 0) {
      return { kind: "invalid", diagnostics: [...parser.diagnostics, ...header.errors] };
    }
    return { kind: "header", header };
  }
  const unit = parseUnit(parser);
  if (!unit) return { kind: "invalid", diagnostics: parser.diagnostics };
  if (!done(parser)) fail(parser, "Tokens follow the declaration.");
  if (parser.diagnostics.length > 0) unit.errors.push(...parser.diagnostics);
  return { kind: "unit", unit };
}

function parseHeader(parser: Parser): HeaderAst {
  const start = peek(parser);
  const header: HeaderAst = { span: start?.span ?? emptySpan(), errors: [], requires: [] };
  if (!eat(parser, "keyword", "scene")) {
    fail(parser, 'A program starts with scene "name" { ... };.');
    return header;
  }
  const name = eat(parser, "string");
  header.sceneId = name?.stringValue;
  if (!name) fail(parser, "A scene needs a string name.");
  if (!eat(parser, "lbrace")) fail(parser, "Expected '{' after the scene name.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eat(parser, "keyword");
    if (!key) {
      fail(parser, "Expected a scene header property.");
      break;
    }
    if (key.lexeme === "version") {
      const version = eat(parser, "string");
      header.version = version?.stringValue;
      if (!version) note(header, parser, "version needs a string.");
    } else if (key.lexeme === "viewport") {
      const size = parseVec(parser);
      if (size) header.viewport = { width: size.x, height: size.y };
      else note(header, parser, "viewport needs (width, height).");
    } else if (key.lexeme === "background") {
      const color = eat(parser, "color");
      if (color?.colorValue) header.background = color.colorValue;
      else note(header, parser, "background needs a colour.");
    } else if (key.lexeme === "duration") {
      const duration = eat(parser, "duration");
      if (duration?.numberValue !== undefined) header.durationMs = duration.numberValue;
      else note(header, parser, "duration needs a time with ms or s.");
    } else if (key.lexeme === "requires") {
      const name = eat(parser, "string");
      if (name?.stringValue) header.requires.push(name.stringValue);
      else note(header, parser, "requires needs a capability string.");
    } else {
      note(header, parser, `Unknown scene header property ${key.lexeme}.`);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  header.span = start ? { start: start.span.start, end: prev(parser)?.span.end ?? start.span.end } : header.span;
  return header;
}

function parseUnit(parser: Parser): UnitAst | undefined {
  const token = peek(parser);
  // `beat` matches by spelling (MotionScript 0.23), so it is not a reserved word.
  if (token?.type === "identifier" && token.lexeme === "beat") return parseBeat(parser);
  if (!token || token.type !== "keyword") {
    fail(parser, "Expected a declaration.");
    skipUnit(parser);
    return undefined;
  }
  if (NODE_SHAPES.has(token.lexeme)) return parseNode(parser);
  if (token.lexeme === "const") return parseConst(parser);
  if (token.lexeme === "camera") return parseCamera(parser);
  if (token.lexeme === "batch") return parseBatch(parser);
  if (token.lexeme === "animate") return parseAnimate(parser);
  if (token.lexeme === "keyframes") return parseKeyframes(parser);
  if (token.lexeme === "step") return parseStep(parser);
  if (token.lexeme === "seal") return parseSeal(parser);
  if (token.lexeme === "timing") return parseTiming(parser);
  if (token.lexeme === "composition") return parseComposition(parser);
  if (token.lexeme === "instance") return parseInstance(parser);
  if (token.lexeme === "operators") return parseOperators(parser);
  if (token.lexeme === "interact") return parseInteract(parser);
  if (token.lexeme === "attach") return parseAttach(parser);
  if (token.lexeme === "audio") return parseAudioUnit(parser);
  if (token.lexeme === "cue") return parseCueDecl(parser);
  if (token.lexeme === "spatialLayer") return parseSpatialLayer(parser);
  if (token.lexeme === "physics") return parsePhysics(parser);
  if (token.lexeme === "entity") return parseEntityDecl(parser);
  if (token.lexeme === "geometry") return parseGeometryDecl(parser);
  if (token.lexeme === "bind") return parseBindDecl(parser);
  if (token.lexeme === "remove") return parseRemoveEntity(parser);
  if (token.lexeme === "reparent") return parseReparentDecl(parser);
  if (token.lexeme === "behaviour") return parseBehaviourDecl(parser);
  if (token.lexeme === "cancel") return parseCancelBehaviour(parser);
  fail(parser, `Unexpected ${token.lexeme}.`);
  skipUnit(parser);
  return undefined;
}

function parseConst(parser: Parser): ConstAst {
  const start = eat(parser, "keyword", "const");
  const node: ConstAst = {
    kind: "const",
    name: "",
    value: 0,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else note(node, parser, "const needs a name.");
  if (!eat(parser, "eq")) note(node, parser, "Expected '='.");
  const value = parseSignedNumber(parser);
  if (value === undefined) note(node, parser, "const needs a number.");
  else node.value = value;
  expectSemi(parser);
  return node;
}

function parseCamera(parser: Parser): CameraAst {
  const start = eat(parser, "keyword", "camera");
  const node: CameraAst = { kind: "camera", name: "", span: start?.span ?? emptySpan(), errors: [] };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else note(node, parser, "camera needs a name.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eat(parser, "keyword") ?? eat(parser, "identifier");
    if (!key) {
      note(node, parser, "Expected a camera property.");
      break;
    }
    if (key.lexeme === "position") {
      const vec = parseVec(parser);
      if (vec) node.position = vec;
      else note(node, parser, "position needs a vector.");
    } else if (key.lexeme === "zoom") {
      const zoom = parseSignedNumber(parser);
      if (zoom === undefined) note(node, parser, "zoom needs a number.");
      else node.zoom = zoom;
    } else if (key.lexeme === "rotation") {
      const rotation = parseAngle(parser);
      if (rotation === undefined) note(node, parser, "rotation needs an angle.");
      else node.rotation = rotation;
    } else note(node, parser, `Unknown camera property ${key.lexeme}.`);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseNode(parser: Parser): NodeAst {
  const start = peek(parser);
  const shape = eat(parser, "keyword")?.lexeme ?? "group";
  const node: NodeAst = {
    kind: "node",
    shape: shape as NodeAst["shape"],
    name: "",
    props: [],
    children: [],
    commands: [],
    points: [],
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else if (peek(parser)?.type === "keyword") {
    const reserved = peek(parser)!;
    note(node, parser, `\`${reserved.lexeme}\` is reserved; an identifier is required.`);
    parser.index += 1;
  } else note(node, parser, `${shape} needs a name.`);
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    if (shape === "group" && isNodeStart(parser)) {
      node.children.push(parseNode(parser));
      continue;
    }
    if (shape === "path" && isPathCommand(parser)) {
      const command = parsePathCommand(parser);
      if (command) node.commands.push(command);
      continue;
    }
    // Body words match by spelling (keyword or identifier) so additive fields
    // like text.dynamicContent `number` / `fractionDigits` need no new reserved words.
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, `Unexpected token in ${shape}.`);
      skipProperty(parser);
      if (!at(parser, "semicolon") && !at(parser, "rbrace")) break;
      eat(parser, "semicolon");
      continue;
    }
    parseNodeItem(parser, node, key.lexeme);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseNodeItem(parser: Parser, node: NodeAst, key: string): void {
  const seen = node.props.some((prop) => prop.name === key);
  if (seen && key !== "stroke") note(node, parser, `${key} is already set.`);
  if (key === "position" || key === "pivot" || key === "scale") {
    const vec = parseVec(parser);
    if (!vec) note(node, parser, `${key} needs a vector.`);
    else node.props.push({ name: key, vec });
    return;
  }
  if (key === "size") {
    const vec = parseVec(parser);
    if (!vec) note(node, parser, "size needs a vector.");
    else node.props.push({ name: "size", vec });
    return;
  }
  if (key === "from" || key === "to") {
    const vec = parseVec(parser);
    if (!vec) note(node, parser, `${key} needs a vector.`);
    else node.props.push({ name: key, vec });
    return;
  }
  if (key === "rotation") {
    const value = parseAngle(parser);
    if (value === undefined) note(node, parser, "rotation needs an angle.");
    else node.props.push({ name: "rotation", value });
    return;
  }
  if (
    key === "opacity" ||
    key === "radius" ||
    key === "fontSize" ||
    key === "fontWeight" ||
    key === "zIndex" ||
    key === "number" ||
    key === "fractionDigits" ||
    key === "minIntegerDigits"
  ) {
    const value = key === "zIndex" ? parseSignedInteger(parser) : parseSignedNumber(parser);
    if (value === undefined) {
      note(node, parser, `${key} needs a number.`);
      skipProperty(parser);
    } else node.props.push({ name: key, value });
    return;
  }
  if (key === "sampling") {
    // resources.imageSampling (0.25.0): words match by spelling, not reserved.
    const value = eatWord(parser);
    if (value?.lexeme === "smooth" || value?.lexeme === "pixelated") node.props.push({ name: "sampling", value: value.lexeme });
    else note(node, parser, "sampling is smooth or pixelated.");
    return;
  }
  if (key === "frames") {
    // resources.spriteFrames (0.25.0): frames (columns, rows).
    const vec = parseVec(parser);
    if (!vec) note(node, parser, "frames needs (columns, rows).");
    else node.props.push({ name: "frames", vec });
    return;
  }
  if (key === "frame") {
    const value = parseSignedInteger(parser);
    if (value === undefined) {
      note(node, parser, "frame needs a whole number.");
      skipProperty(parser);
    } else node.props.push({ name: "frame", value });
    return;
  }
  if (key === "sign") {
    const value = eatWord(parser);
    if (value?.lexeme === "auto" || value?.lexeme === "always" || value?.lexeme === "never") {
      node.props.push({ name: "sign", value: value.lexeme });
    } else note(node, parser, 'sign is "auto", "always", or "never".');
    return;
  }
  if (key === "visible") {
    const value = parseBoolean(parser);
    if (value === undefined) note(node, parser, "visible needs true or false.");
    else node.props.push({ name: "visible", value });
    return;
  }
  if (key === "space") {
    const value = eat(parser, "keyword");
    if (value?.lexeme === "world" || value?.lexeme === "screen") node.props.push({ name: "space", value: value.lexeme });
    else note(node, parser, 'space is "world" or "screen".');
    return;
  }
  if (key === "fill") {
    const next = peek(parser);
    if (next?.lexeme === "linear" || next?.lexeme === "radial") {
      const paint = parseGradient(parser, node);
      if (paint) node.props.push({ name: "fill", color: paint });
      return;
    }
    const color = eat(parser, "color");
    if (!color?.colorValue) note(node, parser, "fill needs a colour.");
    else node.props.push({ name: "fill", color: color.colorValue });
    return;
  }
  if (key === "cornerRadius" || key === "blur") {
    const value = parseSignedNumber(parser);
    if (value === undefined) note(node, parser, `${key} needs a number.`);
    else node.props.push({ name: key, value });
    return;
  }
  if (key === "inheritOpacity" || key === "isolated") {
    const value = parseBoolean(parser);
    if (value === undefined) note(node, parser, `${key} needs true or false.`);
    else node.props.push({ name: key, value });
    return;
  }
  if (key === "transformParent" || key === "href") {
    if (key === "href") {
      const text = eat(parser, "string");
      if (text?.stringValue === undefined) note(node, parser, "href needs a string.");
      else node.props.push({ name: "href", text: text.stringValue });
      return;
    }
    const parent = parseDotted(parser, false);
    if (!parent) note(node, parser, "transformParent needs an id.");
    else node.props.push({ name: "transformParent", text: parent });
    return;
  }
  if (key === "blend") {
    const value = eat(parser, "keyword");
    const blend = value?.lexeme === "sourceOver" ? "source-over" : value?.lexeme;
    if (blend === "source-over" || blend === "multiply" || blend === "screen" || blend === "overlay") {
      node.props.push({ name: "blend", value: blend });
    } else note(node, parser, "blend is sourceOver, multiply, screen, or overlay.");
    return;
  }
  if (key === "clip" || key === "matte") {
    const target = parseDotted(parser, false);
    if (!target) note(node, parser, `${key} needs a node id.`);
    else node.props.push({ name: key, text: target });
    return;
  }
  if (key === "stroke") {
    const stroke = parseStroke(parser, node);
    if (stroke) node.props.push({ name: "stroke", stroke });
    return;
  }
  if (key === "content" || key === "fontFamily" || key === "group" || key === "decimal" || key === "prefix" || key === "suffix") {
    const text = eat(parser, "string");
    if (!text?.stringValue && text?.stringValue !== "") note(node, parser, `${key} needs a string.`);
    else node.props.push({ name: key, text: text?.stringValue ?? "" });
    return;
  }
  if (key === "fontStyle") {
    const value = eat(parser, "keyword");
    if (value?.lexeme === "normal" || value?.lexeme === "italic") node.props.push({ name: "fontStyle", value: value.lexeme });
    else note(node, parser, 'fontStyle is "normal" or "italic".');
    return;
  }
  if (key === "align") {
    const value = eat(parser, "keyword");
    if (value?.lexeme === "left" || value?.lexeme === "center" || value?.lexeme === "right") {
      node.props.push({ name: "align", value: value.lexeme });
    } else note(node, parser, 'align is "left", "center", or "right".');
    return;
  }
  if (key === "baseline") {
    const value = eat(parser, "keyword");
    if (
      value?.lexeme === "alphabetic" ||
      value?.lexeme === "middle" ||
      value?.lexeme === "top" ||
      value?.lexeme === "bottom"
    ) {
      node.props.push({ name: "baseline", value: value.lexeme });
    } else note(node, parser, "baseline is alphabetic, middle, top, or bottom.");
    return;
  }
  if (key === "fillRule") {
    const value = eat(parser, "keyword");
    if (value?.lexeme === "nonzero" || value?.lexeme === "evenodd") node.props.push({ name: "fillRule", value: value.lexeme });
    else note(node, parser, 'fillRule is "nonzero" or "evenodd".');
    return;
  }
  if (key === "points") {
    const points = parsePointList(parser);
    if (points.length < 3) note(node, parser, "A polygon needs at least three points.");
    node.points = points;
    return;
  }
  note(node, parser, `Unknown property ${key}.`);
  skipProperty(parser);
}

function parseGradient(parser: Parser, node: NodeAst): Paint | undefined {
  const kind = eat(parser, "keyword");
  if (kind?.lexeme === "linear") {
    const start = parseVec(parser);
    const end = parseVec(parser);
    const stops = parseStops(parser, node);
    if (!start || !end || stops.length < 2) {
      note(node, parser, "A linear fill needs two points and two stops.");
      return undefined;
    }
    return { type: "linear", x1: start.x, y1: start.y, x2: end.x, y2: end.y, stops };
  }
  if (kind?.lexeme === "radial") {
    const center = parseVec(parser);
    const radius = parseSignedNumber(parser);
    const stops = parseStops(parser, node);
    if (!center || radius === undefined || stops.length < 2) {
      note(node, parser, "A radial fill needs a centre, a radius, and two stops.");
      return undefined;
    }
    return { type: "radial", cx: center.x, cy: center.y, r: radius, stops };
  }
  note(node, parser, "A gradient is linear or radial.");
  return undefined;
}

function parseStops(parser: Parser, node: NodeAst): Extract<Paint, { type: "linear" }>["stops"] {
  const stops: Extract<Paint, { type: "linear" }>["stops"] = [];
  while (peek(parser)?.type === "number") {
    const offset = parseSignedNumber(parser);
    const color = eat(parser, "color");
    if (offset === undefined || !color?.colorValue) {
      note(node, parser, "A gradient stop needs an offset and a colour.");
      break;
    }
    stops.push({ offset, color: color.colorValue });
  }
  return stops;
}

function parseStroke(parser: Parser, node: NodeAst): Stroke | undefined {
  let paint: Paint | undefined;
  if (peek(parser)?.type === "keyword" && (peek(parser)?.lexeme === "linear" || peek(parser)?.lexeme === "radial")) {
    paint = parseGradient(parser, node);
  } else {
    const color = eat(parser, "color");
    if (color?.colorValue) paint = color.colorValue;
  }
  if (!paint) {
    note(node, parser, "stroke needs a colour or gradient.");
    return undefined;
  }
  let width = 1;
  let cap: "butt" | "round" | "square" = "butt";
  let join: "miter" | "round" | "bevel" = "miter";
  let miterLimit = 4;
  if (eat(parser, "keyword", "width")) {
    const value = parseSignedNumber(parser);
    if (value === undefined) note(node, parser, "stroke width needs a number.");
    else width = value;
  }
  if (eat(parser, "keyword", "cap")) {
    const value = eat(parser, "keyword");
    if (value?.lexeme === "butt" || value?.lexeme === "round" || value?.lexeme === "square") cap = value.lexeme;
    else note(node, parser, "stroke cap is butt, round, or square.");
  }
  if (eat(parser, "keyword", "join")) {
    const value = eat(parser, "keyword");
    if (value?.lexeme === "miter" || value?.lexeme === "round" || value?.lexeme === "bevel") join = value.lexeme;
    else note(node, parser, "stroke join is miter, round, or bevel.");
  }
  if (eat(parser, "keyword", "miterLimit")) {
    const value = parseSignedNumber(parser);
    if (value === undefined) note(node, parser, "miterLimit needs a number.");
    else miterLimit = value;
  }
  let dash: number[] | undefined;
  let phase: number | undefined;
  if (peek(parser)?.type === "identifier" && peek(parser)?.lexeme === "dash") {
    eat(parser, "identifier", "dash");
    if (!eat(parser, "lparen")) note(node, parser, "dash needs a parenthesised length list.");
    const lengths: number[] = [];
    const first = parseSignedNumber(parser);
    if (first === undefined) note(node, parser, "dash needs at least one length.");
    else lengths.push(first);
    while (eat(parser, "comma")) {
      const next = parseSignedNumber(parser);
      if (next === undefined) {
        note(node, parser, "dash lengths must be numbers.");
        break;
      }
      lengths.push(next);
    }
    if (!eat(parser, "rparen")) note(node, parser, "Expected ')' after dash lengths.");
    if (lengths.some((length) => !(length > 0))) note(node, parser, "dash lengths must be positive.");
    dash = lengths;
    if (eat(parser, "identifier", "phase")) {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, "phase needs a number.");
      else phase = value;
    }
  } else if (peek(parser)?.type === "identifier" && peek(parser)?.lexeme === "phase") {
    eat(parser, "identifier", "phase");
    parseSignedNumber(parser);
    note(node, parser, "phase requires a dash list.");
  }
  return {
    color: paint,
    width,
    cap,
    join,
    miterLimit,
    ...(dash ? { dash } : {}),
    ...(phase !== undefined ? { phase } : {}),
  };
}

function parsePointList(parser: Parser): Vec[] {
  const points: Vec[] = [];
  if (!eat(parser, "lparen")) return points;
  const first = parseVec(parser);
  if (first) points.push(first);
  while (eat(parser, "comma")) {
    const point = parseVec(parser);
    if (point) points.push(point);
  }
  if (!eat(parser, "rparen")) fail(parser, "Expected ')' after points.");
  return points;
}

function parsePathCommand(parser: Parser): NodeAst["commands"][number] | undefined {
  const key = eat(parser, "keyword");
  if (!key) return undefined;
  if (key.lexeme === "close") {
    expectSemi(parser);
    return { cmd: "Z" };
  }
  const end = parseVec(parser);
  if (!end) {
    noteLoose(parser, `${key.lexeme} needs a point.`);
    expectSemi(parser);
    return undefined;
  }
  if (key.lexeme === "move") {
    expectSemi(parser);
    return { cmd: "M", x: end.x, y: end.y };
  }
  if (key.lexeme === "line") {
    expectSemi(parser);
    return { cmd: "L", x: end.x, y: end.y };
  }
  if (key.lexeme === "quadratic") {
    const point = parseVec(parser);
    expectSemi(parser);
    if (!point) return undefined;
    return { cmd: "Q", cx: end.x, cy: end.y, x: point.x, y: point.y };
  }
  if (key.lexeme === "cubic") {
    const second = parseVec(parser);
    const point = parseVec(parser);
    expectSemi(parser);
    if (!second || !point) return undefined;
    return { cmd: "C", c1x: end.x, c1y: end.y, c2x: second.x, c2y: second.y, x: point.x, y: point.y };
  }
  noteLoose(parser, `Unknown path command ${key.lexeme}.`);
  expectSemi(parser);
  return undefined;
}

function parseBatch(parser: Parser): BatchAst {
  const start = eat(parser, "keyword", "batch");
  const node: BatchAst = { kind: "batch", items: [], span: start?.span ?? emptySpan(), errors: [] };
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const token = peek(parser);
    if (token?.type === "identifier" && token.lexeme === "beat") {
      note(node, parser, "beat cannot appear inside a batch.");
      skipUnit(parser);
      continue;
    }
    if (!token || token.type !== "keyword") break;
    if (token.lexeme === "seal" || token.lexeme === "const" || token.lexeme === "camera" || token.lexeme === "batch") {
      note(node, parser, `${token.lexeme} cannot appear inside a batch.`);
      skipUnit(parser);
      continue;
    }
    const item = parseUnit(parser);
    if (!item) break;
    node.items.push(item);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseAnimate(parser: Parser): AnimateAst {
  const start = eat(parser, "keyword", "animate");
  const node: AnimateAst = { kind: "animate", target: "", span: start?.span ?? emptySpan(), errors: [] };
  node.target = parseTarget(parser) ?? "";
  if (!node.target) note(node, parser, "animate needs a target.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eat(parser, "keyword");
    if (!key) break;
    if (key.lexeme === "from" || key.lexeme === "to") {
      const value = parseAnimValue(parser);
      if (!value) note(node, parser, `${key.lexeme} needs a number or vector.`);
      else node[key.lexeme] = value;
    } else if (key.lexeme === "start") {
      const time = parseUnitTime(parser, node, "startMs");
      if (time === undefined) note(node, parser, "start needs a time with ms or s, or a beat.");
      else node.startMs = time;
    } else if (key.lexeme === "duration") {
      const time = eat(parser, "duration");
      if (time?.numberValue === undefined) note(node, parser, durationMessage(parser));
      else node.durationMs = time.numberValue;
    } else if (key.lexeme === "ease") {
      const ease = parseEasing(parser);
      if (ease) node.ease = ease;
      else note(node, parser, "Unknown easing.");
    } else if (key.lexeme === "expression") {
      const text = eat(parser, "string");
      if (text?.stringValue === undefined) note(node, parser, "expression needs a string.");
      else node.expression = text.stringValue;
    } else if (key.lexeme === "fill") {
      const fill = eat(parser, "keyword");
      if (fill?.lexeme === "none" || fill?.lexeme === "forwards") node.fill = fill.lexeme;
      else note(node, parser, 'fill is "none" or "forwards".');
    } else if (key.lexeme === "timing") {
      const name = eat(parser, "identifier");
      if (name) node.timingScopeId = name.lexeme;
      else note(node, parser, "timing needs a scope name.");
    } else if (key.lexeme === "order") {
      const order = parseSignedInteger(parser);
      if (order === undefined) note(node, parser, "order needs an integer.");
      else node.order = order;
    } else note(node, parser, `Unknown animate property ${key.lexeme}.`);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseKeyframes(parser: Parser): KeyframeAst {
  const start = eat(parser, "keyword", "keyframes");
  const node: KeyframeAst = {
    kind: "keyframes",
    target: "",
    frames: [],
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  node.target = parseTarget(parser) ?? "";
  if (!node.target) note(node, parser, "keyframes needs a target.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace") && !at(parser, "percentage") && !at(parser, "keyword", "at")) {
    const key = eat(parser, "keyword");
    if (!key) break;
    if (key.lexeme === "start") {
      const time = parseUnitTime(parser, node, "startMs");
      if (time === undefined) note(node, parser, "start needs a time with ms or s, or a beat.");
      else node.startMs = time;
    } else if (key.lexeme === "duration") {
      const time = eat(parser, "duration");
      if (time?.numberValue === undefined) note(node, parser, durationMessage(parser));
      else node.durationMs = time.numberValue;
    } else if (key.lexeme === "ease") {
      const ease = parseEasing(parser);
      if (ease) node.ease = ease;
      else note(node, parser, "Unknown easing.");
    } else if (key.lexeme === "fill") {
      const fill = eat(parser, "keyword");
      if (fill?.lexeme === "none" || fill?.lexeme === "forwards") node.fill = fill.lexeme;
      else note(node, parser, 'fill is "none" or "forwards".');
    } else if (key.lexeme === "timing") {
      const name = eat(parser, "identifier");
      if (name) node.timingScopeId = name.lexeme;
      else note(node, parser, "timing needs a scope name.");
    } else if (key.lexeme === "order") {
      const order = parseSignedInteger(parser);
      if (order === undefined) note(node, parser, "order needs an integer.");
      else node.order = order;
    } else {
      note(node, parser, `Unknown keyframe header ${key.lexeme}.`);
    }
    expectSemi(parser);
  }
  let mixed = false;
  while (at(parser, "percentage") || at(parser, "keyword", "at")) {
    const timed = Boolean(eat(parser, "keyword", "at"));
    const offset = timed ? undefined : eat(parser, "percentage");
    const time = timed ? parseTimeRef(parser) : undefined;
    if (timed && !time) note(node, parser, "at needs a time with ms or s, or a beat.");
    const value = parseAnimValue(parser);
    let ease: KeyframeAst["ease"];
    if (eat(parser, "keyword", "ease")) {
      ease = parseEasing(parser);
      if (!ease) note(node, parser, "Unknown easing.");
    }
    let spatial: { out: Vec; in: Vec } | undefined;
    if (eat(parser, "keyword", "spatial")) {
      const out = parseSpatialVec(parser);
      const incoming = parseSpatialVec(parser);
      if (!out || !incoming) note(node, parser, "spatial needs two vectors.");
      else spatial = { out, in: incoming };
    }
    expectSemi(parser);
    if ((timed ? node.frames.length > 0 : (node.timedFrames?.length ?? 0) > 0) && !mixed) {
      mixed = true;
      note(node, parser, "A keyframe track uses percentage keys or timed (at) keys, not both.");
    }
    if (timed) {
      if (!time) continue;
      if (!value) note(node, parser, "A timed key needs a value.");
      else {
        const frame: TimedFrameAst = { atMs: time.ms, value, ...(time.beat ? { beat: time.beat } : {}) };
        if (ease) frame.ease = ease;
        if (spatial) frame.spatial = spatial;
        (node.timedFrames ??= []).push(frame);
      }
    } else if (offset?.numberValue === undefined || !value) note(node, parser, "A keyframe needs an offset and a value.");
    else node.frames.push({ offset: offset.numberValue, value, ...(ease ? { ease } : {}), ...(spatial ? { spatial } : {}) });
  }
  if (node.timedFrames) {
    if (node.startMs !== undefined || node.durationMs !== undefined || node.beatRefs?.length) {
      note(node, parser, "Timed keys set the track's start and duration; remove start and duration.");
    }
  }
  if (node.frames.length + (node.timedFrames?.length ?? 0) < 2) note(node, parser, "A keyframe track needs at least two samples.");
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

/**
 * A time position (MotionScript 0.23 timing.timedKeys): a literal duration,
 * a beat name, or a beat name plus or minus a duration. A sign followed by
 * anything other than a duration is left for the caller (a key value may be
 * a signed number).
 */
function parseTimeRef(parser: Parser): { ms: number; beat?: string } | undefined {
  const literal = eat(parser, "duration");
  if (literal) return literal.numberValue === undefined ? undefined : { ms: literal.numberValue };
  const name = eat(parser, "identifier");
  if (!name) return undefined;
  const sign = peek(parser);
  const amount = parser.tokens[parser.index + 1];
  if (sign && (sign.type === "plus" || sign.type === "minus") && amount?.type === "duration" && amount.numberValue !== undefined) {
    parser.index += 2;
    return { ms: sign.type === "minus" ? -amount.numberValue : amount.numberValue, beat: name.lexeme };
  }
  return { ms: 0, beat: name.lexeme };
}

/** Parse a time position into `field`; a named beat is recorded for binding at push time. */
function parseUnitTime(parser: Parser, node: { beatRefs?: BeatRef[] }, field: BeatRef["field"]): number | undefined {
  const ref = parseTimeRef(parser);
  if (!ref) return undefined;
  if (ref.beat) (node.beatRefs ??= []).push({ field, beat: ref.beat });
  return ref.ms;
}

/** `duration` is a length, so it never names a beat (a beat is a point in time). */
function durationMessage(parser: Parser): string {
  return peek(parser)?.type === "identifier"
    ? "duration needs a length with ms or s; a beat is a point in time (use timed keys to end at a beat)."
    : "duration needs a time with ms or s.";
}

/** `beat <name> at <time | beat ± time>;` — a compile-time constant time (MotionScript 0.23). */
function parseBeat(parser: Parser): BeatAst {
  const start = eat(parser, "identifier", "beat");
  const node: BeatAst = { kind: "beat", name: "", atMs: 0, span: start?.span ?? emptySpan(), errors: [] };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else note(node, parser, "beat needs a name.");
  if (!eat(parser, "keyword", "at")) note(node, parser, "Expected 'at'.");
  const time = parseTimeRef(parser);
  if (!time) note(node, parser, "at needs a time with ms or s, or an earlier beat.");
  else {
    node.atMs = time.ms;
    if (time.beat) node.after = time.beat;
  }
  expectSemi(parser);
  return node;
}

function parseStep(parser: Parser): StepAst {
  const start = eat(parser, "keyword", "step");
  const node: StepAst = { kind: "step", target: "", timeMs: 0, value: true, span: start?.span ?? emptySpan(), errors: [] };
  node.target = parseTarget(parser) ?? "";
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  if (!eat(parser, "keyword", "at")) note(node, parser, 'A step needs at.');
  const time = parseUnitTime(parser, node, "timeMs");
  if (time === undefined) note(node, parser, "at needs a time with ms or s, or a beat.");
  else node.timeMs = time;
  expectSemi(parser);
  if (!eat(parser, "keyword", "value")) note(node, parser, "A step needs value.");
  const asBool = parseBoolean(parser);
  if (asBool !== undefined) {
    node.value = asBool;
  } else {
    const asString = eat(parser, "string");
    if (asString?.stringValue !== undefined) node.value = asString.stringValue;
    else note(node, parser, "value needs true, false, or a string.");
  }
  expectSemi(parser);
  if (eat(parser, "keyword", "timing")) {
    const scope = eat(parser, "identifier");
    if (scope) node.timingScopeId = scope.lexeme;
    else note(node, parser, "timing needs a scope name.");
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseSeal(parser: Parser): SealAst {
  const start = eat(parser, "keyword", "seal");
  const node: SealAst = { kind: "seal", timeMs: 0, span: start?.span ?? emptySpan(), errors: [] };
  const time = parseUnitTime(parser, node, "timeMs");
  if (time === undefined) note(node, parser, "seal needs a time with ms or s, or a beat.");
  else node.timeMs = time;
  expectSemi(parser);
  return node;
}

function parseEntityDecl(parser: Parser): EntityDeclAst {
  const start = eat(parser, "keyword", "entity");
  const node: EntityDeclAst = {
    kind: "entity",
    name: "",
    entityKind: "drawable",
    parentId: null,
    activationMs: 0,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const name = parseDotted(parser, false);
  if (name) node.name = name;
  else note(node, parser, "entity needs an id.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  let sawAt = false;
  while (!done(parser) && !at(parser, "rbrace")) {
    if (isNodeStart(parser)) {
      if (node.node) note(node, parser, "entity allows at most one private node.");
      else node.node = parseNode(parser);
      continue;
    }
    const key = eat(parser, "keyword") ?? eat(parser, "identifier");
    if (!key) break;
    if (key.lexeme === "kind") {
      const kind = eat(parser, "identifier") ?? eat(parser, "keyword", "group");
      if (kind?.lexeme === "drawable" || kind?.lexeme === "group") node.entityKind = kind.lexeme;
      else note(node, parser, "kind must be drawable or group.");
    } else if (key.lexeme === "parent") {
      const root = eat(parser, "identifier");
      if (root?.lexeme === "root") node.parentId = null;
      else if (root) {
        // First segment already consumed; allow dotted remainder.
        let parent = root.lexeme;
        while (eat(parser, "dot")) {
          const part = eatPathSegment(parser);
          if (!part) break;
          parent += `.${part.lexeme}`;
        }
        node.parentId = parent;
      } else note(node, parser, "parent needs an entity id or root.");
    } else if (key.lexeme === "label") {
      const label = eat(parser, "string");
      if (label) node.label = label.stringValue ?? label.lexeme;
      else note(node, parser, "label needs a string.");
    } else if (key.lexeme === "at") {
      const time = eat(parser, "duration");
      if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
      else {
        node.activationMs = time.numberValue;
        sawAt = true;
      }
    } else note(node, parser, `Unknown entity property ${key.lexeme}.`);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  if (!sawAt) note(node, parser, "entity needs at <time>.");
  return node;
}

function parseGeometryDecl(parser: Parser): GeometryDeclAst {
  const start = eat(parser, "keyword", "geometry");
  const node: GeometryDeclAst = {
    kind: "geometry",
    name: "",
    space: "world",
    activationMs: 0,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else note(node, parser, "geometry needs an id.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  let sawAt = false;
  let sawSpace = false;
  while (!done(parser) && !at(parser, "rbrace")) {
    if (isNodeStart(parser)) {
      if (node.node) note(node, parser, "geometry needs exactly one drawable node.");
      else node.node = parseNode(parser);
      continue;
    }
    const key = eat(parser, "keyword");
    if (!key) break;
    if (key.lexeme === "space") {
      const space = eat(parser, "keyword", "world") ?? eat(parser, "identifier");
      if (space?.lexeme === "world" || space?.lexeme === "local") {
        node.space = space.lexeme;
        sawSpace = true;
      } else note(node, parser, "space must be world or local.");
    } else if (key.lexeme === "at") {
      const time = eat(parser, "duration");
      if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
      else {
        node.activationMs = time.numberValue;
        sawAt = true;
      }
    } else note(node, parser, `Unknown geometry property ${key.lexeme}.`);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  if (!sawSpace) note(node, parser, "geometry needs space world|local.");
  if (!sawAt) note(node, parser, "geometry needs at <time>.");
  if (!node.node) note(node, parser, "geometry needs one drawable node.");
  return node;
}

function parseBindDecl(parser: Parser): BindDeclAst {
  const start = eat(parser, "keyword", "bind");
  const node: BindDeclAst = {
    kind: "bind",
    entityId: "",
    geometryId: "",
    activationMs: 0,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const entityId = parseDotted(parser, false);
  if (entityId) node.entityId = entityId;
  else note(node, parser, "bind needs an entity id.");
  if (!eat(parser, "keyword", "to")) note(node, parser, "Expected 'to'.");
  const geometryId = eat(parser, "identifier");
  if (geometryId) node.geometryId = geometryId.lexeme;
  else note(node, parser, "bind needs a geometry id.");
  if (!eat(parser, "keyword", "at")) note(node, parser, "Expected 'at'.");
  const time = eat(parser, "duration");
  if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
  else node.activationMs = time.numberValue;
  expectSemi(parser);
  return node;
}

function parseRemoveEntity(parser: Parser): RemoveEntityAst {
  const start = eat(parser, "keyword", "remove");
  const node: RemoveEntityAst = {
    kind: "removeEntity",
    entityId: "",
    activationMs: 0,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  if (!eat(parser, "keyword", "entity")) note(node, parser, "Expected 'entity'.");
  const entityId = parseDotted(parser, false);
  if (entityId) node.entityId = entityId;
  else note(node, parser, "remove entity needs an id.");
  if (!eat(parser, "keyword", "at")) note(node, parser, "Expected 'at'.");
  const time = eat(parser, "duration");
  if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
  else node.activationMs = time.numberValue;
  expectSemi(parser);
  return node;
}

function parseReparentDecl(parser: Parser): ReparentDeclAst {
  const start = eat(parser, "keyword", "reparent");
  const node: ReparentDeclAst = {
    kind: "reparent",
    entityId: "",
    parentId: null,
    activationMs: 0,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const entityId = parseDotted(parser, false);
  if (entityId) node.entityId = entityId;
  else note(node, parser, "reparent needs an entity id.");
  const under = eat(parser, "identifier");
  if (under?.lexeme !== "under") note(node, parser, "Expected 'under'.");
  const rootOrParent = eat(parser, "identifier") ?? eat(parser, "keyword");
  if (rootOrParent?.lexeme === "root") node.parentId = null;
  else if (rootOrParent) {
    let parent = rootOrParent.lexeme;
    while (eat(parser, "dot")) {
      const part = eatPathSegment(parser);
      if (!part) break;
      parent += `.${part.lexeme}`;
    }
    node.parentId = parent;
  } else note(node, parser, "under needs an entity id or root.");
  if (!eat(parser, "keyword", "at")) note(node, parser, "Expected 'at'.");
  const time = eat(parser, "duration");
  if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
  else node.activationMs = time.numberValue;
  expectSemi(parser);
  return node;
}

function parseBehaviourDecl(parser: Parser): BehaviourDeclAst {
  const start = eat(parser, "keyword", "behaviour");
  const node: BehaviourDeclAst = {
    kind: "behaviour",
    id: "",
    entityId: "",
    channel: "",
    activationMs: 0,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const id = eat(parser, "identifier");
  if (id) node.id = id.lexeme;
  else note(node, parser, "behaviour needs an id.");
  const on = eat(parser, "identifier");
  if (on?.lexeme !== "on") note(node, parser, "Expected 'on'.");
  const address = parseDotted(parser, false);
  if (address) {
    const split = splitEntityChannel(address);
    if (split) {
      node.entityId = split.entityId;
      node.channel = split.channel;
    } else note(node, parser, `Unknown behaviour channel in ${address}.`);
  } else note(node, parser, "behaviour needs entity.channel.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  let sawActivate = false;
  while (!done(parser) && !at(parser, "rbrace")) {
    if (!eat(parser, "keyword", "activate")) {
      note(node, parser, "behaviour body only supports activate at <time>.");
      break;
    }
    if (!eat(parser, "keyword", "at")) note(node, parser, "Expected 'at'.");
    const time = eat(parser, "duration");
    if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
    else {
      node.activationMs = time.numberValue;
      sawActivate = true;
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  if (!sawActivate) note(node, parser, "behaviour needs activate at <time>.");
  return node;
}

function parseCancelBehaviour(parser: Parser): CancelBehaviourAst {
  const start = eat(parser, "keyword", "cancel");
  const node: CancelBehaviourAst = {
    kind: "cancelBehaviour",
    behaviourId: "",
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  if (!eat(parser, "keyword", "behaviour")) note(node, parser, "Expected 'behaviour'.");
  const id = eat(parser, "identifier");
  if (id) node.behaviourId = id.lexeme;
  else note(node, parser, "cancel behaviour needs an id.");
  expectSemi(parser);
  return node;
}

function splitEntityChannel(address: string): { entityId: string; channel: string } | undefined {
  const channels = [
    "transform.position.x",
    "transform.position.y",
    "transform.position",
    "transform.rotation",
    "transform.scale.x",
    "transform.scale.y",
    "transform.scale",
    "transform.pivot.x",
    "transform.pivot.y",
    "transform.pivot",
    "stroke.phase",
    "stroke.width",
    "stroke.r",
    "stroke.g",
    "stroke.b",
    "stroke.a",
    "fill.r",
    "fill.g",
    "fill.b",
    "fill.a",
    "trim.start",
    "trim.end",
    "trim.offset",
    "opacity",
    "visible",
    "commands",
  ];
  for (const channel of channels) {
    const suffix = `.${channel}`;
    if (address.endsWith(suffix)) {
      const entityId = address.slice(0, -suffix.length);
      if (entityId) return { entityId, channel };
    }
  }
  return undefined;
}

function parseTarget(parser: Parser): string | undefined {
  if (at(parser, "keyword", "camera")) {
    eat(parser, "keyword", "camera");
    if (!eat(parser, "lparen")) return undefined;
    const name = eat(parser, "identifier");
    if (!eat(parser, "rparen") || !name) return undefined;
    const rest = parseDotted(parser, true);
    return rest ? `camera(${name.lexeme}).${rest}` : undefined;
  }
  return parseDotted(parser, false);
}

function parseDotted(parser: Parser, required: boolean): string | undefined {
  if (required && !eat(parser, "dot")) return undefined;
  const first = required ? eatPathSegment(parser) : eat(parser, "identifier");
  if (!first) return undefined;
  let text = first.lexeme;
  while (eat(parser, "dot")) {
    const part = eatPathSegment(parser);
    if (!part) return undefined;
    text += `.${part.lexeme}`;
  }
  return text;
}

function eatPathSegment(parser: Parser): Token | undefined {
  return eat(parser, "identifier") ?? eat(parser, "keyword");
}

function parseAnimValue(parser: Parser): AnimLiteral | undefined {
  if (at(parser, "keyword", "path") && parser.tokens[parser.index + 1]?.type === "lbrace") {
    eat(parser, "keyword", "path");
    eat(parser, "lbrace");
    const commands: PathCommand[] = [];
    while (!done(parser) && !at(parser, "rbrace")) {
      const command = parsePathCommand(parser);
      if (!command) break;
      commands.push(command);
    }
    eat(parser, "rbrace");
    return commands.length > 0 ? { kind: "path", value: commands } : undefined;
  }
  if (at(parser, "lparen")) {
    const vec = parseVec(parser);
    return vec ? { kind: "vec2", value: vec } : undefined;
  }
  if (at(parser, "angle") || ((at(parser, "plus") || at(parser, "minus")) && parser.tokens[parser.index + 1]?.type === "angle")) {
    const value = parseAngle(parser);
    return value === undefined ? undefined : { kind: "number", value };
  }
  const value = parseSignedNumber(parser);
  return value === undefined ? undefined : { kind: "number", value };
}

function parseTiming(parser: Parser): TimingAst {
  const start = eat(parser, "keyword", "timing");
  const node: TimingAst = { kind: "timing", name: "", span: start?.span ?? emptySpan(), errors: [] };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else note(node, parser, "timing needs a name.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    // period and repeat (timing.cyclicScopes) match by spelling; they are not reserved words.
    const key = eatWord(parser);
    if (!key) break;
    if (key.lexeme === "period") {
      const period = eat(parser, "duration");
      if (period?.numberValue === undefined) note(node, parser, "period needs a duration with ms or s.");
      else node.periodMs = period.numberValue;
    } else if (key.lexeme === "repeat") {
      const count = parseSignedNumber(parser);
      if (count === undefined) note(node, parser, "repeat needs a whole number of cycles.");
      else node.repeat = count;
    } else if (key.lexeme === "parent") {
      const parent = eat(parser, "identifier");
      if (parent) node.parent = parent.lexeme;
      else note(node, parser, "parent needs a scope name.");
    } else if (key.lexeme === "offset") {
      const offset = parseUnitTime(parser, node, "offsetMs");
      if (offset === undefined) note(node, parser, "offset needs a time with ms or s, or a beat.");
      else node.offsetMs = offset;
    } else if (key.lexeme === "stretch") {
      const stretch = parseSignedNumber(parser);
      if (stretch === undefined) note(node, parser, "stretch needs a number.");
      else node.stretch = stretch;
    } else note(node, parser, `Unknown timing property ${key.lexeme}.`);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseComposition(parser: Parser): CompositionAst {
  const start = eat(parser, "keyword", "composition");
  const node: CompositionAst = { kind: "composition", name: "", nodes: [], span: start?.span ?? emptySpan(), errors: [] };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else note(node, parser, "composition needs a name.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    if (!isNodeStart(parser)) {
      note(node, parser, "A composition contains node declarations.");
      break;
    }
    node.nodes.push(parseNode(parser));
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseInstance(parser: Parser): InstanceAst {
  const start = eat(parser, "keyword", "instance");
  const node: InstanceAst = { kind: "instance", name: "", definition: "", span: start?.span ?? emptySpan(), errors: [] };
  const name = eat(parser, "identifier");
  if (name) node.name = name.lexeme;
  else note(node, parser, "instance needs a name.");
  if (!eat(parser, "keyword", "of")) note(node, parser, 'Expected "of".');
  const definition = eat(parser, "identifier");
  if (definition) node.definition = definition.lexeme;
  else note(node, parser, "instance needs a composition name.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eat(parser, "keyword");
    if (!key) break;
    if (key.lexeme === "start" || key.lexeme === "end") {
      const time = eat(parser, "duration");
      if (time?.numberValue === undefined) note(node, parser, `${key.lexeme} needs a time with ms or s.`);
      else if (key.lexeme === "start") node.startMs = time.numberValue;
      else node.endMs = time.numberValue;
    } else if (key.lexeme === "timing") {
      const timing = eat(parser, "identifier");
      if (timing) node.timing = timing.lexeme;
      else note(node, parser, "timing needs a scope name.");
    } else if (key.lexeme === "parent" || key.lexeme === "transformParent") {
      const parent = parseDotted(parser, false);
      if (!parent) note(node, parser, `${key.lexeme} needs a name.`);
      else if (key.lexeme === "parent") node.parent = parent;
      else node.transformParent = parent;
    } else if (key.lexeme === "position") {
      const position = parseVec(parser);
      if (position) node.position = position;
      else note(node, parser, "position needs a vector.");
    } else note(node, parser, `Unknown instance property ${key.lexeme}.`);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseOperators(parser: Parser): OperatorsAst {
  const start = eat(parser, "keyword", "operators");
  const node: OperatorsAst = { kind: "operators", nodeId: "", operators: [], span: start?.span ?? emptySpan(), errors: [] };
  const nodeId = parseDotted(parser, false);
  if (nodeId) node.nodeId = nodeId;
  else note(node, parser, "operators needs a node id.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eat(parser, "keyword");
    if (!key) break;
    if (key.lexeme === "trim") {
      const startValue = parseSignedNumber(parser);
      if (!eat(parser, "comma")) note(node, parser, "trim needs three numbers.");
      const endValue = parseSignedNumber(parser);
      if (!eat(parser, "comma")) note(node, parser, "trim needs three numbers.");
      const offset = parseSignedNumber(parser);
      if (startValue === undefined || endValue === undefined || offset === undefined) note(node, parser, "trim needs three numbers.");
      else node.operators.push({ op: "trim", start: startValue, end: endValue, offset });
    } else if (key.lexeme === "round") {
      const radius = parseSignedNumber(parser);
      if (radius === undefined) note(node, parser, "round needs a radius.");
      else node.operators.push({ op: "round", radius });
    } else note(node, parser, `Unknown operator ${key.lexeme}.`);
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

const INTERACT_CHANNELS: Record<string, InteractionChannel> = {
  "position.x": "transform.position.x",
  "position.y": "transform.position.y",
  rotation: "transform.rotation",
  "scale.x": "transform.scale.x",
  "scale.y": "transform.scale.y",
  opacity: "opacity",
};

/** A bare word, whether or not it is reserved. Interaction sub-words are not new keywords. */
function eatWord(parser: Parser, lexeme?: string): Token | undefined {
  return eat(parser, "identifier", lexeme) ?? eat(parser, "keyword", lexeme);
}

/** `[node.path.]channel` where channel is one of the interaction channel paths. */
function parseInteractAddress(parser: Parser): { nodeId?: string; channel: InteractionChannel } | undefined {
  const first = eatWord(parser);
  if (!first) return undefined;
  const parts = [first.lexeme];
  while (eat(parser, "dot")) {
    const part = eatWord(parser);
    if (!part) return undefined;
    parts.push(part.lexeme);
  }
  for (const size of [2, 1]) {
    if (parts.length < size) continue;
    const channel = INTERACT_CHANNELS[parts.slice(-size).join(".")];
    if (!channel) continue;
    const nodeId = parts.slice(0, -size).join(".");
    return nodeId ? { nodeId, channel } : { channel };
  }
  return undefined;
}

function parseInteract(parser: Parser): InteractAst {
  const start = eat(parser, "keyword", "interact");
  const node: InteractAst = { kind: "interact", nodeId: "", bindings: [], span: start?.span ?? emptySpan(), errors: [] };
  const nodeId = parseDotted(parser, false);
  if (nodeId) node.nodeId = nodeId;
  else note(node, parser, "interact needs a node id.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected an interaction property.");
      skipProperty(parser);
      expectSemi(parser);
      continue;
    }
    if (key.lexeme === "focusable") {
      if (eat(parser, "keyword", "true")) node.focusable = true;
      else if (eat(parser, "keyword", "false")) node.focusable = false;
      else note(node, parser, "focusable needs true or false.");
    } else if (key.lexeme === "tabIndex") {
      const value = parseSignedNumber(parser);
      if (value === undefined || !Number.isInteger(value)) note(node, parser, "tabIndex needs an integer.");
      else node.tabIndex = value;
    } else if (key.lexeme === "pointer") {
      if (eatWord(parser, "none")) node.pointer = "none";
      else if (eatWord(parser, "auto")) node.pointer = "auto";
      else note(node, parser, "pointer needs auto or none.");
    } else if (key.lexeme === "on") {
      const binding = parseInteractBinding(parser, node);
      if (binding) node.bindings.push(binding);
      else skipProperty(parser);
    } else {
      note(node, parser, `Unknown interact property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

/**
 * `attach <node> along <path> { progress n; orient true; rollRadius r; };`
 * Only `attach` and `along` are reserved; body words match by spelling.
 */
function parseAttach(parser: Parser): AttachAst {
  const start = eat(parser, "keyword", "attach");
  const node: AttachAst = { kind: "attach", nodeId: "", pathId: "", span: start?.span ?? emptySpan(), errors: [] };
  const nodeId = parseDotted(parser, false);
  if (nodeId) node.nodeId = nodeId;
  else note(node, parser, "attach needs a node id.");
  if (!eat(parser, "keyword", "along")) note(node, parser, "attach needs 'along <path id>'.");
  else {
    const pathId = parseDotted(parser, false);
    if (pathId) node.pathId = pathId;
    else note(node, parser, "attach needs a path id after 'along'.");
  }
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected an attach property.");
      skipProperty(parser);
      expectSemi(parser);
      continue;
    }
    if (key.lexeme === "progress") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, "progress needs a number.");
      else node.progress = value;
    } else if (key.lexeme === "orient") {
      const value = parseBoolean(parser);
      if (value === undefined) note(node, parser, "orient needs true or false.");
      else node.orient = value;
    } else if (key.lexeme === "rollRadius") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, "rollRadius needs a number.");
      else node.rollRadius = value;
    } else {
      note(node, parser, `Unknown attach property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  if (node.progress === undefined && node.errors.length === 0) note(node, parser, "attach needs progress.");
  return node;
}

function parseInteractBinding(parser: Parser, node: InteractAst): InteractionBinding | undefined {
  const trigger = eatWord(parser);
  if (!trigger || !["click", "activate", "drag", "wheel", "key"].includes(trigger.lexeme)) {
    note(node, parser, "on needs click, activate, drag, wheel or key.");
    return undefined;
  }
  const on = trigger.lexeme as InteractionBinding["on"];
  let key: string | undefined;
  if (on === "key") {
    const name = eat(parser, "string");
    if (!name?.stringValue) {
      note(node, parser, 'on key needs a key name string, for example "ArrowRight".');
      return undefined;
    }
    key = name.stringValue;
  }
  const verb = eatWord(parser);
  const withKey = (binding: InteractionBinding): InteractionBinding => (key === undefined ? binding : { ...binding, key });
  if (verb?.lexeme === "dragTranslate") {
    const min = parseVec(parser);
    const max = parseVec(parser);
    if (!min || !max) {
      note(node, parser, "dragTranslate needs (minX, minY) (maxX, maxY).");
      return undefined;
    }
    return withKey({ on, action: { kind: "dragTranslate", min: { x: min.x, y: min.y }, max: { x: max.x, y: max.y } } });
  }
  if (verb?.lexeme !== "set" && verb?.lexeme !== "toggle" && verb?.lexeme !== "step") {
    note(node, parser, "Interaction action must be set, toggle, step or dragTranslate.");
    return undefined;
  }
  const address = parseInteractAddress(parser);
  if (!address) {
    note(node, parser, "Interaction actions write position.x, position.y, rotation, scale.x, scale.y or opacity.");
    return undefined;
  }
  const numbers: number[] = [];
  for (;;) {
    const before = parser.index;
    const value = parseSignedNumber(parser);
    if (value === undefined) {
      parser.index = before;
      break;
    }
    numbers.push(value);
  }
  const target = address.nodeId === undefined ? {} : { nodeId: address.nodeId };
  const expected = verb.lexeme === "set" ? 1 : verb.lexeme === "toggle" ? 2 : 3;
  if (numbers.length !== expected) {
    note(node, parser, `${verb.lexeme} needs ${expected} number${expected === 1 ? "" : "s"}.`);
    return undefined;
  }
  const [a, b, c] = numbers as [number, number, number];
  const channel = address.channel;
  if (verb.lexeme === "set") return withKey({ on, ...target, action: { kind: "set", channel, value: a } });
  if (verb.lexeme === "toggle") return withKey({ on, ...target, action: { kind: "toggle", channel, values: [a, b] } });
  return withKey({ on, ...target, action: { kind: "step", channel, delta: a, min: b, max: c } });
}

/**
 * `audio <id> "<href>" <duration>;`
 * `audio <id> = speech|effect "<prompt>" [{ … }];`
 * `audio.narration|effects("<prompt>" [, args…]) [at <time>];`
 */
function parseAudioUnit(parser: Parser): AudioDeclAst | AudioSugarAst {
  const start = eat(parser, "keyword", "audio");
  const span = start?.span ?? emptySpan();
  if (eat(parser, "dot")) return parseAudioSugar(parser, span);
  const node: AudioDeclAst = { kind: "audio", id: "", span, errors: [] };
  const id = eat(parser, "identifier");
  if (id) node.id = id.lexeme;
  else note(node, parser, "audio needs a resource id.");
  if (eat(parser, "eq")) {
    const modality = eatWord(parser);
    if (modality?.lexeme === "speech" || modality?.lexeme === "effect") {
      const prompt = eat(parser, "string");
      if (prompt?.stringValue !== undefined) {
        node.generative = { modality: modality.lexeme, prompt: prompt.stringValue };
      } else {
        note(node, parser, "generative audio needs a prompt string.");
        node.generative = { modality: modality.lexeme, prompt: "" };
      }
      if (eat(parser, "lbrace")) {
        while (!done(parser) && !at(parser, "rbrace")) {
          parseGenerativeItem(parser, node, node.generative);
          expectSemi(parser);
        }
        eat(parser, "rbrace");
      }
    } else {
      note(node, parser, "generative audio needs speech or effect after '='.");
    }
    expectSemi(parser);
    return node;
  }
  const href = eat(parser, "string");
  if (href?.stringValue) node.href = href.stringValue;
  else note(node, parser, 'audio needs an href string, for example "voice.wav".');
  const length = eat(parser, "duration");
  if (length?.numberValue === undefined) note(node, parser, "audio needs its decoded length with ms or s.");
  else node.durationMs = length.numberValue;
  expectSemi(parser);
  return node;
}

function parseAudioSugar(parser: Parser, span: SourceSpan): AudioSugarAst {
  const kind = eatWord(parser);
  const bus = kind?.lexeme === "narration" ? "narration" : kind?.lexeme === "effects" ? "effects" : undefined;
  const node: AudioSugarAst = {
    kind: "audioSugar",
    bus: bus ?? "narration",
    generative: { modality: bus === "effects" ? "effect" : "speech", prompt: "" },
    startMs: 0,
    span,
    errors: [],
  };
  if (!bus) note(node, parser, "audio sugar needs .narration or .effects.");
  if (!eat(parser, "lparen")) note(node, parser, "Expected '(' after audio sugar.");
  const prompt = eat(parser, "string");
  if (prompt?.stringValue !== undefined) node.generative.prompt = prompt.stringValue;
  else note(node, parser, "audio sugar needs a prompt string.");
  while (eat(parser, "comma")) parseSugarArg(parser, node, node.generative);
  if (!eat(parser, "rparen")) note(node, parser, "Expected ')'.");
  if (eat(parser, "keyword", "at")) {
    const time = eat(parser, "duration");
    if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
    else node.startMs = time.numberValue;
  }
  expectSemi(parser);
  return node;
}

function parseGenerativeItem(parser: Parser, node: { errors: Diagnostic[]; span: SourceSpan }, fields: AudioGenerativeFields): void {
  const key = eatWord(parser);
  if (!key) {
    note(node, parser, "Expected a generative audio property.");
    skipProperty(parser);
    return;
  }
  applyGenerativeArg(parser, node, fields, key.lexeme, true);
}

function parseSugarArg(parser: Parser, node: { errors: Diagnostic[]; span: SourceSpan }, fields: AudioGenerativeFields): void {
  const key = eatWord(parser);
  if (!key) {
    note(node, parser, "Expected a sugar argument name.");
    return;
  }
  applyGenerativeArg(parser, node, fields, key.lexeme, false);
}

function applyGenerativeArg(
  parser: Parser,
  node: { errors: Diagnostic[]; span: SourceSpan },
  fields: AudioGenerativeFields,
  key: string,
  bodyForm: boolean,
): void {
  if (key === "duration") {
    const value = eat(parser, "duration");
    if (value?.numberValue === undefined) note(node, parser, "duration needs a time with ms or s.");
    else fields.durationHintMs = value.numberValue;
    return;
  }
  if (key === "voice") {
    const value = eat(parser, "string");
    if (value?.stringValue === undefined) note(node, parser, "voice needs a string.");
    else fields.voice = value.stringValue;
    return;
  }
  if (key === "loop") {
    if (eat(parser, "keyword", "true")) fields.loop = true;
    else if (eat(parser, "keyword", "false")) fields.loop = false;
    else if (bodyForm) fields.loop = true;
    else note(node, parser, "loop needs true or false.");
    return;
  }
  if (key === "seed") {
    const value = parseSignedNumber(parser);
    if (value === undefined) note(node, parser, "seed needs a number.");
    else fields.seed = value;
    return;
  }
  if (key === "stability" || key === "similarity" || key === "speed") {
    const value = parseSignedNumber(parser);
    if (value === undefined) note(node, parser, `${key} needs a number.`);
    else {
      fields.style = { ...fields.style, [key]: value };
    }
    return;
  }
  note(node, parser, `Unknown generative audio property ${key}.`);
  if (bodyForm) skipProperty(parser);
}

const CUE_BUSES = new Set(["narration", "effects", "music"]);

/**
 * `cue <id> <bus> <resource> at <time> [{ offset t; duration t; loops n; gain g;
 * fadeIn t; fadeOut t; required true|false; }];` Body words match by spelling.
 */
function parseCueDecl(parser: Parser): CueDeclAst {
  const start = eat(parser, "keyword", "cue");
  const node: CueDeclAst = {
    kind: "cue",
    cue: { id: "", resourceId: "", bus: "effects", startMs: 0 },
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const id = eat(parser, "identifier");
  if (id) node.cue.id = id.lexeme;
  else note(node, parser, "cue needs an id.");
  const bus = eatWord(parser);
  if (bus && CUE_BUSES.has(bus.lexeme)) node.cue.bus = bus.lexeme as CueDeclAst["cue"]["bus"];
  else note(node, parser, "cue needs a bus: narration, effects or music.");
  const resource = eat(parser, "identifier");
  if (resource) node.cue.resourceId = resource.lexeme;
  else note(node, parser, "cue needs an audio resource id.");
  if (!eat(parser, "keyword", "at")) note(node, parser, "Expected 'at'.");
  const time = parseUnitTime(parser, node, "cue.startMs");
  if (time === undefined) note(node, parser, "at needs a time with ms or s, or a beat.");
  else node.cue.startMs = time;
  if (eat(parser, "lbrace")) {
    while (!done(parser) && !at(parser, "rbrace")) {
      const key = eatWord(parser);
      const timeKeys: Record<string, "offsetMs" | "durationMs" | "fadeInMs" | "fadeOutMs"> = {
        offset: "offsetMs",
        duration: "durationMs",
        fadeIn: "fadeInMs",
        fadeOut: "fadeOutMs",
      };
      if (!key) {
        note(node, parser, "Expected a cue property.");
        skipProperty(parser);
      } else if (timeKeys[key.lexeme]) {
        const value = eat(parser, "duration");
        if (value?.numberValue === undefined) note(node, parser, `${key.lexeme} needs a time with ms or s.`);
        else node.cue[timeKeys[key.lexeme]!] = value.numberValue;
      } else if (key.lexeme === "loops" || key.lexeme === "gain") {
        const value = parseSignedNumber(parser);
        if (value === undefined) note(node, parser, `${key.lexeme} needs a number.`);
        else node.cue[key.lexeme] = value;
      } else if (key.lexeme === "required") {
        if (eat(parser, "keyword", "true")) node.cue.required = true;
        else if (eat(parser, "keyword", "false")) node.cue.required = false;
        else note(node, parser, "required needs true or false.");
      } else {
        note(node, parser, `Unknown cue property ${key.lexeme}.`);
        skipProperty(parser);
      }
      expectSemi(parser);
    }
    eat(parser, "rbrace");
  }
  expectSemi(parser);
  return node;
}

/** `(x, y, z)` with three signed numbers. */
function parseVec3(parser: Parser): SpatialVec3 | undefined {
  if (!eat(parser, "lparen")) return undefined;
  const x = parseSignedNumber(parser);
  if (x === undefined || !eat(parser, "comma")) return undefined;
  const y = parseSignedNumber(parser);
  if (y === undefined || !eat(parser, "comma")) return undefined;
  const z = parseSignedNumber(parser);
  if (z === undefined || !eat(parser, "rparen")) return undefined;
  return { x, y, z };
}

/**
 * `spatialLayer <id> { camera { … }; surface <node> { … }; … };` Only
 * `spatialLayer` is reserved; `camera`, `surface` and every body word match by
 * spelling, as audio buses do.
 */
function parseSpatialLayer(parser: Parser): SpatialLayerAst {
  const start = eat(parser, "keyword", "spatialLayer");
  const node: SpatialLayerAst = {
    kind: "spatialLayer",
    layer: { id: "", camera: { projection: "perspective" }, surfaces: [] },
    hasCamera: false,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const id = eat(parser, "identifier");
  if (id) node.layer.id = id.lexeme;
  else note(node, parser, "spatialLayer needs an id.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (key?.lexeme === "camera") {
      parseSpatialCamera(parser, node);
    } else if (key?.lexeme === "surface") {
      const surface = parseSpatialSurface(parser, node);
      if (surface) node.layer.surfaces.push(surface);
    } else if (key?.lexeme === "seams") {
      parseSpatialSeams(parser, node);
    } else {
      note(node, parser, key ? `Unknown spatialLayer item ${key.lexeme}.` : "Expected camera, surface or seams.");
      skipSpatialBlock(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  if (!node.hasCamera && node.errors.length === 0) note(node, parser, "spatialLayer needs a camera block with a projection.");
  return node;
}

/** Skip to the end of an unrecognised `{ … }` item (or a plain property). */
function skipSpatialBlock(parser: Parser): void {
  let depth = 0;
  while (!done(parser)) {
    if (at(parser, "lbrace")) depth += 1;
    else if (at(parser, "rbrace")) {
      if (depth === 0) return;
      depth -= 1;
      if (depth === 0) {
        parser.index += 1;
        return;
      }
    } else if (at(parser, "semicolon") && depth === 0) return;
    parser.index += 1;
  }
}

function parseSpatialCamera(parser: Parser, node: SpatialLayerAst): void {
  if (!eat(parser, "lbrace")) {
    note(node, parser, "camera needs a { … } block.");
    return;
  }
  const camera = node.layer.camera;
  let projection = false;
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected a camera property.");
      skipProperty(parser);
    } else if (key.lexeme === "projection") {
      const mode = eatWord(parser);
      if (mode?.lexeme === "perspective" || mode?.lexeme === "orthographic") {
        camera.projection = mode.lexeme;
        projection = true;
      } else note(node, parser, "projection needs perspective or orthographic.");
    } else if (key.lexeme === "position") {
      const value = parseVec3(parser);
      if (value) camera.position = value;
      else note(node, parser, "position needs (x, y, z).");
    } else if (key.lexeme === "yaw" || key.lexeme === "pitch" || key.lexeme === "roll") {
      const value = parseAngle(parser);
      if (value === undefined) note(node, parser, `${key.lexeme} needs an angle.`);
      else camera[key.lexeme] = value;
    } else if (key.lexeme === "focalLength" || key.lexeme === "zoom" || key.lexeme === "near") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, `${key.lexeme} needs a number.`);
      else camera[key.lexeme] = value;
    } else {
      note(node, parser, `Unknown camera property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  if (projection) node.hasCamera = true;
  else note(node, parser, "camera needs a projection (perspective or orthographic).");
}

/**
 * `seams { split true|false; epsilon n; maxFragments n; edge <a> <b>; };`
 * (MotionScript 0.15 / space.planarSeams). Body words match by spelling.
 */
function parseSpatialSeams(parser: Parser, node: SpatialLayerAst): void {
  if (node.layer.seams) note(node, parser, "A spatialLayer has at most one seams block.");
  if (!eat(parser, "lbrace")) {
    note(node, parser, "seams needs a { … } block.");
    return;
  }
  const seams: NonNullable<SpatialLayerAst["layer"]["seams"]> = {};
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected a seams property.");
      skipProperty(parser);
    } else if (key.lexeme === "split") {
      if (eat(parser, "keyword", "true")) seams.split = true;
      else if (eat(parser, "keyword", "false")) seams.split = false;
      else note(node, parser, "split needs true or false.");
    } else if (key.lexeme === "epsilon" || key.lexeme === "maxFragments") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, `${key.lexeme} needs a number.`);
      else if (key.lexeme === "epsilon") seams.edgeEpsilon = value;
      else seams.maxFragments = value;
    } else if (key.lexeme === "edge") {
      const a = parseDotted(parser, false);
      const b = a ? parseDotted(parser, false) : undefined;
      if (a && b) (seams.edges ??= []).push({ a, b });
      else note(node, parser, "edge needs two surface node ids.");
    } else {
      note(node, parser, `Unknown seams property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  node.layer.seams = seams;
}

function parseSpatialSurface(parser: Parser, node: SpatialLayerAst): SpatialSurfaceDefinition | undefined {
  const nodeId = parseDotted(parser, false);
  if (!nodeId) {
    note(node, parser, "surface needs a node id.");
    skipSpatialBlock(parser);
    return undefined;
  }
  const surface: SpatialSurfaceDefinition = { nodeId };
  if (!eat(parser, "lbrace")) {
    note(node, parser, "surface needs a { … } block.");
    return surface;
  }
  const transform: SpatialTransformDefinition = {};
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected a surface property.");
      skipProperty(parser);
    } else if (key.lexeme === "parent") {
      const parent = parseDotted(parser, false);
      if (parent) surface.parent = parent;
      else note(node, parser, "parent needs a surface node id.");
    } else if (key.lexeme === "position" || key.lexeme === "pivot" || key.lexeme === "rotation" || key.lexeme === "scale") {
      const value = parseVec3(parser);
      if (value) transform[key.lexeme] = value;
      else note(node, parser, `${key.lexeme} needs (x, y, z).`);
    } else if (key.lexeme === "hinge") {
      const from = parseVec(parser);
      const to = parseVec(parser);
      const angle = from && to ? parseAngle(parser) : undefined;
      if (from && to && angle !== undefined) transform.hinge = { from, to, angle };
      else note(node, parser, "hinge needs (x, y) (x, y) angle.");
    } else if (key.lexeme === "backface") {
      const mode = eatWord(parser);
      if (mode?.lexeme === "visible" || mode?.lexeme === "hidden") surface.backface = mode.lexeme;
      else note(node, parser, "backface needs visible or hidden.");
    } else if (key.lexeme === "backFill") {
      const color = eat(parser, "color");
      if (color?.colorValue) surface.backFill = color.colorValue;
      else note(node, parser, "backFill needs a colour.");
    } else {
      note(node, parser, `Unknown surface property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  if (Object.keys(transform).length > 0) surface.transform = transform;
  return surface;
}

/**
 * `physics <id> { mode …; body …; joint …; constraint …; };` Only `physics`
 * is reserved; mode/body/joint/constraint and body words match by spelling.
 */
function parsePhysics(parser: Parser): PhysicsAst {
  const start = eat(parser, "keyword", "physics");
  const node: PhysicsAst = {
    kind: "physics",
    world: { id: "", mode: "dynamic", bodies: [] },
    hasMode: false,
    span: start?.span ?? emptySpan(),
    errors: [],
  };
  const id = eat(parser, "identifier");
  if (id) node.world.id = id.lexeme;
  else note(node, parser, "physics needs an id.");
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected a physics item.");
      skipSpatialBlock(parser);
    } else if (key.lexeme === "mode") {
      const mode = eatWord(parser);
      if (mode?.lexeme === "dynamic" || mode?.lexeme === "authored") {
        node.world.mode = mode.lexeme;
        node.hasMode = true;
      } else note(node, parser, "mode needs dynamic or authored.");
    } else if (key.lexeme === "gravity") {
      const value = parseVec(parser);
      if (value) node.world.gravity = value;
      else note(node, parser, "gravity needs (x, y).");
    } else if (
      key.lexeme === "fixedDtMs" ||
      key.lexeme === "seed" ||
      key.lexeme === "maxBodies" ||
      key.lexeme === "maxJoints" ||
      key.lexeme === "maxContactsPerStep" ||
      key.lexeme === "maxSolverIterations" ||
      key.lexeme === "maxStepsPerAdvance"
    ) {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, `${key.lexeme} needs a number.`);
      else node.world[key.lexeme] = value;
    } else if (key.lexeme === "body") {
      const body = parsePhysicsBody(parser, node);
      if (body) node.world.bodies.push(body);
    } else if (key.lexeme === "joint") {
      const joint = parsePhysicsJoint(parser, node);
      if (joint) {
        node.world.joints ??= [];
        node.world.joints.push(joint);
      }
    } else if (key.lexeme === "constraint") {
      const constraint = parsePhysicsConstraint(parser, node);
      if (constraint) {
        node.world.constraints ??= [];
        node.world.constraints.push(constraint);
      }
    } else {
      note(node, parser, `Unknown physics item ${key.lexeme}.`);
      skipSpatialBlock(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  expectSemi(parser);
  if (!node.hasMode && node.errors.length === 0) note(node, parser, "physics needs mode dynamic or authored.");
  return node;
}

function parsePhysicsBody(parser: Parser, node: PhysicsAst): PhysicsBodyDefinition | undefined {
  const id = eat(parser, "identifier");
  if (!id) {
    note(node, parser, "body needs an id.");
    skipSpatialBlock(parser);
    return undefined;
  }
  const body: PhysicsBodyDefinition = {
    id: id.lexeme,
    kind: "dynamic",
    x: 0,
    y: 0,
    angle: 0,
    collider: { kind: "circle", radius: 10 },
  };
  let hasCollider = false;
  let hasKind = false;
  if (!eat(parser, "lbrace")) {
    note(node, parser, "body needs a { … } block.");
    return body;
  }
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected a body property.");
      skipProperty(parser);
    } else if (key.lexeme === "entity") {
      const entityId = parseDotted(parser, false);
      if (entityId) body.entityId = entityId;
      else note(node, parser, "entity needs a node id.");
    } else if (key.lexeme === "kind") {
      const kind = eatWord(parser);
      if (kind?.lexeme === "static" || kind?.lexeme === "kinematic" || kind?.lexeme === "dynamic") {
        body.kind = kind.lexeme;
        hasKind = true;
      } else note(node, parser, "kind needs static, kinematic or dynamic.");
    } else if (key.lexeme === "position") {
      const value = parseVec(parser);
      if (value) {
        body.x = value.x;
        body.y = value.y;
      } else note(node, parser, "position needs (x, y).");
    } else if (key.lexeme === "angle") {
      const value = parseAngle(parser);
      if (value === undefined) note(node, parser, "angle needs an angle.");
      else body.angle = value;
    } else if (key.lexeme === "velocity") {
      const value = parseVec(parser);
      if (value) {
        body.vx = value.x;
        body.vy = value.y;
      } else note(node, parser, "velocity needs (x, y).");
    } else if (key.lexeme === "omega" || key.lexeme === "mass" || key.lexeme === "restitution" || key.lexeme === "friction") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, `${key.lexeme} needs a number.`);
      else body[key.lexeme] = value;
    } else if (key.lexeme === "collider") {
      const collider = parseCollider(parser, node);
      if (collider) {
        body.collider = collider;
        hasCollider = true;
      }
    } else if (key.lexeme === "surface") {
      const surfaceId = parseDotted(parser, false);
      if (surfaceId) body.surfaceId = surfaceId;
      else note(node, parser, "surface needs a surface id.");
    } else {
      note(node, parser, `Unknown body property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  if (!hasKind) note(node, parser, `body ${body.id} needs kind static, kinematic or dynamic.`);
  if (!hasCollider) note(node, parser, `body ${body.id} needs a collider.`);
  return body;
}

function parseCollider(parser: Parser, node: PhysicsAst): PhysicsColliderDefinition | undefined {
  const kind = eatWord(parser);
  if (kind?.lexeme === "circle") {
    const radius = parseSignedNumber(parser);
    if (radius === undefined) {
      note(node, parser, "circle collider needs a radius.");
      return undefined;
    }
    return { kind: "circle", radius };
  }
  if (kind?.lexeme === "aabb") {
    const halfWidth = parseSignedNumber(parser);
    const halfHeight = parseSignedNumber(parser);
    if (halfWidth === undefined || halfHeight === undefined) {
      note(node, parser, "aabb collider needs halfWidth halfHeight.");
      return undefined;
    }
    return { kind: "aabb", halfWidth, halfHeight };
  }
  note(node, parser, "collider needs circle <r> or aabb <hx> <hy>.");
  return undefined;
}

function parsePhysicsJoint(parser: Parser, node: PhysicsAst): PhysicsJointDefinition | undefined {
  const id = eat(parser, "identifier");
  if (!id) {
    note(node, parser, "joint needs an id.");
    skipSpatialBlock(parser);
    return undefined;
  }
  const joint: PhysicsJointDefinition = { id: id.lexeme, bodyA: "", bodyB: "", restLength: 0 };
  let hasA = false;
  let hasB = false;
  let hasRest = false;
  if (!eat(parser, "lbrace")) {
    note(node, parser, "joint needs a { … } block.");
    return joint;
  }
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected a joint property.");
      skipProperty(parser);
    } else if (key.lexeme === "a" || key.lexeme === "b") {
      const body = eat(parser, "identifier");
      if (!body) note(node, parser, `${key.lexeme} needs a body id.`);
      else if (key.lexeme === "a") {
        joint.bodyA = body.lexeme;
        hasA = true;
      } else {
        joint.bodyB = body.lexeme;
        hasB = true;
      }
    } else if (key.lexeme === "restLength") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, "restLength needs a number.");
      else {
        joint.restLength = value;
        hasRest = true;
      }
    } else if (key.lexeme === "anchorA" || key.lexeme === "anchorB") {
      const value = parseVec(parser);
      if (value) joint[key.lexeme] = value;
      else note(node, parser, `${key.lexeme} needs (x, y).`);
    } else if (key.lexeme === "compliance") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, "compliance needs a number.");
      else joint.compliance = value;
    } else {
      note(node, parser, `Unknown joint property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  if (!hasA || !hasB) note(node, parser, `joint ${joint.id} needs a and b body ids.`);
  if (!hasRest) note(node, parser, `joint ${joint.id} needs restLength.`);
  return joint;
}

function parsePhysicsConstraint(parser: Parser, node: PhysicsAst): PhysicsConstraintDefinition | undefined {
  const id = eat(parser, "identifier");
  if (!id) {
    note(node, parser, "constraint needs an id.");
    skipSpatialBlock(parser);
    return undefined;
  }
  const constraint: PhysicsConstraintDefinition = { id: id.lexeme, a: "", b: "", restLength: 0 };
  let hasA = false;
  let hasB = false;
  let hasRest = false;
  if (!eat(parser, "lbrace")) {
    note(node, parser, "constraint needs a { … } block.");
    return constraint;
  }
  while (!done(parser) && !at(parser, "rbrace")) {
    const key = eatWord(parser);
    if (!key) {
      note(node, parser, "Expected a constraint property.");
      skipProperty(parser);
    } else if (key.lexeme === "a" || key.lexeme === "b") {
      const point = parseDotted(parser, false);
      if (!point) note(node, parser, `${key.lexeme} needs a point id.`);
      else if (key.lexeme === "a") {
        constraint.a = point;
        hasA = true;
      } else {
        constraint.b = point;
        hasB = true;
      }
    } else if (key.lexeme === "restLength") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, "restLength needs a number.");
      else {
        constraint.restLength = value;
        hasRest = true;
      }
    } else if (key.lexeme === "stiffness") {
      const value = parseSignedNumber(parser);
      if (value === undefined) note(node, parser, "stiffness needs a number.");
      else constraint.stiffness = value;
    } else {
      note(node, parser, `Unknown constraint property ${key.lexeme}.`);
      skipProperty(parser);
    }
    expectSemi(parser);
  }
  eat(parser, "rbrace");
  if (!hasA || !hasB) note(node, parser, `constraint ${constraint.id} needs a and b.`);
  if (!hasRest) note(node, parser, `constraint ${constraint.id} needs restLength.`);
  return constraint;
}

function parseEasing(parser: Parser): EaseAst | undefined {
  const token = eat(parser, "keyword");
  if (!token) return undefined;
  if (EASING.has(token.lexeme)) return token.lexeme as EaseAst;
  if (token.lexeme === "hold") return { type: "hold" };
  if (token.lexeme !== "cubic") return undefined;
  if (!eat(parser, "lparen")) return undefined;
  const x1 = parseSignedNumber(parser);
  if (!eat(parser, "comma")) return undefined;
  const y1 = parseSignedNumber(parser);
  if (!eat(parser, "comma")) return undefined;
  const x2 = parseSignedNumber(parser);
  if (!eat(parser, "comma")) return undefined;
  const y2 = parseSignedNumber(parser);
  if (!eat(parser, "rparen")) return undefined;
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return undefined;
  return { type: "cubic", x1, y1, x2, y2 };
}

function parseVec(parser: Parser): Vec | undefined {
  if (!eat(parser, "lparen")) return undefined;
  const vec = parseVecBody(parser);
  if (!eat(parser, "rparen")) fail(parser, "Expected ')'.");
  return vec;
}

/** Spatial tangents may include an optional Z: `(x, y)` or `(x, y, z)`. */
function parseSpatialVec(parser: Parser): Vec | undefined {
  if (!eat(parser, "lparen")) return undefined;
  const x = parseSignedNumber(parser);
  if (!eat(parser, "comma")) return undefined;
  const y = parseSignedNumber(parser);
  if (x === undefined || y === undefined) {
    fail(parser, "Expected ')'.");
    return undefined;
  }
  let z: number | undefined;
  if (eat(parser, "comma")) {
    z = parseSignedNumber(parser);
    if (z === undefined) {
      fail(parser, "spatial Z needs a number.");
      return undefined;
    }
  }
  if (!eat(parser, "rparen")) fail(parser, "Expected ')'.");
  return z === undefined || Math.abs(z) < 1e-12 ? { x, y } : { x, y, z };
}

function parseVecBody(parser: Parser): Vec | undefined {
  const x = parseSignedNumber(parser);
  if (!eat(parser, "comma")) return undefined;
  const y = parseSignedNumber(parser);
  if (x === undefined || y === undefined) return undefined;
  return { x, y };
}

function parseAngle(parser: Parser): number | undefined {
  let sign = 1;
  if (eat(parser, "plus")) sign = 1;
  else if (eat(parser, "minus")) sign = -1;
  const angle = eat(parser, "angle");
  if (angle?.numberValue !== undefined) return sign * angle.numberValue;
  const number = eat(parser, "number");
  if (number?.numberValue !== undefined) return sign * number.numberValue;
  return undefined;
}

function parseSignedNumber(parser: Parser): number | undefined {
  let sign = 1;
  if (eat(parser, "plus")) sign = 1;
  else if (eat(parser, "minus")) sign = -1;
  const number = eat(parser, "number");
  if (number?.numberValue === undefined) return undefined;
  return sign * number.numberValue;
}

function parseSignedInteger(parser: Parser): number | undefined {
  const value = parseSignedNumber(parser);
  if (value === undefined) return undefined;
  if (!Number.isInteger(value)) {
    fail(parser, "Expected an integer.");
    return undefined;
  }
  return value;
}

function parseBoolean(parser: Parser): boolean | undefined {
  if (eat(parser, "keyword", "true")) return true;
  if (eat(parser, "keyword", "false")) return false;
  return undefined;
}

function isNodeStart(parser: Parser): boolean {
  const token = peek(parser);
  return token?.type === "keyword" && NODE_SHAPES.has(token.lexeme);
}

function isPathCommand(parser: Parser): boolean {
  const token = peek(parser);
  return (
    token?.type === "keyword" &&
    (token.lexeme === "move" || token.lexeme === "line" || token.lexeme === "quadratic" || token.lexeme === "cubic" || token.lexeme === "close")
  );
}

function expectSemi(parser: Parser): void {
  if (!eat(parser, "semicolon")) fail(parser, "Expected ';'.");
}

function skipProperty(parser: Parser): void {
  while (!done(parser) && !at(parser, "semicolon") && !at(parser, "rbrace")) parser.index += 1;
}

function skipUnit(parser: Parser): void {
  let depth = 0;
  while (!done(parser)) {
    if (at(parser, "lbrace")) depth += 1;
    if (at(parser, "rbrace") && depth > 0) depth -= 1;
    const semi = at(parser, "semicolon");
    parser.index += 1;
    if (semi && depth === 0) return;
  }
}

function at(parser: Parser, type: Token["type"], lexeme?: string): boolean {
  const token = peek(parser);
  if (!token || token.type !== type) return false;
  return lexeme === undefined || token.lexeme === lexeme;
}

function eat(parser: Parser, type: Token["type"], lexeme?: string): Token | undefined {
  if (!at(parser, type, lexeme)) return undefined;
  const token = parser.tokens[parser.index];
  parser.index += 1;
  return token;
}

function peek(parser: Parser): Token | undefined {
  return parser.tokens[parser.index];
}

function prev(parser: Parser): Token | undefined {
  return parser.tokens[parser.index - 1];
}

function done(parser: Parser): boolean {
  return parser.index >= parser.tokens.length;
}

function fail(parser: Parser, message: string): void {
  parser.diagnostics.push(syntax(message, peek(parser)?.span ?? prev(parser)?.span));
}

function note(node: { errors: Diagnostic[] }, parser: Parser, message: string): void {
  const item = syntax(message, peek(parser)?.span ?? prev(parser)?.span);
  node.errors.push(item);
  parser.diagnostics.push(item);
}

function noteLoose(parser: Parser, message: string): void {
  parser.diagnostics.push(syntax(message, peek(parser)?.span));
}

function syntax(message: string, sourceSpan: SourceSpan | undefined): Diagnostic {
  return diagnostic({
    code: "INVALID_TYPE",
    phase: "parse",
    category: "syntax",
    effect: "UNIT_REJECTED",
    message,
    sourceSpan,
  });
}

function emptySpan(): SourceSpan {
  const point = { offset: 0, line: 1, column: 1 };
  return { start: point, end: point };
}
