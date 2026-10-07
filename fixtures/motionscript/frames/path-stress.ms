scene "path-stress" {
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
path evenodd {
  position (120, 140);
  fillRule evenodd;
  fill #c084fc;
  stroke #faf5ff width 3;
  move (0, 0);
  line (220, 0);
  line (220, 160);
  line (0, 160);
  close;
  move (50, 40);
  line (170, 40);
  line (170, 120);
  line (50, 120);
  close;
};
path nonzero {
  position (480, 140);
  fillRule nonzero;
  fill #c084fc;
  stroke #faf5ff width 3;
  move (0, 0);
  line (220, 0);
  line (220, 160);
  line (0, 160);
  close;
  move (50, 40);
  line (170, 40);
  line (170, 120);
  line (50, 120);
  close;
};
path cubic {
  position (120, 460);
  stroke #38bdf8 width 6;
  move (0, 80);
  cubic (80, -40) (160, 200) (240, 80);
  cubic (320, -40) (400, 200) (480, 80);
};
path quadratic {
  position (720, 460);
  stroke #f9a8d4 width 6;
  move (0, 80);
  quadratic (80, 0) (160, 80);
  quadratic (240, 160) (320, 80);
};
complete;
