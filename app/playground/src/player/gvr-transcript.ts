/**
 * GVR transcript contract `0.1` (P029).
 *
 * Studio-owned import/playback document. It is not MotionScript or Scene IR.
 * A shared schema package is not required: Product persists and plays this
 * shape inside Studio. Engine coordination stays an inbox request if a later
 * revision needs a package both lanes import.
 *
 * A file is a transcript only when it has a string `gvrTranscript` field.
 * Other JSON (Lottie, fixtures) is left to the existing importers.
 */
import type { ProgramEntry } from "../library";

export const GVR_TRANSCRIPT_VERSION = "0.1" as const;
export const TRANSCRIPTS_KEY = "gvr.studio.transcripts.v1";
export const TRANSCRIPT_COLLECTION = "Transcripts";
export const TRANSCRIPT_PREFIX = "transcript:";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,120}$/;
const MAX_TURNS = 400;

export interface GvrTurnMetrics {
  repairs: number;
  latencyMs: number;
}

export interface GvrTranscriptTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  directorScript?: string;
  motionScript?: string;
  startedAt?: string;
  metrics?: GvrTurnMetrics;
}

export interface GvrTranscript {
  gvrTranscript: typeof GVR_TRANSCRIPT_VERSION;
  id: string;
  title: string;
  createdAt: string;
  approach: "director" | "direct";
  model: string;
  turns: GvrTranscriptTurn[];
}

export type TranscriptParse =
  | { ok: true; transcript: GvrTranscript }
  | { ok: false; reason: "not-transcript" | "invalid"; message: string };

/** Fields Studio already has on a Generate bubble. */
export interface TranscriptSourceMessage {
  id: string;
  role: "user" | "model";
  text: string;
  source?: string;
  directorRaw?: string | null;
  pending?: boolean;
  startedAt?: string;
  error?: string;
  metrics?: { repairAttempts: number; totalMs: number };
  turnMetrics?: GvrTurnMetrics;
}

export interface TranscriptBubble {
  id: string;
  role: "user" | "model";
  text: string;
  source?: string;
  directorRaw?: string | null;
  approach?: "director" | "direct";
  modelId?: string;
  startedAt?: string;
  turnMetrics?: GvrTurnMetrics;
}

export interface PlaybackCue {
  userId: string;
  assistantId: string;
  label: string;
  source: string;
}

export function transcriptKey(id: string): string {
  return `${TRANSCRIPT_PREFIX}${id}`;
}

export function transcriptIdFromKey(key: string): string | null {
  return key.startsWith(TRANSCRIPT_PREFIX) ? key.slice(TRANSCRIPT_PREFIX.length) : null;
}

export function parseGvrTranscript(raw: string): TranscriptParse {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "not-transcript", message: "Not JSON" };
  }
  if (!data || typeof data !== "object" || Array.isArray(data) || !Object.hasOwn(data, "gvrTranscript")) {
    return { ok: false, reason: "not-transcript", message: "Not a GVR transcript" };
  }
  const record = data as Record<string, unknown>;
  if (record.gvrTranscript !== GVR_TRANSCRIPT_VERSION) {
    return { ok: false, reason: "invalid", message: `Unsupported gvrTranscript version “${String(record.gvrTranscript)}”. Studio plays ${GVR_TRANSCRIPT_VERSION}.` };
  }
  const id = requiredId(record.id, "id");
  if (typeof id !== "string") return id;
  const title = requiredText(record.title, "title");
  if (typeof title !== "string") return title;
  const createdAt = requiredTime(record.createdAt, "createdAt");
  if (typeof createdAt !== "string") return createdAt;
  if (record.approach !== "director" && record.approach !== "direct") {
    return { ok: false, reason: "invalid", message: "approach must be director or direct" };
  }
  if (typeof record.model !== "string") {
    return { ok: false, reason: "invalid", message: "model must be a string" };
  }
  if (!Array.isArray(record.turns)) {
    return { ok: false, reason: "invalid", message: "turns must be an array" };
  }
  if (record.turns.length > MAX_TURNS) {
    return { ok: false, reason: "invalid", message: `turns exceeds ${MAX_TURNS}` };
  }
  const turns: GvrTranscriptTurn[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < record.turns.length; index += 1) {
    const parsed = parseTurn(record.turns[index], index);
    if (!parsed.ok) return parsed;
    if (seen.has(parsed.turn.id)) {
      return { ok: false, reason: "invalid", message: `Duplicate turn id “${parsed.turn.id}”` };
    }
    seen.add(parsed.turn.id);
    turns.push(parsed.turn);
  }
  return {
    ok: true,
    transcript: {
      gvrTranscript: GVR_TRANSCRIPT_VERSION,
      id,
      title,
      createdAt,
      approach: record.approach,
      model: record.model,
      turns,
    },
  };
}

