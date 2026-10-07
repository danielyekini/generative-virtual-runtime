scene "primitive-gallery" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 1s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
rectangle rectangle {
  position (80, 80);
  size (200, 120);
  fill #e23d3d;
  stroke #1d4ed8 width 8;
};
circle circle {
  position (460, 160);
  radius 70;
  fill #38bdf8;
  stroke #0f172a width 6;
};
ellipse ellipse {
  position (760, 160);
  size (180, 100);
  fill #a3e635;
  stroke #365314 width 6;
};
line line {
  position (80, 340);
  from (0, 0);
  to (280, 80);
  stroke #f8fafc width 6;
};
polygon polygon {
  position (480, 300);
  points ((0, 120), (140, 0), (220, 140));
  fill #f59e0b;
  stroke #7c2d12 width 4;
};
path path {
  position (860, 320);
  fill #c084fc;
  stroke #3b0764 width 4;
  move (0, 40);
  line (120, 40);
  line (120, 120);
  line (0, 120);
  close;
  move (20, 40);
  quadratic (60, -20) (100, 40);
};
text caption {
  position (80, 560);
  content "Hello";
  fontFamily "sans";
  fontSize 64;
  fontWeight 700;
  fill #f8fafc;
};
complete;
