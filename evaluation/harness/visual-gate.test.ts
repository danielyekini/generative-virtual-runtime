import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkVisualFrame, checkVisualWindow, type Raster } from "./visual-gate";

const settings = JSON.parse(readFileSync(new URL("../gate-settings.json", import.meta.url), "utf8"));
const rules = settings.visualCertification;
function background(width = 512, height = 512): Raster {
  const data = new Uint8Array(width*height*4);
  for (let i = 0; i < data.length; i += 4) data.set([16,16,20,255], i);
  return { width, height, data };
}
function frame(a: Raster, b: Raster) { return checkVisualFrame(a,b,rules,settings.pixel.inspectionThreshold); }

describe("visual acceptance gate", () => {
  it("rejects a missing small subject despite tiny whole-frame error", () => {
    const reference = background(), native = background();
    for (let y=14;y<18;y++) for (let x=14;x<18;x++) (reference.data as Uint8Array).set([255,255,255,255],(y*512+x)*4);
    const result = frame(reference,native);
    expect(result.fractionBeyond).toBeLessThan(rules.aggregate.maxFrameFractionBeyond);
    expect(result.passed).toBe(false);
    expect(result.failedRegions.length).toBeGreaterThan(0);
  });
  it("rejects transparent output and mismatched capture sizes", () => {
    const a=background(), b=background(); (b.data as Uint8Array)[3]=0;
    expect(frame(a,b).alphaFailures).toBe(1);
    expect(frame(a,b).passed).toBe(false);
    expect(frame(a,background(10,10)).fractionBeyond).toBeNull();
  });
  it("requires complete coverage, reference validation and material review", () => {
    const match=frame(background(),background());
    const input={scheduled:[match],extra:[],expectedScheduled:1,expectedExtra:0,fullWindow:true,materialReview:"PASS" as const,referenceVerified:true};
    expect(checkVisualWindow(input,rules).status).toBe("PASS");
    expect(checkVisualWindow({...input,scheduled:[]},rules).status).toBe("NOT_RUN");
    expect(checkVisualWindow({...input,materialReview:"NOT_RUN"},rules).status).toBe("VISUAL_UNVERIFIED");
    expect(checkVisualWindow({...input,materialReview:"FAIL"},rules).status).toBe("FAIL");
    expect(checkVisualWindow({...input,referenceVerified:false},rules).status).toBe("BLOCKED");
    expect(checkVisualWindow({...input,fullWindow:false},rules).status).toBe("NOT_RUN");
  });
  it("does not hide a per-frame failure inside the window average", () => {
    const match=frame(background(),background());
    const bad={...match,passed:false,fractionBeyond:0.006};
    const result=checkVisualWindow({scheduled:[bad,...Array(9).fill(match)],extra:[],expectedScheduled:10,expectedExtra:0,fullWindow:true,materialReview:"PASS",referenceVerified:true},rules);
    expect(result.meanFractionBeyond).toBeLessThan(rules.aggregate.maxWindowMeanFractionBeyond);
    expect(result.status).toBe("FAIL");
  });
});
