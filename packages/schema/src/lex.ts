import { diagnostic, type Diagnostic, type SourceSpan } from "./diagnostics";
import { KEYWORD_SET } from "./grammar";
import type { SolidColor } from "./types";

export type TokenType =
  | "keyword"
  | "identifier"
  | "number"
  | "duration"
  | "angle"
  | "percentage"
  | "string"
  | "color"
  | "lparen"
  | "rparen"
  | "lbrace"
  | "rbrace"
  | "comma"
  | "semicolon"
  | "dot"
  | "eq"
  | "plus"
  | "minus";

export interface Token {
  type: TokenType;
  lexeme: string;
  span: SourceSpan;
  /** Finite number for number, duration (ms), angle (radians), and percentage (0..1 scale). */
  numberValue?: number;
  stringValue?: string;
  colorValue?: SolidColor;
}

export interface LexResult {
  tokens: Token[];
  diagnostics: Diagnostic[];
}

interface Cursor {
  source: string;
  index: number;
  line: number;
  column: number;
  /** Absolute offset of source[0]. Incremental fragments add this to spans. */
  base: number;
  /** When true, a token that the next fragment could extend is not consumed. */
  hold: boolean;
}

interface Mark {
  index: number;
  line: number;
  column: number;
}

export function lex(source: string): LexResult {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const cursor: Cursor = { source: text, index: 0, line: 1, column: 1, base: 0, hold: false };
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  consume(cursor, tokens, diagnostics);
  return { tokens, diagnostics };
}

/**
 * Lexer that keeps incomplete strings, comments, numbers and colours
 * across pushed fragments. finish() scans whatever remains.
 */
export class IncrementalLexer {
  private pending = "";
  private base = 0;
  private line = 1;
  private column = 1;
  private readonly tokens: Token[] = [];
  private readonly diagnostics: Diagnostic[] = [];
  private reportedDiagnostics = 0;
  private stripBom = true;

  push(chunk: string): Token[] {
    if (chunk.length === 0) return [];
    if (this.stripBom) {
      this.stripBom = false;
      if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
    }
    this.pending += chunk;
    return this.pull(true);
  }

  finish(): LexResult {
    const tokens = this.pull(false);
    const diagnostics = this.diagnostics.slice(this.reportedDiagnostics);
    this.reportedDiagnostics = this.diagnostics.length;
    return { tokens, diagnostics };
  }

  private pull(hold: boolean): Token[] {
    const from = this.tokens.length;
    const cursor: Cursor = {
      source: this.pending,
      index: 0,
      line: this.line,
      column: this.column,
      base: this.base,
      hold,
    };
    consume(cursor, this.tokens, this.diagnostics);
    this.base += cursor.index;
    this.pending = this.pending.slice(cursor.index);
    this.line = cursor.line;
    this.column = cursor.column;
    return this.tokens.slice(from);
  }
}

export function createIncrementalLexer(): IncrementalLexer {
  return new IncrementalLexer();
}

function consume(cursor: Cursor, tokens: Token[], diagnostics: Diagnostic[]): void {
  while (cursor.index < cursor.source.length) {
    const mark = snapshot(cursor);
    const ch = peek(cursor);
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (cursor.hold && ch === "\r" && cursor.index + 1 >= cursor.source.length) return;
      skipWhitespace(cursor);
      continue;
    }
    if (ch === "/" && peekAt(cursor, 1) === "/") {
      if (cursor.hold && !commentClosed(cursor)) return;
      skipLineComment(cursor);
      continue;
    }
    if (ch === "/" && cursor.hold && peekAt(cursor, 1) === "") return;
    if (ch === "#" && cursor.hold && !colorClosed(cursor.source, cursor.index)) return;
    if (isDigit(ch) && cursor.hold && !numberClosed(cursor.source, cursor.index)) return;
    if (isIdentStart(ch) && cursor.hold && !identifierClosed(cursor.source, cursor.index)) return;
    const start = point(cursor);
    if (ch === '"') {
      const token = scanString(cursor, start, diagnostics);
      if (token === "hold") {
        restore(cursor, mark);
        return;
      }
      if (token) tokens.push(token);
      continue;
    }
    if (ch === "#") {
      const token = scanColor(cursor, start, diagnostics);
      if (token) tokens.push(token);
      continue;
    }
    if (isDigit(ch)) {
      tokens.push(scanNumber(cursor, start, diagnostics));
      continue;
    }
    if (isIdentStart(ch)) {
      tokens.push(scanIdentifier(cursor, start));
      continue;
    }
    const punct = PUNCT[ch];
    if (punct) {
      advance(cursor);
      tokens.push({ type: punct, lexeme: ch, span: span(start, point(cursor)) });
      continue;
    }
    advance(cursor);
    diagnostics.push(
      diagnostic({
        code: "UNKNOWN_CHARACTER",
        phase: "lex",
        category: "syntax",
        message: `Unexpected character ${JSON.stringify(ch)}.`,
        sourceSpan: span(start, point(cursor)),
      }),
    );
  }
}

