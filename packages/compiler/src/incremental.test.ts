import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createIncrementalLexer, lex } from "@gvr/schema";
import { compileMotionScript } from "./compile";
import { compileIncrementally, createIncrementalProgram, fragmentSource } from "./incremental";

const root = resolve(import.meta.dirname, "../../..");

function source(name: string): string {
  return readFileSync(resolve(root, "fixtures/motionscript", name), "utf8");
}

const nasty = `scene "split" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 1s;
};
// comment keeps a ; semicolon
text label {
  content "hel\\"lo";
  fontSize 24;
  fill #FFAA00;
  position (12.345, 8);
};
complete;
`;

function sameProgram(text: string, chunks: string[]): void {
  const whole = compileMotionScript(text);
  const incremental = compileIncrementally(chunks);
  expect(incremental.scene, incremental.diagnostics.map((item) => item.message).join("\n")).toEqual(whole.scene);
  expect(incremental.ok).toBe(whole.ok);
  expect(incremental.sealedThroughMs).toBe(whole.sealedThroughMs);
  expect(incremental.completed).toBe(whole.completed);
}

const CAPABILITY = `scene "cap" {
  version "0.2";
  viewport (100, 100);
  background #000000;
  duration 1s;
  requires "easing.cubicBezier";
  requires "timing.localScopes";
  requires "composition.definitions";
};
timing local { offset 0ms; stretch 1; };
instance one of chip { start 0ms; end 1s; timing local; };
composition chip {
  rectangle body { size (10, 10); fill #ffffff; };
};
rectangle box { size (4, 4); fill #ff0000; };
animate box.opacity { from 0; to 1; duration 1s; ease cubic(0.4, 0, 0.2, 1); timing local; };
complete;
`;

describe("fragment boundaries", () => {
  it("matches a whole-file lex across every character split", () => {
    const samples = [nasty, "12.345;", "#FFAA00;", String.raw`"hel\"lo"`, "6s;", "// semi;\ncircle"];
    for (const sample of samples) {
      for (let index = 0; index < sample.length; index += 1) {
        const lexer = createIncrementalLexer();
        const tokens = [
          ...lexer.push(sample.slice(0, index)),
          ...lexer.push(sample.slice(index)),
        ];
        const tail = lexer.finish();
        expect({ tokens: [...tokens, ...tail.tokens], diagnostics: tail.diagnostics }).toEqual(lex(sample));
      }
    }
  });

  it("compiles the visual programs the same way for every fragment strategy", () => {
    for (const name of ["bunny.ms", "ball.ms", "caption.ms", "nested.ms", "diagram.ms", "camera.ms"]) {
      const text = source(name);
      for (const kind of ["characters", "lines", "blocks", "packets", "random"] as const) {
        sameProgram(text, fragmentSource(text, kind, 7));
      }
    }
  });

  it("compiles a 0.2 program across fragment strategies and every split", () => {
    for (const kind of ["characters", "lines", "blocks", "packets", "random"] as const) {
      sameProgram(CAPABILITY, fragmentSource(CAPABILITY, kind, 3));
    }
    for (let index = 0; index < CAPABILITY.length; index += 1) {
      sameProgram(CAPABILITY, [CAPABILITY.slice(0, index), CAPABILITY.slice(index)]);
    }
  });

  it("compiles every two-chunk split of a program that breaks inside tokens", () => {
    for (let index = 0; index < nasty.length; index += 1) {
      sameProgram(nasty, [nasty.slice(0, index), nasty.slice(index)]);
    }
  });
});

describe("atomic commits", () => {
  it("hides a group until its closing semicolon", () => {
    const text = `scene "group" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 1s;
};
group root {
  rectangle a { size (10, 10); fill #ff0000; };
};
complete;
`;
    const program = createIncrementalProgram();
    const semi = text.indexOf(";\ncomplete");
    for (let index = 0; index < text.length; index += 1) {
      program.push(text[index] ?? "");
      if (index < semi) expect(program.scene?.nodes ?? []).toEqual([]);
    }
    expect(program.finish().scene?.nodes.map((node) => node.id)).toEqual(["root", "root.a"]);
  });

  it("keeps a failed batch out of the scene", () => {
    const compiled = compileIncrementally([
      `scene "batch" { version "0.1"; viewport (1280, 720); background #101014; duration 2s; };
batch {
  rectangle a { size (10, 10); fill #ff0000; };
  rectangle b { size (12, 12); fill #00ff00; };
  animate missing.position.x { from 0; to 1; duration 1s; };
};
complete;
`,
    ]);
    expect(compiled.scene?.nodes).toEqual([]);
    expect(compiled.scene?.timeline.tracks).toEqual([]);
  });

  it("rejects a backdated track and accepts one that starts on the seal", () => {
    const compiled = compileMotionScript(`scene "seal" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 3s;
};
rectangle box { size (10, 10); fill #ff0000; };
seal 2s;
animate box.position.x { from 0; to 10; start 1s; duration 1s; };
animate box.opacity { from 1; to 0; start 2s; duration 1s; };
complete;
`);
    expect(compiled.scene?.timeline.tracks).toHaveLength(1);
    expect(compiled.scene?.timeline.tracks[0]).toMatchObject({ startMs: 2000 });
    expect(compiled.sealedThroughMs).toBe(3000);
  });

  it("does not advance a seal while a reference is unresolved", () => {
    const program = createIncrementalProgram();
    program.push(`scene "wait" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 3s;
};
animate box.position.x { from 0; to 10; duration 1s; };
seal 2s;
`);
    expect(program.sealedThroughMs).toBe(0);
    expect(program.diagnostics.some((item) => item.code === "SEAL_BLOCKED")).toBe(true);
    program.push(`rectangle box { size (10, 10); fill #ff0000; };
seal 2s;
complete;
`);
    const compiled = program.finish();
    expect(compiled.completed).toBe(true);
    expect(compiled.scene?.timeline.tracks).toHaveLength(1);
    expect(compiled.sealedThroughMs).toBe(3000);
  });

  it("seals the declared duration from complete without a final seal", () => {
    const compiled = compileIncrementally(
      fragmentSource(
        `scene "done" { version "0.1"; viewport (1280, 720); background #101014; duration 2s; };
rectangle box { size (10, 10); fill #ff0000; };
complete;
`,
        "characters",
      ),
    );
    expect(compiled.completed).toBe(true);
    expect(compiled.sealedThroughMs).toBe(2000);
    expect(compiled.deltas.some((delta) => delta.operations.some((op) => op.op === "COMPLETE_PROGRAM"))).toBe(true);
  });
});
