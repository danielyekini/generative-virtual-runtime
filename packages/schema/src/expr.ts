import { diagnostic, type Diagnostic } from "./diagnostics";
import { towardZeroRemainder } from "./math";
import type { Expr } from "./types";

const CALLS = {
  sin: 1,
  cos: 1,
  abs: 1,
  sqrt: 1,
  min: 2,
  max: 2,
  pow: 2,
  clamp: 3,
  lerp: 3,
} as const;

type Callee = keyof typeof CALLS;

const REFS = new Set(["PI", "t", "local_t", "progress"]);

export interface ExprEnv {
  /** Absolute scene time in seconds. */
  t: number;
  /** Seconds since the track start. Clamped to the track interval by the runtime. */
  localT: number;
  /** Linear track progress in [0, 1] before easing. Expressions see this raw progress. */
  progress: number;
}

export type ExprEval =
  | { ok: true; value: number }
  | { ok: false; reason: "non_finite" | "domain" };

interface Parser {
  source: string;
  index: number;
  diagnostics: Diagnostic[];
}

export function parseExpression(
  source: string,
  constants?: Readonly<Record<string, number>>,
): { ok: true; ast: Expr } | { ok: false; diagnostics: Diagnostic[] } {
  const parser: Parser = { source, index: 0, diagnostics: [] };
  skip(parser);
  if (parser.index >= parser.source.length) {
    parser.diagnostics.push(expressionError("An expression is required."));
    return { ok: false, diagnostics: parser.diagnostics };
  }
  const ast = parseExpr(parser, constants ?? {});
  skip(parser);
  if (parser.index < parser.source.length) {
    parser.diagnostics.push(
      expressionError(`Unexpected input at ${JSON.stringify(parser.source.slice(parser.index, parser.index + 12))}.`),
    );
  }
  if (!ast || parser.diagnostics.length > 0) {
    return { ok: false, diagnostics: parser.diagnostics };
  }
  return { ok: true, ast };
}

export function evaluateExpression(ast: Expr, env: ExprEnv): ExprEval {
  return evalNode(ast, env);
}

export function expressionComplexity(ast: Expr): { depth: number; ops: number } {
  let ops = 0;
  const walk = (node: Expr, depth: number): number => {
    ops += 1;
    switch (node.type) {
      case "number":
      case "ref":
        return depth;
      case "unary":
        return walk(node.argument, depth + 1);
      case "binary":
        return Math.max(walk(node.left, depth + 1), walk(node.right, depth + 1));
      case "call": {
        let max = depth;
        for (const arg of node.args) max = Math.max(max, walk(arg, depth + 1));
        return max;
      }
    }
  };
  const depth = walk(ast, 1);
  return { depth, ops };
}

export function exprsEqual(a: Expr, b: Expr): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function evalNode(node: Expr, env: ExprEnv): ExprEval {
  switch (node.type) {
    case "number":
      return finite(node.value);
    case "ref":
      if (node.name === "PI") return finite(Math.PI);
      if (node.name === "t") return finite(env.t);
      if (node.name === "local_t") return finite(env.localT);
      return finite(env.progress);
    case "unary": {
      const arg = evalNode(node.argument, env);
      if (!arg.ok) return arg;
      return finite(node.op === "-" ? -arg.value : arg.value);
    }
    case "binary": {
      const left = evalNode(node.left, env);
      if (!left.ok) return left;
      const right = evalNode(node.right, env);
      if (!right.ok) return right;
      return evalBinary(node.op, left.value, right.value);
    }
    case "call":
      return evalCall(node.callee, node.args, env);
  }
}

function evalBinary(op: "+" | "-" | "*" | "/" | "%", a: number, b: number): ExprEval {
  if (op === "/" || op === "%") {
    if (b === 0) return { ok: false, reason: "domain" };
  }
  let value: number;
  switch (op) {
    case "+":
      value = a + b;
      break;
    case "-":
      value = a - b;
      break;
    case "*":
      value = a * b;
      break;
    case "/":
      value = a / b;
      break;
    case "%":
      value = towardZeroRemainder(a, b);
      break;
  }
  return finite(value);
}

function evalCall(callee: string, args: Expr[], env: ExprEnv): ExprEval {
  const values: number[] = [];
  for (const arg of args) {
    const result = evalNode(arg, env);
    if (!result.ok) return result;
    values.push(result.value);
  }
  const [x, y, z] = values;
  switch (callee) {
    case "sin":
      return finite(Math.sin(x ?? NaN));
    case "cos":
      return finite(Math.cos(x ?? NaN));
    case "abs":
      return finite(Math.abs(x ?? NaN));
    case "sqrt":
      if ((x ?? 0) < 0) return { ok: false, reason: "domain" };
      return finite(Math.sqrt(x ?? NaN));
    case "min":
      return finite(Math.min(x ?? NaN, y ?? NaN));
    case "max":
      return finite(Math.max(x ?? NaN, y ?? NaN));
    case "pow":
      return finite(Math.pow(x ?? NaN, y ?? NaN));
    case "clamp":
      if ((y ?? 0) > (z ?? 0)) return { ok: false, reason: "domain" };
      return finite(Math.min(Math.max(x ?? NaN, y ?? NaN), z ?? NaN));
    case "lerp":
      return finite((x ?? NaN) + ((y ?? NaN) - (x ?? NaN)) * (z ?? NaN));
    default:
      return { ok: false, reason: "domain" };
  }
}

function finite(value: number): ExprEval {
  if (!Number.isFinite(value)) return { ok: false, reason: "non_finite" };
  return { ok: true, value };
}