const PUNCT: Record<string, TokenType> = {
  "(": "lparen",
  ")": "rparen",
  "{": "lbrace",
  "}": "rbrace",
  ",": "comma",
  ";": "semicolon",
  ".": "dot",
  "=": "eq",
  "+": "plus",
  "-": "minus",
};

function scanIdentifier(cursor: Cursor, start: ReturnType<typeof point>): Token {
  let lexeme = "";
  while (cursor.index < cursor.source.length && isIdentPart(peek(cursor))) {
    lexeme += advance(cursor);
  }
  return {
    type: KEYWORD_SET.has(lexeme) ? "keyword" : "identifier",
    lexeme,
    span: span(start, point(cursor)),
  };
}

function scanNumber(
  cursor: Cursor,
  start: ReturnType<typeof point>,
  diagnostics: Diagnostic[],
): Token {
  let lexeme = "";
  while (isDigit(peek(cursor))) lexeme += advance(cursor);
  if (peek(cursor) === "." && isDigit(peekAt(cursor, 1))) {
    lexeme += advance(cursor);
    while (isDigit(peek(cursor))) lexeme += advance(cursor);
  }
  if (peek(cursor) === "e" || peek(cursor) === "E") {
    const exponentStart = cursor.index;
    const columnStart = cursor.column;
    let exponent = advance(cursor);
    if (peek(cursor) === "+" || peek(cursor) === "-") exponent += advance(cursor);
    if (!isDigit(peek(cursor))) {
      cursor.index = exponentStart;
      cursor.column = columnStart;
    } else {
      lexeme += exponent;
      while (isDigit(peek(cursor))) lexeme += advance(cursor);
    }
  }

  const suffix = matchSuffix(cursor, ["ms", "deg", "rad", "s"]);
  const percent = suffix ? null : matchSuffix(cursor, ["%"]);
  const value = Number(lexeme);
  const end = point(cursor);
  if (!Number.isFinite(value)) {
    diagnostics.push(
      diagnostic({
        code: "NON_FINITE",
        phase: "lex",
        category: "syntax",
        message: `Numeric literal ${lexeme} is not finite.`,
        sourceSpan: span(start, end),
      }),
    );
  }

  if (suffix === "ms") {
    return { type: "duration", lexeme: lexeme + suffix, numberValue: value, span: span(start, end) };
  }
  if (suffix === "s") {
    return {
      type: "duration",
      lexeme: lexeme + suffix,
      numberValue: value * 1000,
      span: span(start, end),
    };
  }
  if (suffix === "deg") {
    return {
      type: "angle",
      lexeme: lexeme + suffix,
      numberValue: (value * Math.PI) / 180,
      span: span(start, end),
    };
  }
  if (suffix === "rad") {
    return { type: "angle", lexeme: lexeme + suffix, numberValue: value, span: span(start, end) };
  }
  if (percent) {
    return {
      type: "percentage",
      lexeme: lexeme + percent,
      numberValue: value / 100,
      span: span(start, end),
    };
  }
  return { type: "number", lexeme, numberValue: value, span: span(start, end) };
}

