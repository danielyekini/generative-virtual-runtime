/**
 * Studio probe: compile space.planar25d fixtures, evaluate through AnimationRuntime
 * (which projects spatialLayers), and render with the production CanvasRenderer.
 */
import { compileMotionScript } from "@gvr/compiler";
import {
  AnimationRuntime,
  buildResolvedFrame,
  hitTest,
  layersFromScene,
  projectSpatialFrame,
  projectSurfacePoint,
  sampleScene,
} from "@gvr/runtime";
import { CanvasRenderer } from "@gvr/canvas-renderer";

const crane = `scene "spatial-crane" {
  version "0.2"; viewport (640, 360); background #d9d4cc; duration 1s; requires "space.planar25d";
};
polygon Base { points ((220, 80), (420, 80), (420, 280)); fill #fff8e6; stroke #c8b890 width 1; };
polygon Flap { points ((220, 80), (420, 280), (220, 280)); fill #fff8e6; stroke #c8b890 width 1; };
circle Mark { position (232, 268); radius 5; fill #c8902a; };
spatialLayer crane {
  camera { projection perspective; position (88, 523, -910); yaw 0.25; pitch 0.35; focalLength 1000; };
  surface Base { backFill #5973b3; };
  surface Flap { parent Base; hinge (220, 80) (420, 280) -45deg; backFill #5973b3; };
  surface Mark { parent Flap; backface hidden; };
};
complete;`;

const home = `scene "spatial-home" {
  version "0.2"; viewport (640, 360); background #f4f1ea; duration 1s; requires "space.planar25d";
};
rectangle Floor { position (220, 100); size (200, 200); fill #e0d6c0; stroke #8a7a5a width 2; };
rectangle Front { position (220, 100); size (200, 160); fill #d8c8a8; stroke #5a4a30 width 2; };
rectangle Door { position (290, 180); size (60, 80); fill #6b4a2b; };
rectangle Back { position (220, 100); size (200, 160); fill #b0a080; stroke #5a4a30 width 2; };
rectangle Left { position (220, 100); size (200, 160); fill #c0b090; stroke #5a4a30 width 2; };
spatialLayer home {
  camera { projection perspective; position (140, -552, -392); yaw 0.35; pitch -0.95; focalLength 1000; };
  surface Floor { hinge (220, 260) (420, 260) 90deg; position (0, 160, 0); };
  surface Front { backFill #5973b3; };
  surface Door { parent Front; hinge (290, 180) (290, 260) 0; backFill #4d331a; };
  surface Back { position (0, 0, 200); };
  surface Left { hinge (220, 100) (220, 260) -90deg; };
};
complete;`;

const echo = `scene "spatial-echo" {
  version "0.2"; viewport (640, 360); background #2a1840; duration 1s; requires "space.planar25d";
};
polygon WallL { points ((0, 0), (300, 180), (0, 360)); fill #c98a55; };
polygon WallR { points ((640, 0), (340, 180), (640, 360)); fill #b5774a; };
text W0 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #fff4dc; align center; };
text W1 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #e8e4f4; opacity 0.75; align center; };
text W2 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #d0d8f4; opacity 0.52; align center; };
text W3 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #b8d0f0; opacity 0.34; align center; };
text W4 { position (320, 220); content "ECHO"; fontFamily "sans-serif"; fontSize 64; fontWeight 800; fill #a8c8ec; opacity 0.2; align center; };
spatialLayer echo {
  camera { projection perspective; focalLength 1000; };
  surface W0 { position (0, 0, 0); };
  surface W1 { position (-110, -40, 333); };
  surface W2 { position (90, -80, 818); };
  surface W3 { position (-60, -120, 1632); };
  surface W4 { position (30, -160, 3000); };
};
complete;`;

function runtimeOf(source: string) {
  const result = compileMotionScript(source);
  if (!result.ok || !result.scene) throw new Error(JSON.stringify(result.diagnostics));
  return new AnimationRuntime(result.scene);
}

interface Shot {
  name: string;
  frame: ReturnType<AnimationRuntime["evaluate"]>;
  probes: { label: string; at: { x: number; y: number }; expectHit?: string }[];
}

const shots: Shot[] = [];

{
  const runtime = runtimeOf(crane);
  const frame = runtime.evaluate(0);
  const layout = buildResolvedFrame(runtime.scene, sampleScene(runtime.scene, 0), 0);
  const projected = projectSpatialFrame(layout, layersFromScene(runtime.scene));
  shots.push({
    name: "crane-45",
    frame,
    probes: [{ label: "flap", at: projectSurfacePoint(projected, "Flap", { x: 287, y: 213 })!, expectHit: "Flap" }],
  });
}

{
  const runtime = runtimeOf(home);
  const frame = runtime.evaluate(0);
  const layout = buildResolvedFrame(runtime.scene, sampleScene(runtime.scene, 0), 0);
  const projected = projectSpatialFrame(layout, layersFromScene(runtime.scene));
  shots.push({
    name: "home-front",
    frame,
    probes: [
      { label: "wall", at: projectSurfacePoint(projected, "Front", { x: 245, y: 125 })!, expectHit: "Front" },
      { label: "door", at: projectSurfacePoint(projected, "Door", { x: 320, y: 220 })!, expectHit: "Door" },
    ],
  });
}

{
  const runtime = runtimeOf(echo);
  shots.push({
    name: "echo",
    frame: runtime.evaluate(0),
    probes: [{ label: "W0", at: { x: 320, y: 205 }, expectHit: "W0" }],
  });
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
(window as unknown as { __spatialStudio: unknown }).__spatialStudio = out;
