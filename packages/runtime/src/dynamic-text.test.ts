import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { acceptScene } from "@gvr/schema";
import { sampleScene } from "./sample";

function compile(source: string) {
  const result = compileMotionScript(source);
  expect(result.diagnostics).toEqual([]);
  expect(result.ok).toBe(true);
  const scene = result.scene!;
  expect(acceptScene(scene, { consumer: "0.2", enabled: scene.requiredCapabilities ?? [] }).ok).toBe(true);
  return scene;
}

describe("dynamic text sampling (text.dynamicContent)", () => {
  it("formats a live number into text content", () => {
    const scene = compile(`scene "readout" {
  version "0.2";
  viewport (320, 180);
  background #0b1220;
  duration 2s;
};
text Price {
  content "0.00";
  fontSize 24;
  fill #22c55e;
  align center;
  number 10;
  fractionDigits 2;
  prefix "$";
};
animate Price.number { from 10; to 99.5; duration 2s; };
complete;`);

    const start = sampleScene(scene, 0);
    const price0 = start.nodes.find((node) => node.id === "Price");
    expect(price0?.kind).toBe("text");
    if (price0?.kind === "text") expect(price0.content).toBe("$10.00");

    const mid = sampleScene(scene, 1000);
    const priceMid = mid.nodes.find((node) => node.id === "Price");
    expect(priceMid?.kind).toBe("text");
    if (priceMid?.kind === "text") expect(priceMid.content).toBe("$54.75");

    const end = sampleScene(scene, 2000);
    const priceEnd = end.nodes.find((node) => node.id === "Price");
    expect(priceEnd?.kind).toBe("text");
    if (priceEnd?.kind === "text") expect(priceEnd.content).toBe("$99.50");
  });

  it("applies discrete content steps", () => {
    const scene = compile(`scene "labels" {
  version "0.2";
  viewport (320, 180);
  background #0b1220;
  duration 3s;
};
text Status {
  content "Ready";
  fontSize 18;
  fill #f8fafc;
};
step Status.content { at 1s; value "Set"; };
step Status.content { at 2s; value "Go"; };
complete;`);

    const before = sampleScene(scene, 500);
    const mid = sampleScene(scene, 1500);
    const after = sampleScene(scene, 2500);
    const contentAt = (sampled: ReturnType<typeof sampleScene>) => {
      const node = sampled.nodes.find((entry) => entry.id === "Status");
      return node?.kind === "text" ? node.content : undefined;
    };
    expect(contentAt(before)).toBe("Ready");
    expect(contentAt(mid)).toBe("Set");
    expect(contentAt(after)).toBe("Go");
  });
});