function parseExpr(parser: Parser, constants: Readonly<Record<string, number>>): Expr | undefined {
  let left = parseTerm(parser, constants);
  if (!left) return undefined;
  skip(parser);
  while (parser.source[parser.index] === "+" || parser.source[parser.index] === "-") {
    const op = parser.source[parser.index] as "+" | "-";
    parser.index += 1;
    const right = parseTerm(parser, constants);
    if (!right) return undefined;
    left = { type: "binary", op, left, right };
    skip(parser);
  }
  return left;
}

function parseTerm(parser: Parser, constants: Readonly<Record<string, number>>): Expr | undefined {
  let left = parseUnary(parser, constants);
  if (!left) return undefined;
  skip(parser);
  while (
    parser.source[parser.index] === "*" ||
    parser.source[parser.index] === "/" ||
    parser.source[parser.index] === "%"
  ) {
    const op = parser.source[parser.index] as "*" | "/" | "%";
    parser.index += 1;
    const right = parseUnary(parser, constants);
    if (!right) return undefined;
    left = { type: "binary", op, left, right };
    skip(parser);
  }
  return left;
}

function parseUnary(parser: Parser, constants: Readonly<Record<string, number>>): Expr | undefined {
  skip(parser);
  const ch = parser.source[parser.index];
  if (ch === "+" || ch === "-") {
    parser.index += 1;
    const argument = parseUnary(parser, constants);
    if (!argument) return undefined;
    return { type: "unary", op: ch, argument };
  }
  return parsePrimary(parser, constants);
}

function parsePrimary(parser: Parser, constants: Readonly<Record<string, number>>): Expr | undefined {
  skip(parser);
  const ch = parser.source[parser.index];
  if (ch === undefined) {
    parser.diagnostics.push(expressionError("Unexpected end of expression."));
    return undefined;
  }
  if (ch === "(") {
    parser.index += 1;
    const inner = parseExpr(parser, constants);
    skip(parser);
    if (parser.source[parser.index] !== ")") {
      parser.diagnostics.push(expressionError("Expected ')'."));
      return undefined;
    }
    parser.index += 1;
    return inner;
  }
  if (isDigit(ch)) return parseNumber(parser);
  if (isIdentStart(ch)) return parseIdent(parser, constants);
  parser.diagnostics.push(expressionError(`Unexpected ${JSON.stringify(ch)}.`));
  parser.index += 1;
  return undefined;
}

function parseNumber(parser: Parser): Expr | undefined {
  const start = parser.index;
  while (isDigit(parser.source[parser.index] ?? "")) parser.index += 1;
  if (parser.source[parser.index] === "." && isDigit(parser.source[parser.index + 1] ?? "")) {
    parser.index += 1;
    while (isDigit(parser.source[parser.index] ?? "")) parser.index += 1;
  }
  if (parser.source[parser.index] === "e" || parser.source[parser.index] === "E") {
    const mark = parser.index;
    parser.index += 1;
    if (parser.source[parser.index] === "+" || parser.source[parser.index] === "-") parser.index += 1;
    if (!isDigit(parser.source[parser.index] ?? "")) parser.index = mark;
    else while (isDigit(parser.source[parser.index] ?? "")) parser.index += 1;
  }
  const raw = parser.source.slice(start, parser.index);
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    parser.diagnostics.push(expressionError(`Numeric literal ${raw} is not finite.`));
    return undefined;
  }
  return { type: "number", value };
}

function parseIdent(parser: Parser, constants: Readonly<Record<string, number>>): Expr | undefined {
  const start = parser.index;
  parser.index += 1;
  while (isIdentPart(parser.source[parser.index] ?? "")) parser.index += 1;
  const name = parser.source.slice(start, parser.index);
  skip(parser);
  if (parser.source[parser.index] === "(") {
    const arity = name in CALLS ? CALLS[name as Callee] : undefined;
    if (arity === undefined) {
      parser.diagnostics.push(expressionError(`${name} is not a V1 function.`));
      return undefined;
    }
    parser.index += 1;
    const args: Expr[] = [];
    skip(parser);
    if (parser.source[parser.index] !== ")") {
      while (true) {
        const arg = parseExpr(parser, constants);
        if (!arg) return undefined;
        args.push(arg);
        skip(parser);
        if (parser.source[parser.index] === ",") {
          parser.index += 1;
          continue;
        }
        break;
      }
    }
    if (parser.source[parser.index] !== ")") {
      parser.diagnostics.push(expressionError("Expected ')' after call arguments."));
      return undefined;
    }
    parser.index += 1;
    if (args.length !== arity) {
      parser.diagnostics.push(
        expressionError(`${name} expects ${arity} argument${arity === 1 ? "" : "s"}.`),
      );
      return undefined;
    }
    return { type: "call", callee: name as Callee, args };
  }
  if (REFS.has(name)) {
    return { type: "ref", name: name as "PI" | "t" | "local_t" | "progress" };
  }
  if (Object.prototype.hasOwnProperty.call(constants, name)) {
    const value = constants[name];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      parser.diagnostics.push(expressionError(`Constant ${name} is not a finite number.`));
      return undefined;
    }
    return { type: "number", value };
  }
  parser.diagnostics.push(expressionError(`Unknown name ${name}.`));
  return undefined;
}

function expressionError(message: string): Diagnostic {
  return diagnostic({
    code: "INVALID_EXPRESSION",
    phase: "parse",
    category: "syntax",
    message,
  });
}

function skip(parser: Parser): void {
  while (parser.index < parser.source.length) {
    const ch = parser.source[parser.index];
    if (ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r") break;
    parser.index += 1;
  }
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isIdentStart(ch: string): boolean {
  return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_";
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}
