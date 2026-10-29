import { Telemetry, DEFAULT_LIMITS, createIncrementalLexer, diagnostic, type Diagnostic, type Token } from "@gvr/schema";
import type { UnitAst } from "./ast";
import { drainDeltas, finishSession, openSession, pushUnit, type CompileResult, type Session } from "./compile";
import { parseLeadingSlice } from "./parse";

export type FragmentKind = "characters" | "lines" | "blocks" | "packets" | "random";

/** Split source without using `;` or `};` as a boundary. */
export function fragmentSource(source: string, kind: FragmentKind, seed = 1): string[] {
  if (source.length === 0) return [];
  if (kind === "characters") return [...source];
  if (kind === "lines") return source.split(/(?<=\n)/);
  if (kind === "blocks") {
    const parts = source.split(/\n\n/);
    return parts.map((part, index) => (index < parts.length - 1 ? `${part}\n\n` : part)).filter((part) => part.length > 0);
  }
  if (kind === "packets") {
    const size = 24;
    const chunks: string[] = [];
    for (let index = 0; index < source.length; index += size) chunks.push(source.slice(index, index + size));
    return chunks;
  }
  const chunks: string[] = [];
  let random = seed >>> 0;
  let index = 0;
  while (index < source.length) {
    random = (random * 1664525 + 1013904223) >>> 0;
    const size = (random % 17) + 1;
    chunks.push(source.slice(index, index + size));
    index += size;
  }
  return chunks;
}

export function compileIncrementally(chunks: readonly string[]): CompileResult {
  const program = createIncrementalProgram();
  for (const chunk of chunks) program.push(chunk);
  return program.finish();
}

export class IncrementalProgram {
  private lexer = createIncrementalLexer();
  private readonly buffer: Token[] = [];
  private session?: Session;
  private carried: Diagnostic[] = [];
  private result?: CompileResult;
  private stopped = false;
  private sourceBytes = 0;
  private endsInHighSurrogate = false;
  private closed = false;

  constructor(private readonly telemetry?: Telemetry) {}

  dispose(): void {
    this.stopped = true;
    this.buffer.length = 0;
    this.lexer = createIncrementalLexer();
    this.session = undefined;
    this.carried = [];
    this.result = undefined;
    this.telemetry?.gauge('compile.buffered_tokens', 0);
    this.telemetry?.gauge('compile.buffered_lexeme_bytes', 0);
    this.telemetry?.gauge('compile.lexer_pending_bytes', 0);
    this.telemetry?.gauge('compile.lexer_retained_tokens', 0);
    this.telemetry?.gauge('compile.deferred_units', 0);
    this.telemetry?.gauge('compile.pending_deltas', 0);
  }

  get sealedThroughMs(): number {
    return this.session?.sealedThroughMs ?? 0;
  }

  get revision(): number {
    return this.session?.revision ?? 0;
  }

  get parsedUnits(): number {
    return this.session?.parsedUnits ?? 0;
  }

  get completed(): boolean {
    return this.session?.authoringComplete ?? false;
  }

  get diagnostics(): readonly Diagnostic[] {
    return this.session?.diagnostics ?? this.carried;
  }

  get scene() {
    return this.result?.scene ?? this.session?.scene;
  }

  push(chunk: string): void {
    if (this.stopped || chunk.length === 0) return;
    const first = chunk.charCodeAt(0);
    const bytes = new TextEncoder().encode(chunk).byteLength - (this.endsInHighSurrogate && first >= 0xdc00 && first <= 0xdfff ? 2 : 0);
    const last = chunk.charCodeAt(chunk.length - 1);
    this.endsInHighSurrogate = last >= 0xd800 && last <= 0xdbff;
    this.sourceBytes += bytes;
    this.telemetry?.count('compile.source_bytes', bytes);
    if (this.sourceBytes > DEFAULT_LIMITS.maxSourceBytes) {
      this.carried.push(diagnostic({code:'RESOURCE_LIMIT',phase:'compile',category:'resource',effect:'PROGRAM_FATAL',message:`Source exceeds ${DEFAULT_LIMITS.maxSourceBytes} bytes.`}));
      this.stopped = true;
      this.buffer.length = 0;
      this.lexer = createIncrementalLexer();
      return;
    }
    const tokens = this.telemetry ? this.telemetry.measure('compile.lex_ms', () => this.lexer.push(chunk)) : this.lexer.push(chunk);
    for (const token of tokens) this.buffer.push(token);
    this.telemetry?.gauge('compile.buffered_tokens', this.buffer.length);
    this.drain();
    this.telemetry?.gauge('compile.lexer_pending_bytes', this.lexer.pendingBytes);
    this.telemetry?.gauge('compile.lexer_retained_tokens', this.lexer.retainedTokenCount);
  }

  drainDeltas() {
    return this.session ? drainDeltas(this.session) : [];
  }

