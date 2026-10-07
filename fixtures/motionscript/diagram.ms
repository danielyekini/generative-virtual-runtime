scene "diagram" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 4s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
line axisX {
  from (160, 520);
  to (1120, 520);
  stroke #94a3b8 width 3;
};
line axisY {
  from (200, 120);
  to (200, 560);
  stroke #94a3b8 width 3;
};
path curve {
  stroke #38bdf8 width 5;
  move (200, 520);
  quadratic (480, 520) (640, 200);
  quadratic (800, -120) (1080, 520);
};
circle sample {
  position (200, 520);
  radius 12;
  fill #f59e0b;
};
text label {
  content "curve";
  fontFamily "sans";
  fontSize 32;
  fill #e7e7ea;
  position (640, 80);
  align center;
};
// Same two quadratics as the path. Each half of the timeline is one curve.
animate sample.position.x {
  expression "pow(1 - clamp(local_t / 2, 0, 1), 2) * 200 + 2 * (1 - clamp(local_t / 2, 0, 1)) * clamp(local_t / 2, 0, 1) * 480 + pow(clamp(local_t / 2, 0, 1), 2) * 640 + pow(1 - clamp(local_t / 2 - 1, 0, 1), 2) * 640 + 2 * (1 - clamp(local_t / 2 - 1, 0, 1)) * clamp(local_t / 2 - 1, 0, 1) * 800 + pow(clamp(local_t / 2 - 1, 0, 1), 2) * 1080 - 640";
  duration 4s;
};
animate sample.position.y {
  expression "pow(1 - clamp(local_t / 2, 0, 1), 2) * 520 + 2 * (1 - clamp(local_t / 2, 0, 1)) * clamp(local_t / 2, 0, 1) * 520 + pow(clamp(local_t / 2, 0, 1), 2) * 200 + pow(1 - clamp(local_t / 2 - 1, 0, 1), 2) * 200 + 2 * (1 - clamp(local_t / 2 - 1, 0, 1)) * clamp(local_t / 2 - 1, 0, 1) * -120 + pow(clamp(local_t / 2 - 1, 0, 1), 2) * 520 - 200";
  duration 4s;
};
complete;