export function serializeGvrTranscript(doc: GvrTranscript): string {
  return JSON.stringify(doc, null, 2);
}

/** Executed session → contract. Pending model bubbles are omitted. Null when nothing finished. */
export function transcriptFromMessages(
  meta: { id: string; title: string; createdAt: string; approach: "director" | "direct"; model: string },
  messages: readonly TranscriptSourceMessage[],
): GvrTranscript | null {
  const settled = messages.filter((message) => !(message.role === "model" && message.pending));
  if (!settled.some((message) => message.role === "model")) return null;
  const turns: GvrTranscriptTurn[] = settled.map((message) => {
    if (message.role === "user") {
      return omitEmpty({
        id: message.id,
        role: "user" as const,
        text: message.text,
        startedAt: message.startedAt,
      });
    }
    const metrics = message.turnMetrics ?? (message.metrics
      ? { repairs: message.metrics.repairAttempts, latencyMs: Math.round(message.metrics.totalMs) }
      : undefined);
    return omitEmpty({
      id: message.id,
      role: "assistant" as const,
      text: message.text || message.error || "",
      directorScript: message.directorRaw?.trim() || undefined,
      motionScript: message.source?.trim() || undefined,
      startedAt: message.startedAt,
      metrics,
    });
  });
  return {
    gvrTranscript: GVR_TRANSCRIPT_VERSION,
    id: meta.id,
    title: meta.title,
    createdAt: meta.createdAt,
    approach: meta.approach,
    model: meta.model,
    turns,
  };
}

export function messagesFromTranscript(doc: GvrTranscript): TranscriptBubble[] {
  return doc.turns.map((turn) => {
    if (turn.role === "user") {
      return { id: turn.id, role: "user", text: turn.text, startedAt: turn.startedAt };
    }
    const source = turn.motionScript?.trim() ?? "";
    return {
      id: turn.id,
      role: "model",
      text: turn.text.trim() || preview(source),
      source: source || undefined,
      directorRaw: turn.directorScript ?? null,
      approach: doc.approach,
      modelId: doc.model,
      startedAt: turn.startedAt,
      turnMetrics: turn.metrics,
    };
  });
}

/** User + assistant pairs whose MotionScript can be rendered. */
export function playbackCues(messages: readonly TranscriptSourceMessage[]): PlaybackCue[] {
  const cues: PlaybackCue[] = [];
  let user: TranscriptSourceMessage | null = null;
  for (const message of messages) {
    if (message.role === "user") {
      user = message;
      continue;
    }
    const source = message.source?.trim() ?? "";
    if (user && source) {
      cues.push({
        userId: user.id,
        assistantId: message.id,
        label: clip(user.text),
        source,
      });
    }
    user = null;
  }
  return cues;
}

export function entryForTranscript(doc: GvrTranscript): ProgramEntry {
  const exchanges = doc.turns.filter((turn) => turn.role === "assistant").length;
  const last = [...doc.turns].reverse().find((turn) => turn.role === "assistant" && turn.motionScript?.trim());
  return {
    key: transcriptKey(doc.id),
    label: doc.title,
    caption: `${exchanges} turn${exchanges === 1 ? "" : "s"} · ${doc.approach}`,
    collection: TRANSCRIPT_COLLECTION,
    origin: "mine",
    format: "motionscript",
    source: last?.motionScript?.trim() ?? "",
  };
}

export function decodeTranscriptStore(raw: string | null | undefined): GvrTranscript[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; transcripts?: unknown };
    if (parsed.version !== 1 || !Array.isArray(parsed.transcripts)) return [];
    return parsed.transcripts.flatMap((item) => {
      const result = parseGvrTranscript(JSON.stringify(item));
      return result.ok ? [result.transcript] : [];
    });
  } catch {
    return [];
  }
}

