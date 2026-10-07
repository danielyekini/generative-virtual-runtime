scene "camera-mapping" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 1s;
};
camera main {
  position (500, 300);
  zoom 2;
  rotation 0deg;
};
circle marker {
  position (700, 300);
  radius 10;
  fill #ffffff;
};
circle ring {
  space screen;
  position (1040, 360);
  radius 22;
  stroke #22d3ee width 3;
};
text label {
  space screen;
  position (1080, 368);
  content "1040, 360";
  fontFamily "sans";
  fontSize 28;
  fontWeight 600;
  fill #e2e8f0;
};
complete;
