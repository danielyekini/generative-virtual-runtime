scene "drag-zoom" {
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
  content "Drag the knob · scroll / Ctrl-scroll to scale";
  fontFamily "sans";
  fontSize 28;
  fontWeight 600;
  align center;
  baseline middle;
  position (640, 80);
  fill #94a3b8;
};
rectangle Pad {
  position (160, 160);
  size (960, 480);
  cornerRadius 16;
  fill #0f172a;
};
circle Knob {
  position (640, 400);
  radius 36;
  fill #38bdf8;
};
interact Knob {
  focusable true;
  tabIndex 0;
  on drag dragTranslate (196, 196) (1084, 604);
  on wheel step scale.x 0.25 0.5 2.5;
  on wheel step scale.y 0.25 0.5 2.5;
};
complete;