function matchSuffix(cursor: Cursor, options: readonly string[]): string | null {
  const rest = cursor.source.slice(cursor.index);
  const sorted = [...options].sort((a, b) => b.length - a.length);
  for (const option of sorted) {
    if (!rest.startsWith(option)) continue;
    const after = rest[option.length];
    const word = [...option].every((char) => isIdentPart(char));
    if (word && after !== undefined && isIdentPart(after)) continue;
    for (let i = 0; i < option.length; i += 1) advance(cursor);
    return option;
  }
  return null;
}

function scanColor(
  cursor: Cursor,
  start: ReturnType<typeof point>,
  diagnostics: Diagnostic[],
): Token | undefined {
  advance(cursor);
  let hex = "";
  while (isHex(peek(cursor)) && hex.length < 8) hex += advance(cursor);
  const take = hex.length >= 8 ? 8 : hex.length >= 6 ? 6 : 0;
  if (take === 0) {
    const end = point(cursor);
    diagnostics.push(
      diagnostic({
        code: "BAD_COLOR",
        phase: "lex",
        category: "syntax",
        message: "A colour needs #RRGGBB or #RRGGBBAA. Short forms are not accepted.",
        sourceSpan: span(start, end),
      }),
    );
    return undefined;
  }
  if (take === 6 && hex.length > 6) {
    const extra = hex.length - 6;
    cursor.index -= extra;
    cursor.column -= extra;
    hex = hex.slice(0, 6);
  }
  const body = hex.slice(0, take);
  const r = parseInt(body.slice(0, 2), 16) / 255;
  const g = parseInt(body.slice(2, 4), 16) / 255;
  const b = parseInt(body.slice(4, 6), 16) / 255;
  const a = take === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1;
  return {
    type: "color",
    lexeme: `#${body}`,
    colorValue: { type: "solid", r, g, b, a },
    span: span(start, point(cursor)),
  };
}

function scanString(
  cursor: Cursor,
  start: ReturnType<typeof point>,
  diagnostics: Diagnostic[],
): Token | undefined | "hold" {
  advance(cursor);
  let value = "";
  while (cursor.index < cursor.source.length) {
    const ch = peek(cursor);
    if (ch === "\n" || ch === "\r") {
      diagnostics.push(
        diagnostic({
          code: "UNTERMINATED_STRING",
          phase: "lex",
          category: "syntax",
          message: "A string cannot contain a raw line break.",
          sourceSpan: span(start, point(cursor)),
        }),
      );
      return undefined;
    }
    if (ch === '"') {
      advance(cursor);
      return {
        type: "string",
        lexeme: cursor.source.slice(start.offset - cursor.base, cursor.index),
        stringValue: value,
        span: span(start, point(cursor)),
      };
    }
    if (ch === "\\") {
      const escapeStart = point(cursor);
      advance(cursor);
      const esc = peek(cursor);
      if (esc === "") {
        if (cursor.hold) return "hold";
        break;
      }
      advance(cursor);
      const mapped: Record<string, string> = {
        "\\": "\\",
        '"': '"',
        n: "\n",
        t: "\t",
        r: "\r",
      };
      if (esc === "u") {
        let hex = "";
        for (let i = 0; i < 4; i += 1) {
          const h = peek(cursor);
          if (cursor.hold && h === "") return "hold";
          if (!isHex(h)) {
            diagnostics.push(
              diagnostic({
                code: "BAD_ESCAPE",
                phase: "lex",
                category: "syntax",
                message: "\\u requires exactly four hex digits.",
                sourceSpan: span(escapeStart, point(cursor)),
              }),
            );
            hex = "";
            break;
          }
          hex += advance(cursor);
        }
        if (hex.length === 4) value += String.fromCharCode(parseInt(hex, 16));
        continue;
      }
      const replacement = mapped[esc];
      if (replacement === undefined) {
        diagnostics.push(
          diagnostic({
            code: "BAD_ESCAPE",
            phase: "lex",
            category: "syntax",
            message: `Unknown string escape \\${esc}.`,
            sourceSpan: span(escapeStart, point(cursor)),
          }),
        );
        continue;
      }
      value += replacement;
      continue;
    }
    value += advance(cursor);
  }
  if (cursor.hold) return "hold";
  diagnostics.push(
    diagnostic({
      code: "UNTERMINATED_STRING",
      phase: "lex",
      category: "syntax",
      message: "Unterminated string.",
      sourceSpan: span(start, point(cursor)),
    }),
  );
  return undefined;
}

