scene "keys-focus" {
  version "0.2";
  viewport (1280, 720);
  background #101014;
  duration 8s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
text title {
  content "Tab between pads · arrows nudge · Enter toggles glow";
  fontFamily "sans";
  fontSize 28;
  fontWeight 600;
  align center;
  baseline middle;
  position (640, 80);
  fill #94a3b8;
};
rectangle Left {
  position (280, 260);
  size (200, 200);
  cornerRadius 20;
  fill #334155;
};
rectangle Mid {
  position (540, 260);
  size (200, 200);
  cornerRadius 20;
  fill #334155;
};
rectangle Right {
  position (800, 260);
  size (200, 200);
  cornerRadius 20;
  fill #334155;
};
rectangle Glow {
  position (540, 520);
  size (200, 40);
  cornerRadius 12;
  fill #a78bfa;
  opacity 0.25;
};
interact Left {
  focusable true;
  tabIndex 0;
  on key "ArrowLeft" step position.x -20 200 1000;
  on key "ArrowRight" step position.x 20 200 1000;
  on click toggle Glow.opacity 1 0.25;
};
interact Mid {
  focusable true;
  tabIndex 1;
  on key "ArrowUp" step position.y -20 160 500;
  on key "ArrowDown" step position.y 20 160 500;
  on click toggle Glow.opacity 1 0.25;
};
interact Right {
  focusable true;
  tabIndex 2;
  on key "ArrowLeft" step position.x -20 200 1000;
  on key "ArrowRight" step position.x 20 200 1000;
  on click toggle Glow.opacity 1 0.25;
};
complete;
