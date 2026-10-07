scene "z-order" {
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
rectangle red {
  position (200, 200);
  size (180, 180);
  zIndex 0;
  fill #ef4444;
};
rectangle blue {
  position (240, 240);
  size (180, 180);
  zIndex 1;
  fill #3b82f6;
};
rectangle green {
  position (280, 280);
  size (180, 180);
  zIndex 2;
  fill #22c55e;
};
complete;
