scene "camera-move" {
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
rectangle west {
  position (80, 280);
  size (220, 150);
  fill #ef4444;
};
rectangle mid {
  position (540, 240);
  size (220, 190);
  fill #3b82f6;
};
rectangle east {
  position (980, 300);
  size (200, 130);
  fill #22c55e;
};
text hud {
  space screen;
  content "pan";
  fontFamily "sans";
  fontSize 42;
  fill #f8fafc;
  position (48, 88);
};
animate camera(main).position.x {
  from 640;
  to 1000;
  duration 2s;
  ease easeInOut;
};
seal 2s;
animate camera(main).zoom {
  from 1;
  to 1.8;
  start 2s;
  duration 2s;
  ease easeInOut;
};
complete;
