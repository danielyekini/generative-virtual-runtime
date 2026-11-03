// MotionScript 0.24 timing.cyclicScopes test frame (not a story).
// Two dots share one 2s loop. Lead's cycle is phased by 1s, so it starts
// mid-swing and crosses the scene seam without a split segment. The lamp
// blinks four times from 1s, then stays on its last cycle's final state.
scene "cyclic-scopes" {
  version "0.2";
  viewport (640, 360);
  background #0f172a;
  duration 6s;
};
timing swing { period 2s; };
timing lead { offset 1s; period 2s; };
timing blink { offset 1s; period 500ms; repeat 4; };
circle Lead { radius 20; fill #38bdf8; position (120, 120); };
circle Trail { radius 20; fill #a78bfa; position (120, 200); };
rectangle Lamp { size (40, 40); fill #facc15; position (540, 280); visible false; };
keyframes Lead.position.x {
  timing lead;
  fill forwards;
  at 0s 120 ease easeInOut;
  at 1s 520 ease easeInOut;
  at 2s 120;
};
keyframes Trail.position.x {
  timing swing;
  fill forwards;
  at 0s 120 ease easeInOut;
  at 1s 520 ease easeInOut;
  at 2s 120;
};
step Lamp.visible { at 0ms; value true; timing blink; };
step Lamp.visible { at 250ms; value false; timing blink; };
seal 2s;
complete;
