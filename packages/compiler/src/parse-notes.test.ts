/** E052: a parse-time node-property note is one compile diagnostic. */
import { describe, expect, it } from "vitest";
import { compileIncrementally, compileMotionScript } from "./index";

const header = `scene "notes" {version "0.2"; viewport (320,180); background #ffffff; duration 1s;};`;
const compile = (body: string) => compileMotionScript(`${header}\n${body}\ncomplete;`);
const messages = (result: ReturnType<typeof compileMotionScript>) => result.diagnostics.map((item) => item.message);

describe("parse-time node property diagnostics (E052)", () => {
  it("emits sign bogus once and rejects the node", () => {
    const result = compile(`text Price { content "1"; fontSize 16; fill #000000; sign bogus; };`);
    expect(messages(result)).toEqual(['sign is "auto", "always", or "never".']);
    expect(result.diagnostics.map((item) => item.code)).toEqual(["INVALID_TYPE"]);
    expect(result.diagnostics.map((item) => item.phase)).toEqual(["parse"]);
    expect(result.scene?.nodes ?? []).toEqual([]);
    expect(result.ok).toBe(false);
  });

  it("emits a nested property note once and leaves the group out", () => {
    const result = compile(`group Box {
  text Price { content "1"; fontSize 16; fill #000000; sign bogus; };
};`);
    expect(messages(result)).toEqual(['sign is "auto", "always", or "never".']);
    expect(result.scene?.nodes ?? []).toEqual([]);
  });

  it("emits a parent note and a nested note once each", () => {
    const result = compile(`group Box {
  opacity bogus;
  text Price { content "1"; fontSize 16; fill #000000; sign bogus; };
};`);
    expect(messages(result)).toEqual(["opacity needs a number.", 'sign is "auto", "always", or "never".']);
    expect(result.scene?.nodes ?? []).toEqual([]);
  });

  it("keeps two distinct already-set notes", () => {
    const result = compile(`text Price { content "1"; fontSize 16; fill #000000; position (0, 0); position (1, 1); position (2, 2); };`);
    expect(messages(result)).toEqual(["position is already set.", "position is already set."]);
  });

  it("emits the same note once when the source is one stream", () => {
    const source = `${header}\ntext Price { content "1"; fontSize 16; fill #000000; sign bogus; };\ncomplete;`;
    const streamed = compileIncrementally([source]);
    expect(messages(streamed)).toEqual(['sign is "auto", "always", or "never".']);
    const nested = compileIncrementally([
      `${header}\ngroup Box {\n  text Price { content "1"; fontSize 16; fill #000000; sign bogus; };\n};\ncomplete;`,
    ]);
    expect(messages(nested)).toEqual(['sign is "auto", "always", or "never".']);
  });

  it("emits a bad header property once on a whole file and on a stream", () => {
    const source = `scene "notes" {version "0.2"; viewport nope; background #ffffff; duration 1s;};\ncomplete;`;
    expect(messages(compileMotionScript(source)).filter((message) => message === "viewport needs (width, height).")).toEqual([
      "viewport needs (width, height).",
    ]);
    expect(messages(compileIncrementally([source])).filter((message) => message === "viewport needs (width, height).")).toEqual([
      "viewport needs (width, height).",
    ]);
  });
});