export function encodeTranscriptStore(docs: readonly GvrTranscript[]): string {
  return JSON.stringify({ version: 1, transcripts: docs });
}

export function upsertTranscript(docs: readonly GvrTranscript[], doc: GvrTranscript): GvrTranscript[] {
  const next = docs.filter((item) => item.id !== doc.id);
  next.push(doc);
  return next;
}

function parseTurn(value: unknown, index: number): { ok: true; turn: GvrTranscriptTurn } | Extract<TranscriptParse, { ok: false }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "invalid", message: `Turn ${index + 1} must be an object` };
  }
  const record = value as Record<string, unknown>;
  const id = requiredId(record.id, `turns[${index}].id`);
  if (typeof id !== "string") return id;
  if (record.role !== "user" && record.role !== "assistant") {
    return { ok: false, reason: "invalid", message: `turns[${index}].role must be user or assistant` };
  }
  if (typeof record.text !== "string") {
    return { ok: false, reason: "invalid", message: `turns[${index}].text must be a string` };
  }
  const directorScript = optionalString(record, "directorScript", index);
  if (typeof directorScript !== "string" && directorScript !== undefined) return directorScript;
  const motionScript = optionalString(record, "motionScript", index);
  if (typeof motionScript !== "string" && motionScript !== undefined) return motionScript;
  let startedAt: string | undefined;
  if (Object.hasOwn(record, "startedAt") && record.startedAt !== undefined) {
    const time = requiredTime(record.startedAt, `turns[${index}].startedAt`);
    if (typeof time !== "string") return time;
    startedAt = time;
  }
  let metrics: GvrTurnMetrics | undefined;
  if (Object.hasOwn(record, "metrics") && record.metrics !== undefined) {
    const parsed = parseMetrics(record.metrics, index);
    if (!("repairs" in parsed)) return parsed;
    metrics = parsed;
  }
  return {
    ok: true,
    turn: omitEmpty({
      id,
      role: record.role,
      text: record.text,
      directorScript,
      motionScript,
      startedAt,
      metrics,
    }),
  };
}

function parseMetrics(value: unknown, index: number): GvrTurnMetrics | Extract<TranscriptParse, { ok: false }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "invalid", message: `turns[${index}].metrics must be an object` };
  }
  const record = value as Record<string, unknown>;
  if (!isCount(record.repairs) || !isCount(record.latencyMs)) {
    return { ok: false, reason: "invalid", message: `turns[${index}].metrics needs numeric repairs and latencyMs` };
  }
  return { repairs: record.repairs, latencyMs: record.latencyMs };
}

function optionalString(
  record: Record<string, unknown>,
  field: "directorScript" | "motionScript",
  index: number,
): string | undefined | Extract<TranscriptParse, { ok: false }> {
  if (!Object.hasOwn(record, field) || record[field] === undefined) return undefined;
  if (typeof record[field] !== "string") {
    return { ok: false, reason: "invalid", message: `turns[${index}].${field} must be a string` };
  }
  const text = (record[field] as string).trim();
  return text || undefined;
}

function requiredId(value: unknown, field: string): string | Extract<TranscriptParse, { ok: false }> {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    return { ok: false, reason: "invalid", message: `${field} must be a short id (letters, numbers, '.', '_', ':', '-')` };
  }
  return value;
}

function requiredText(value: unknown, field: string): string | Extract<TranscriptParse, { ok: false }> {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    return { ok: false, reason: "invalid", message: `${field} must be a non-empty string up to 200 characters` };
  }
  return value.trim();
}

function requiredTime(value: unknown, field: string): string | Extract<TranscriptParse, { ok: false }> {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return { ok: false, reason: "invalid", message: `${field} must be an ISO-8601 time` };
  }
  return value;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function omitEmpty<T extends GvrTranscriptTurn>(turn: T): T {
  const next = { ...turn };
  if (!next.directorScript) delete next.directorScript;
  if (!next.motionScript) delete next.motionScript;
  if (!next.startedAt) delete next.startedAt;
  if (!next.metrics) delete next.metrics;
  return next;
}

function preview(source: string): string {
  const lines = source.split("\n");
  const head = lines.slice(0, 6).join("\n");
  return lines.length > 6 ? `${head}\n…` : head;
}

function clip(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= 48 ? compact || "Transcript turn" : `${compact.slice(0, 45)}…`;
}
