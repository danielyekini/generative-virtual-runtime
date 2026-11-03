// MotionScript 0.23 timing.timedKeys: timed keys and named beats.
// Beats are compile-time times; tracks are written per beat with fill forwards
// instead of full-length percentage tracks.
scene "timed-keys" {
  version "0.2";
  viewport (640, 360);
  background #0f172a;
  duration 6s;
};
beat intro at 0s;
beat cross at intro + 1.5s;
beat settle at cross + 2s;
beat outro at settle + 1.5s;
circle Ball { radius 24; fill #38bdf8; position (80, 180); };
text Caption { content "Cross"; fontSize 28; fill #f8fafc; position (320, 300); align center; opacity 0; };
keyframes Ball.position.x {
  fill forwards;
  at intro 80 ease easeInOut;
  at cross 320 ease easeOut;
  at settle - 0.5s 540;
};
animate Caption.opacity { from 0; to 1; start cross; duration 400ms; fill forwards; };
seal settle;
keyframes Ball.scale {
  fill forwards;
  at settle (1, 1) ease easeIn;
  at settle + 0.25s (1.3, 0.8) ease easeOut;
  at outro (1, 1);
};
step Caption.visible { at outro; value false; };
complete;