function skipLineComment(cursor: Cursor): void {
  advance(cursor);
  advance(cursor);
  while (cursor.index < cursor.source.length && peek(cursor) !== "\n" && peek(cursor) !== "\r") {
    advance(cursor);
  }
}

function skipWhitespace(cursor: Cursor): void {
  const ch = advance(cursor);
  if (ch === "\n") {
    cursor.line += 1;
    cursor.column = 1;
    return;
  }
  if (ch === "\r") {
    cursor.line += 1;
    cursor.column = 1;
    if (peek(cursor) === "\n") cursor.index += 1;
  }
}

function point(cursor: Cursor): { offset: number; line: number; column: number } {
  return { offset: cursor.base + cursor.index, line: cursor.line, column: cursor.column };
}

function snapshot(cursor: Cursor): Mark {
  return { index: cursor.index, line: cursor.line, column: cursor.column };
}

function restore(cursor: Cursor, mark: Mark): void {
  cursor.index = mark.index;
  cursor.line = mark.line;
  cursor.column = mark.column;
}

function commentClosed(cursor: Cursor): boolean {
  const rest = cursor.source.slice(cursor.index);
  return rest.includes("\n") || rest.includes("\r");
}

function identifierClosed(source: string, index: number): boolean {
  let cursor = index;
  while (cursor < source.length && isIdentPart(source[cursor] ?? "")) cursor += 1;
  return cursor < source.length;
}

function colorClosed(source: string, index: number): boolean {
  let cursor = index + 1;
  let hex = 0;
  while (cursor < source.length && hex < 8 && isHex(source[cursor] ?? "")) {
    hex += 1;
    cursor += 1;
  }
  if (hex === 8) return true;
  return cursor < source.length;
}

function numberClosed(source: string, index: number): boolean {
  let cursor = index;
  if (!isDigit(source[cursor] ?? "")) return true;
  while (cursor < source.length && isDigit(source[cursor] ?? "")) cursor += 1;
  if (cursor >= source.length) return false;
  if (source[cursor] === ".") {
    if (cursor + 1 >= source.length) return false;
    if (isDigit(source[cursor + 1] ?? "")) {
      cursor += 1;
      while (cursor < source.length && isDigit(source[cursor] ?? "")) cursor += 1;
      if (cursor >= source.length) return false;
    }
  }
  if (source[cursor] === "e" || source[cursor] === "E") {
    if (cursor + 1 >= source.length) return false;
    let exponent = cursor + 1;
    if (source[exponent] === "+" || source[exponent] === "-") {
      if (exponent + 1 >= source.length) return false;
      exponent += 1;
    }
    if (isDigit(source[exponent] ?? "")) {
      while (exponent < source.length && isDigit(source[exponent] ?? "")) exponent += 1;
      if (exponent >= source.length) return false;
      cursor = exponent;
    }
  }
  const rest = source.slice(cursor);
  const suffixes = ["ms", "deg", "rad", "s", "%"].sort((a, b) => b.length - a.length);
  for (const option of suffixes) {
    if (!rest.startsWith(option)) continue;
    const after = rest[option.length];
    const word = option !== "%";
    if (word && after !== undefined && isIdentPart(after)) continue;
    if (word && after === undefined) return false;
    return true;
  }
  for (const option of suffixes) {
    if (option.startsWith(rest) && rest.length < option.length) return false;
  }
  return true;
}

function span(
  start: { offset: number; line: number; column: number },
  end: { offset: number; line: number; column: number },
): SourceSpan {
  return { start, end };
}

function peek(cursor: Cursor): string {
  return cursor.source[cursor.index] ?? "";
}

function peekAt(cursor: Cursor, offset: number): string {
  return cursor.source[cursor.index + offset] ?? "";
}

function advance(cursor: Cursor): string {
  const ch = cursor.source[cursor.index] ?? "";
  cursor.index += 1;
  cursor.column += 1;
  return ch;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isHex(ch: string): boolean {
  return isDigit(ch) || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F");
}

function isIdentStart(ch: string): boolean {
  return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_";
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}
