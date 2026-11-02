scene "animated-solid-paint" {
  version "0.2";
  viewport (200, 200);
  background #101014;
  duration 1s;
  requires "paint.animatedSolid";
};
circle Dot {
  position (100, 100);
  radius 24;
  fill #ff4040;
  stroke #40ff40 width 3;
};
text Label {
  position (100, 160);
  content "paint";
  fontFamily "sans";
  fontSize 16;
  fill #ffffff;
};
keyframes Dot.fill.r {
  start 0ms;
  duration 1000ms;
  0% 1;
  100% 0.2;
};
keyframes Dot.fill.a {
  start 0ms;
  duration 1000ms;
  0% 1;
  100% 0.5;
};
keyframes Dot.stroke.width {
  start 0ms;
  duration 1000ms;
  0% 3;
  100% 10;
};
keyframes Label.fill.b {
  start 0ms;
  duration 1000ms;
  0% 1;
  100% 0;
};
complete;