  finish(): CompileResult {
    const tail = this.lexer.finish();
    for (const token of tail.tokens) this.buffer.push(token);
    this.carried.push(...tail.diagnostics);
    this.drain();
    if (this.buffer.length > 0) {
      this.carried.push(
        diagnostic({
          code: "UNTERMINATED_STRING",
          phase: "parse",
          category: "syntax",
          effect: "PROGRAM_FATAL",
          message: "The stream ended inside an unfinished declaration.",
        }),
      );
      this.buffer.length = 0;
    }
    if (!this.session) {
      this.stopped = true;
      this.result = {
        ok: false,
        diagnostics: this.carried,
        sealedThroughMs: 0,
        completed: false,
        deltas: [],
      };
      return this.result;
    }
    if (this.carried.length > 0) {
      this.session.diagnostics.push(...this.carried);
      this.carried = [];
    }
    if (!this.closed) this.result = finishSession(this.session, false);
    this.stopped = true;
    return this.sync(this.result ?? finishSession(this.session, false));
  }

  private drain(): void {
    if (!this.session?.authoringComplete) {
      let slice = takeUnit(this.buffer);
      while (slice && !this.stopped && !this.session?.authoringComplete) {
        this.accept(slice);
        slice = takeUnit(this.buffer);
      }
    }
    if (this.session?.authoringComplete && this.buffer.length > 0) {
      this.carried.push(
        diagnostic({
          code: "INVALID_TYPE",
          phase: "parse",
          category: "syntax",
          effect: "UNIT_REJECTED",
          message: "Tokens follow complete;.",
          sourceSpan: this.buffer[0]?.span,
        }),
      );
      this.buffer.length = 0;
      if (this.result) this.result = { ...this.result, ok: false };
    }
    this.telemetry?.gauge("compile.buffered_tokens", this.buffer.length);
    this.telemetry?.gauge("compile.buffered_lexeme_bytes", this.buffer.reduce((sum, token) => sum + new TextEncoder().encode(token.lexeme).byteLength, 0));
    const buffered = this.buffer.reduce((sum, token) => sum + token.lexeme.length, 0);
    if (buffered > DEFAULT_LIMITS.maxBufferedUnitBytes) {
      this.carried.push(
        diagnostic({
          code: "RESOURCE_LIMIT",
          phase: "parse",
          category: "resource",
          effect: "PROGRAM_FATAL",
          message: "A buffered declaration exceeds the unit size budget.",
        }),
      );
      this.buffer.length = 0;
      this.stopped = true;
    }
  }

  private accept(tokens: Token[]): void {
    const parsed = this.telemetry ? this.telemetry.measure('compile.parse_ms', () => parseLeadingSlice(tokens)) : parseLeadingSlice(tokens);
    if (parsed.kind === "invalid") {
      this.carried.push(...parsed.diagnostics);
      if (!this.session) {
        this.stopped = true;
        this.buffer.length = 0;
      }
      return;
    }
    if (parsed.kind === "header") {
      if (this.session) {
        this.carried.push(problemSpan("A scene header cannot be repeated."));
        return;
      }
      this.session = openSession(parsed.header, this.carried, this.telemetry);
      this.carried = [];
      return;
    }
    if (!this.session) {
      this.carried.push(problemSpan("A declaration needs a scene header."));
      this.stopped = true;
      return;
    }
    if (parsed.kind === "complete") {
      this.session.diagnostics.push(...this.carried);
      this.carried = [];
      this.closed = true;
      this.result = finishSession(this.session, true, parsed.span);
      return;
    }
    pushUnit(this.session, parsed.unit);
  }

  private sync(result: CompileResult): CompileResult {
    if (!this.session) return result;
    const diagnostics = [...this.session.diagnostics, ...this.carried];
    return {
      ...result,
      scene: this.session.scene,
      diagnostics,
      sealedThroughMs: this.session.sealedThroughMs,
      completed: this.session.authoringComplete,
      ok: diagnostics.length === 0 && this.session.authoringComplete,
      deltas: this.session.deltas,
    };
  }
}

export function createIncrementalProgram(telemetry?: Telemetry): IncrementalProgram {
  return new IncrementalProgram(telemetry);
}

function takeUnit(tokens: Token[]): Token[] | undefined {
  let brace = 0;
  let paren = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) break;
    if (token.type === "lbrace") brace += 1;
    else if (token.type === "rbrace") brace = Math.max(0, brace - 1);
    else if (token.type === "lparen") paren += 1;
    else if (token.type === "rparen") paren = Math.max(0, paren - 1);
    else if (token.type === "semicolon" && brace === 0 && paren === 0) return tokens.splice(0, index + 1);
  }
  return undefined;
}

function problemSpan(message: string): Diagnostic {
  return diagnostic({
    code: "MISSING_REQUIRED",
    phase: "parse",
    category: "syntax",
    effect: "UNIT_REJECTED",
    message,
  });
}

export type { UnitAst };
