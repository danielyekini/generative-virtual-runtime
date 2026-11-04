import { describe, expect, it } from "vitest";
import { validateSceneIR, type SceneIR } from "@gvr/schema";
import { compileMotionScript } from "./index";

// E055 (multi-line-text-wrapping.md): text.basic stays one line. Embedded line
// breaks are rejected honestly, never wrapped or silently flattened.
const header = `scene "single-line" {version "0.2"; viewport (400,300); background #0b1220; duration 3s;};`;

function scene(): SceneIR {
  const result = compileMotionScript(`${header}
text Caption { content "One line"; fontSize 18; fill #f8fafc; };
step Caption.content { at 1s; value "Still one line"; };
complete;`);
  expect(result.diagnostics).toEqual([]);
  return result.scene!;
}

function codes(value: SceneIR) {
  const result = validateSceneIR(value);
  return result.ok ? [] : result.diagnostics.map((d) => [d.code, d.path, d.message]);
}

describe("text.basic single-line contract (E055 stop)", () => {
  it("accepts one-line content and content steps", () => {
    expect(validateSceneIR(scene()).ok).toBe(true);
  });

  it.each(["two\nlines", "two\r\nlines", "two\rlines"])("rejects a line break in node content (%j)", (content) => {
    const value = scene();
    const caption = value.nodes.find((node) => node.id === "Caption")!;
    if (caption.kind !== "text") throw new Error("expected text");
    caption.content = content;
    expect(codes(value)).toEqual([["INVALID_GEOMETRY", "nodes[0].content", "V1 text is a single line."]]);
  });

  it("rejects a line break in a content step", () => {
    const value = scene();
    value.timeline.steps[0]!.value = "two\nlines";
    expect(codes(value)).toEqual([["INVALID_GEOMETRY", "timeline.steps[0].value", "V1 text is a single line."]]);
  });
});
