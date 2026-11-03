import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { transformPoint, type SceneIR } from "@gvr/schema";
import { describe, expect, it } from "vitest";
import { emitMotionScript } from "./emit";

/**
 * E044 sampling evidence for MotionScript 0.23.0 timing.timedKeys through the
 * production compiler, runtime and emitter. Beats and timed keys lower onto
 * existing Scene IR offsets, so the emitter writes the percentage form.
 */

function compile(source: string): SceneIR {
  const compiled = compileMotionScript(source);
  expect(compiled.diagnostics.map((item) => item.message)).toEqual([]);
  expect(compiled.ok).toBe(true);
  return compiled.scene!;
}

function sample(scene: SceneIR, nodeId: string, timeMs: number) {
  const item = new AnimationRuntime(scene).evaluate(timeMs).drawItems.find((entry) => entry.nodeId === nodeId);
  if (!item) return undefined;
  const origin = transformPoint(item.logicalMatrix, 0, 0);
  return { x: origin.x, y: origin.y, opacity: item.opacity, matrix: item.logicalMatrix };
}

const header = `scene "per-beat" {version "0.2"; viewport (400,300); background #ffffff; duration 6s;};`;

describe("per-beat animate blocks follow the E014 gap/hold rule", () => {
  // Two touching beats, then a gap, then a third beat. x uses fill forwards;
  // y uses fill none, so its gap shows the authored base (y = 40).
  const scene = compile(`${header}
beat a at 0s;
beat b at a + 1s;
beat c at b + 500ms;
beat d at c + 1.5s;
rectangle Box { size (10, 10); fill #000000; position (0, 40); };
animate Box.position.x { from 0; to 100; start a; duration 1s; fill forwards; };
animate Box.position.x { from 200; to 250; start b; duration 500ms; fill forwards; };
animate Box.position.x { from 400; to 500; start d; duration 1s; fill forwards; };
animate Box.position.y { from 0; to 100; start a; duration 1s; fill none; };
animate Box.position.y { from 300; to 400; start d; duration 1s; fill none; };
complete;`);

  it("gives the shared boundary to the later beat", () => {
    expect(sample(scene, "Box", 1000)!.x).toBe(200);
    expect(sample(scene, "Box", 999.999)!.x).toBeCloseTo(100, 2);
  });

  it("holds the latest-ended fill forwards writer in a gap, and shows the base otherwise", () => {
    expect(sample(scene, "Box", 2000)!.x).toBe(250);
    expect(sample(scene, "Box", 2000)!.y).toBe(40);
    expect(sample(scene, "Box", 4500)!.x).toBe(500);
    expect(sample(scene, "Box", 4500)!.y).toBe(40);
  });
});

describe("re-emitted beats sample as their percentage form", () => {
  const source = readFileSync(resolve(import.meta.dirname, "../../../fixtures/motionscript/timed-keys.ms"), "utf8");
  const beats = compile(source);
  const emitted = emitMotionScript(beats);
  const again = compile(emitted);
  // The same program written by hand with percentages over full-length tracks.
  const percent = compile(`scene "timed-keys" {version "0.2"; viewport (640, 360); background #0f172a; duration 6s;};
circle Ball { radius 24; fill #38bdf8; position (80, 180); };
text Caption { content "Cross"; fontSize 28; fill #f8fafc; position (320, 300); align center; opacity 0; };
keyframes Ball.position.x { start 0s; duration 3s; fill forwards; 0% 80 ease easeInOut; 50% 320 ease easeOut; 100% 540; };
animate Caption.opacity { from 0; to 1; start 1500ms; duration 400ms; fill forwards; };
seal 3500ms;
keyframes Ball.scale { start 3500ms; duration 1500ms; fill forwards; 0% (1, 1) ease easeIn; 16.666666666666668% (1.3, 0.8) ease easeOut; 100% (1, 1); };
step Caption.visible { at 5s; value false; };
complete;`);

  it("emits no beat or at-key syntax", () => {
    expect(emitted).not.toMatch(/\bbeat\b/);
    expect(emitted).toMatch(/50% 320/);
  });

  it("samples the same values at every 50ms step", () => {
    for (let time = 0; time <= 6000; time += 50) {
      for (const nodeId of ["Ball", "Caption"]) {
        const a = sample(beats, nodeId, time);
        // The emitter writes offsets to 8 significant digits (16.66666667%),
        // so the re-emitted and hand-written forms agree to about 1e-9.
        for (const other of [sample(again, nodeId, time), sample(percent, nodeId, time)]) {
          if (a === undefined || other === undefined) {
            expect(other, `${nodeId} @${time}`).toEqual(a);
            continue;
          }
          expect(other.opacity).toBeCloseTo(a.opacity, 9);
          a.matrix.forEach((value, index) => expect(other.matrix[index], `${nodeId} @${time}`).toBeCloseTo(value, 8));
        }
      }
    }
  });
});
