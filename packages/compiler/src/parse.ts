import {
  diagnostic,
  lex,
  type Diagnostic,
  type Paint,
  type PathCommand,
  type SourceSpan,
  type Stroke,
  type Token,
} from "@gvr/schema";
import type {
  AnimLiteral,
  AnimateAst,
  BatchAst,
  CameraAst,
  CompositionAst,
  ConstAst,
  EaseAst,
  HeaderAst,
  InstanceAst,
  KeyframeAst,
  NodeAst,
  OperatorsAst,
  ProgramAst,
  Prop,
  SealAst,
  StepAst,
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
  else note(node, parser, `${shape} needs a name.`);
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
    const key = eat(parser, "keyword");
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
  if (key === "opacity" || key === "radius" || key === "fontSize" || key === "fontWeight" || key === "zIndex") {
    const value = key === "zIndex" ? parseSignedInteger(parser) : parseSignedNumber(parser);
    if (value === undefined) {
      note(node, parser, `${key} needs a number.`);
      skipProperty(parser);
    } else node.props.push({ name: key, value });
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
  if (key === "stroke") {
    const stroke = parseStroke(parser, node);
    if (stroke) node.props.push({ name: "stroke", stroke });
    return;
  }
  if (key === "content" || key === "fontFamily") {
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
  return { color: paint, width, cap, join, miterLimit };
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
    } else if (key.lexeme === "start" || key.lexeme === "duration") {
      const time = eat(parser, "duration");
      if (time?.numberValue === undefined) note(node, parser, `${key.lexeme} needs a time with ms or s.`);
      else if (key.lexeme === "start") node.startMs = time.numberValue;
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
  while (!done(parser) && !at(parser, "rbrace") && !at(parser, "percentage")) {
    const key = eat(parser, "keyword");
    if (!key) break;
    if (key.lexeme === "start" || key.lexeme === "duration") {
      const time = eat(parser, "duration");
      if (time?.numberValue === undefined) note(node, parser, `${key.lexeme} needs a time with ms or s.`);
      else if (key.lexeme === "start") node.startMs = time.numberValue;
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
  while (at(parser, "percentage")) {
    const offset = eat(parser, "percentage");
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
    if (offset?.numberValue === undefined || !value) note(node, parser, "A keyframe needs an offset and a value.");
    else node.frames.push({ offset: offset.numberValue, value, ...(ease ? { ease } : {}), ...(spatial ? { spatial } : {}) });
  }
  if (node.frames.length < 2) note(node, parser, "A keyframe track needs at least two samples.");
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseStep(parser: Parser): StepAst {
  const start = eat(parser, "keyword", "step");
  const node: StepAst = { kind: "step", target: "", timeMs: 0, value: true, span: start?.span ?? emptySpan(), errors: [] };
  node.target = parseTarget(parser) ?? "";
  if (!eat(parser, "lbrace")) note(node, parser, "Expected '{'.");
  if (!eat(parser, "keyword", "at")) note(node, parser, 'A step needs at.');
  const time = eat(parser, "duration");
  if (time?.numberValue === undefined) note(node, parser, "at needs a time with ms or s.");
  else node.timeMs = time.numberValue;
  expectSemi(parser);
  if (!eat(parser, "keyword", "value")) note(node, parser, "A step needs value.");
  const value = parseBoolean(parser);
  if (value === undefined) note(node, parser, "value needs true or false.");
  else node.value = value;
  expectSemi(parser);
  eat(parser, "rbrace");
  expectSemi(parser);
  return node;
}

function parseSeal(parser: Parser): SealAst {
  const start = eat(parser, "keyword", "seal");
  const node: SealAst = { kind: "seal", timeMs: 0, span: start?.span ?? emptySpan(), errors: [] };
  const time = eat(parser, "duration");
  if (time?.numberValue === undefined) note(node, parser, "seal needs a time with ms or s.");
  else node.timeMs = time.numberValue;
  expectSemi(parser);
  return node;
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
    const key = eat(parser, "keyword");
    if (!key) break;
    if (key.lexeme === "parent") {
      const parent = eat(parser, "identifier");
      if (parent) node.parent = parent.lexeme;
      else note(node, parser, "parent needs a scope name.");
    } else if (key.lexeme === "offset") {
      const offset = eat(parser, "duration");
      if (offset?.numberValue === undefined) note(node, parser, "offset needs a time with ms or s.");
      else node.offsetMs = offset.numberValue;
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
