scene "tide" {
  version "0.1";
  viewport (1280, 720);
  background #161410;
  duration 4s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
rectangle barA {
  position (470, 270);
  size (80, 180);
  fill #a3e635;
};
rectangle barB {
  position (600, 270);
  size (80, 180);
  fill #38bdf8;
};
rectangle barC {
  position (730, 270);
  size (80, 180);
  fill #f59e0b;
};
animate barA.position.y {
  expression "270 + sin(local_t * PI / 2) * 80";
  duration 4s;
};
animate barB.position.y {
  expression "270 + sin(local_t * PI / 2 + 2.094395) * 80";
  duration 4s;
};
animate barC.position.y {
  expression "270 + sin(local_t * PI / 2 + 4.18879) * 80";
  duration 4s;
};
complete;
