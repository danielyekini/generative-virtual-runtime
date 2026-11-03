/**
 * E047: the stream linter reports SEALED_HISTORY_WRITE only for writes behind
 * the sealed horizon. Other INVALID_TIMING diagnostics are compile errors.
 */
import { describe, expect, it } from "vitest";
import { compileMotionScript } from "./compile";
import { isSealedHistoryWrite } from "./sealed-write";
import { lintStreamingAuthorship } from "./stream-lint";

const header = `scene "e047" {version "0.2"; viewport (320,180); background #101014; duration 4s;};
rectangle box { size (10, 10); fill #ff0000; position (0, 0); };
animate box.opacity { from 1; to 0.5; duration 1s; };
`;

function codes(source: string): string[] {
  return lintStreamingAuthorship(source).findings.filter((finding) => finding.severity === "error").map((finding) => finding.code);
}

describe("SEALED_HISTORY_WRITE classification (E047)", () => {
  it("does not label a negative beat as a sealed-history write", () => {
    const source = `${header}beat early at 1s;\nbeat bad at early - 2s;\nseal 2s;\ncomplete;`;
    const compiled = compileMotionScript(source);
    expect(compiled.diagnostics.some((item) => item.code === "INVALID_TIMING")).toBe(true);
    expect(codes(source)).toContain("COMPILE_ERROR");
    expect(codes(source)).not.toContain("SEALED_HISTORY_WRITE");
  });

  it("does not label a step outside the scene duration as a sealed-history write", () => {
    const source = `${header}step box.visible { at 9s; value false; };\nseal 2s;\ncomplete;`;
    expect(codes(source)).toContain("COMPILE_ERROR");
    expect(codes(source)).not.toContain("SEALED_HISTORY_WRITE");
  });

  it("does not label repeat without a period as a sealed-history write", () => {
    const source = `${header}timing loop { repeat 2; };\nseal 2s;\ncomplete;`;
    expect(codes(source)).toContain("COMPILE_ERROR");
    expect(codes(source)).not.toContain("SEALED_HISTORY_WRITE");
  });

  it("does not label a frozen base definition as a sealed-history write", () => {
    const source = `${header}seal 2s;\nrectangle late { size (4, 4); fill #00ff00; position (0, 0); };\ncomplete;`;
    expect(compileMotionScript(source).diagnostics.map((item) => item.message)).toContain("Base definitions are frozen after the first seal.");
    expect(codes(source)).toContain("COMPILE_ERROR");
    expect(codes(source)).not.toContain("SEALED_HISTORY_WRITE");
  });

  it("still labels a late track, step, cue and cyclic writer", () => {
    const late = [
      `animate box.position.x { from 0; to 10; start 1s; duration 1s; };`,
      `step box.visible { at 1s; value false; };`,
      `cue Tap effects Click at 1s;`,
    ];
    for (const unit of late) {
      const source = `${header}audio Click "audio/click.wav" 80ms;\nseal 2s;\n${unit}\ncomplete;`;
      const compiled = compileMotionScript(source);
      const sealed = compiled.diagnostics.filter(isSealedHistoryWrite);
      expect(sealed, unit).toHaveLength(1);
      expect(sealed[0]!.code).toBe("INVALID_TIMING");
      expect(sealed[0]!.sceneTimeMs).toBe(2000);
      expect(codes(source), unit).toContain("SEALED_HISTORY_WRITE");
    }
    const cyclic = `${header}timing loop { period 1s; };\nseal 2s;\nanimate box.position.y { from 0; to 5; duration 500ms; timing loop; };\ncomplete;`;
    const lint = lintStreamingAuthorship(cyclic);
    expect(lint.findings.some((finding) => finding.code === "SEALED_HISTORY_WRITE" && finding.message.includes("cyclic scope loop"))).toBe(true);
  });

  it("leaves the public diagnostic code unchanged", () => {
    const source = `${header}seal 2s;\nstep box.visible { at 1s; value false; };\ncomplete;`;
    expect(compileMotionScript(source).diagnostics.map((item) => item.code)).toEqual(["INVALID_TIMING"]);
  });
});
