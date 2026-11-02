// Browser entry: Crane / Home / Echo spatial scenes through the production CanvasRenderer.
import { compileMotionScript } from "@gvr/compiler";
import { buildResolvedFrame, hitTest, orbitCamera, projectSpatialFrame, projectSurfacePoint, sampleScene } from "@gvr/runtime";
import type { SpatialCamera, SpatialSurface } from "@gvr/runtime";
import { CanvasRenderer } from "@gvr/canvas-renderer";

const BLUE = { type: "solid" as const, r: 0.35, g: 0.45, b: 0.7, a: 1 };

function frameOf(source: string) {
  const result = compileMotionScript(source);
  if (!result.ok || !result.scene) throw new Error(JSON.stringify(result.diagnostics));
  return buildResolvedFrame(result.scene, sampleScene(result.scene, 0), 0);
}

const crane = `scene "crane" {version "0.2"; viewport (640,360); background #d9d4cc; duration 1s;};
polygon Base { points ((220, 80), (420, 80), (420, 280)); fill #fff8e6; stroke #c8b890 width 1; };
polygon Flap { points ((220, 80), (420, 280), (220, 280)); fill #fff8e6; stroke #c8b890 width 1; };
circle Mark { position (232, 268); radius 5; fill #c8902a; };
complete;`;

const home = `scene "home" {version "0.2"; viewport (640,360); background #f4f1ea; duration 1s;};
rectangle Floor { position (220, 100); size (200, 200); fill #e0d6c0; stroke #8a7a5a width 2; };
rectangle Front { position (220, 100); size (200, 160); fill #d8c8a8; stroke #5a4a30 width 2; };
rectangle Door { position (290, 180); size (60, 80); fill #6b4a2b; };
rectangle Back { position (220, 100); size (200, 160); fill #b0a080; stroke #5a4a30 width 2; };
rectangle Left { position (220, 100); size (200, 160); fill #c0b090; stroke #5a4a30 width 2; };
complete;`;

const echo = `scene "echo" {version "0.2"; viewport (640,360); background #2a1840; duration 1s;};
polygon WallL { points ((0, 0), (300, 180), (0, 360)); fill #c98a55; };
polygon WallR { points ((640, 0), (340, 180), (640, 360)); fill #b5774a; };
text W0 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #fff4dc; align center; };
text W1 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #e8e4f4; opacity 0.75; align center; };
text W2 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #d0d8f4; opacity 0.52; align center; };
text W3 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #b8d0f0; opacity 0.34; align center; };
text W4 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #a8c8ec; opacity 0.2; align center; };
complete;`;

interface Shot { name: string; frame: ReturnType<typeof frameOf>; probes: { label: string; at: { x: number; y: number }; expectHit?: string }[] }
const shots: Shot[] = [];
const hinge = { from: { x: 220, y: 80 }, to: { x: 420, y: 280 } };
const elevated = orbitCamera({ target: { x: 320, y: 180, z: 0 }, distance: 1000, pitch: 0.35, yaw: 0.25 });
for (const deg of [0, 45, 135, 180]) {
  const angle = (-deg * Math.PI) / 180;
  const base = frameOf(crane);
  const surfaces: SpatialSurface[] = [
    { nodeId: "Base", back: { fill: BLUE, stroke: { color: BLUE, width: 1, cap: "butt", join: "miter", miterLimit: 4 } } },
    { nodeId: "Flap", parent: "Base", transform: { hinge: { ...hinge, angle } }, back: { fill: BLUE } },
    { nodeId: "Mark", parent: "Flap", backface: "hidden" },
  ];
  const projected = projectSpatialFrame(base, [{ id: "crane", camera: elevated, surfaces }]);
  const flapCentre = projectSurfacePoint(projected, "Flap", { x: 287, y: 213 })!;
  shots.push({ name: `crane-${deg}`, frame: projected.frame, probes: [{ label: "flap", at: flapCentre, expectHit: "Flap" }] });
}
for (const [name, yaw, door] of [["home-front", 0.35, 0], ["home-door-open", 0.35, Math.PI / 2], ["home-behind", Math.PI - 0.35, 0]] as const) {
  const base = frameOf(home);
  const camera: SpatialCamera = orbitCamera({ target: { x: 320, y: 180, z: 100 }, distance: 900, yaw, pitch: -0.95 });
  const projected = projectSpatialFrame(base, [{ id: "home", camera, surfaces: [
    { nodeId: "Floor", transform: { hinge: { from: { x: 220, y: 260 }, to: { x: 420, y: 260 }, angle: Math.PI / 2 }, position: { x: 0, y: 160, z: 0 } } },
    { nodeId: "Front", back: { fill: BLUE } },
    { nodeId: "Door", parent: "Front", transform: { hinge: { from: { x: 290, y: 180 }, to: { x: 290, y: 260 }, angle: door } }, back: { fill: { type: "solid", r: 0.3, g: 0.2, b: 0.1, a: 1 } } },
    { nodeId: "Back", transform: { position: { x: 0, y: 0, z: 200 } } },
    { nodeId: "Left", transform: { hinge: { from: { x: 220, y: 100 }, to: { x: 220, y: 260 }, angle: -Math.PI / 2 } } },
  ] }]);
  const wall = name === "home-behind" ? "Back" : "Front";
  shots.push({ name, frame: projected.frame, probes: [
    { label: "wall", at: projectSurfacePoint(projected, wall, { x: 245, y: 125 })!, expectHit: wall },
    ...(name === "home-front" ? [{ label: "door", at: projectSurfacePoint(projected, "Door", { x: 320, y: 220 })!, expectHit: "Door" }] : []),
  ] });
}
{
  const base = frameOf(echo);
  const f = 1000;
  const scales = [1, 0.75, 0.55, 0.38, 0.25];
  const xs = [0, -110, 90, -60, 30];
  const surfaces: SpatialSurface[] = scales.map((s, i) => ({ nodeId: `W${i}`, transform: { position: { x: xs[i]!, y: -40 * i, z: f / s - f } } }));
  const projected = projectSpatialFrame(base, [{ id: "echo", camera: { projection: "perspective" }, surfaces }]);
  shots.push({ name: "echo", frame: projected.frame, probes: [{ label: "W0", at: { x: 320, y: 205 }, expectHit: "W0" }] });
}

const out: unknown[] = [];
for (const shot of shots) {
  const canvas = document.createElement("canvas");
  canvas.id = shot.name;
  canvas.style.width = "640px";
  canvas.style.height = "360px";
  document.body.appendChild(canvas);
  const renderer = new CanvasRenderer(canvas);
  renderer.resize(640, 360, 1);
  renderer.render(shot.frame);
  const ctx = canvas.getContext("2d")!;
  out.push({
    name: shot.name,
    order: shot.frame.drawItems.map((item) => item.nodeId),
    probes: shot.probes.map((probe) => {
      const pixel = Array.from(ctx.getImageData(Math.round(probe.at.x), Math.round(probe.at.y), 1, 1).data);
      const hit = hitTest(shot.frame, probe.at)?.nodeId;
      return { ...probe, hit, pixel };
    }),
  });
}
(window as unknown as { __spatial: unknown }).__spatial = out;
