scene "hierarchy-transform" {
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
rectangle neighbor {
  position (80, 80);
  size (120, 70);
  fill #fb923c;
};
rectangle pivoted {
  position (560, 310);
  pivot (80, 50);
  rotation 30deg;
  scale (1.4, 0.7);
  size (160, 100);
  fill #3b82f6;
  stroke #eff6ff width 4;
};
circle pivot {
  position (640, 360);
  radius 7;
  fill #facc15;
};
complete;
