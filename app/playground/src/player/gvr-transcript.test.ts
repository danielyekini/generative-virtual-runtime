import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import {
  decodeTranscriptStore,
  encodeTranscriptStore,
  entryForTranscript,
  messagesFromTranscript,
  parseGvrTranscript,
  playbackCues,
  transcriptFromMessages,
  TRANSCRIPT_COLLECTION,
  upsertTranscript,
} from "./gvr-transcript";

const samplePath = resolve(import.meta.dirname, "../../fixtures/gvr-transcript-sample.json");
const sample = readFileSync(samplePath, "utf8");

describe("GVR transcript 0.1 (P029)", () => {
  it("imports the sample and compiles each recorded program", () => {
    const parsed = parseGvrTranscript(sample);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.transcript.gvrTranscript).toBe("0.1");
    expect(parsed.transcript.turns).toHaveLength(4);
    const programs = parsed.transcript.turns.flatMap((turn) => turn.motionScript ? [turn.motionScript] : []);
    expect(programs).toHaveLength(2);
    for (const source of programs) {
      const compiled = compileMotionScript(source);
      expect(compiled.ok, compiled.diagnostics.map((item) => item.message).join("\n")).toBe(true);
      expect(compiled.scene?.timeline.durationMs).toBe(1000);
    }
    const entry = entryForTranscript(parsed.transcript);
    expect(entry.collection).toBe(TRANSCRIPT_COLLECTION);
    expect(entry.key).toBe("transcript:sample-baseline");
    expect(entry.caption).toBe("2 turns · director");
    expect(entry.source).toContain('scene "transcript-b"');
  });

  it("leaves Lottie and MotionScript text to their own importers", () => {
    expect(parseGvrTranscript('{"layers":[],"fr":30}').ok).toBe(false);
    expect(parseGvrTranscript('{"layers":[],"fr":30}')).toMatchObject({ reason: "not-transcript" });
    expect(parseGvrTranscript('scene "x" {}')).toMatchObject({ reason: "not-transcript" });
  });

  it("rejects an unknown contract version and a broken turn", () => {
    const doc = JSON.parse(sample) as { gvrTranscript: string; turns: { role?: string }[] };
    doc.gvrTranscript = "0.2";
    expect(parseGvrTranscript(JSON.stringify(doc))).toMatchObject({ ok: false, reason: "invalid" });
    doc.gvrTranscript = "0.1";
    doc.turns[1]!.role = "model";
    const invalid = parseGvrTranscript(JSON.stringify(doc));
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.message).toMatch(/role/);
  });

  it("round-trips a session and highlights only turns that have MotionScript", () => {
    const parsed = parseGvrTranscript(sample);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const bubbles = messagesFromTranscript(parsed.transcript);
    expect(bubbles.map((bubble) => bubble.role)).toEqual(["user", "model", "user", "model"]);
    expect(bubbles[1]?.turnMetrics).toEqual({ repairs: 0, latencyMs: 1200 });
    const cues = playbackCues(bubbles);
    expect(cues.map((cue) => cue.assistantId)).toEqual(["a1", "a2"]);
    expect(cues[0]).toMatchObject({ userId: "u1", label: "Move a circle across the frame." });
    const again = transcriptFromMessages(
      {
        id: parsed.transcript.id,
        title: parsed.transcript.title,
        createdAt: parsed.transcript.createdAt,
        approach: "director",
        model: parsed.transcript.model,
      },
      bubbles,
    );
    expect(again?.turns.map((turn) => turn.motionScript)).toEqual(parsed.transcript.turns.map((turn) => turn.motionScript));
    const stored = decodeTranscriptStore(encodeTranscriptStore(upsertTranscript([], parsed.transcript)));
    expect(stored).toEqual([parsed.transcript]);
  });

  it("does not persist a session that never finished a model turn", () => {
    expect(transcriptFromMessages(
      { id: "s", title: "Empty", createdAt: "2026-11-03T00:00:00.000Z", approach: "direct", model: "m" },
      [{ id: "u", role: "user", text: "hi" }, { id: "m", role: "model", text: "", pending: true }],
    )).toBeNull();
  });
});
