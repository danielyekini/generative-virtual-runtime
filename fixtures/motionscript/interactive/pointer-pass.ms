scene "pointer-pass" {
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
  content "Glass ignores the pointer · click the button beneath";
  fontFamily "sans";
  fontSize 28;
  fontWeight 600;
  align center;
  baseline middle;
  position (640, 80);
  fill #94a3b8;
};
rectangle Button {
  position (490, 300);
  size (300, 120);
  cornerRadius 24;
  fill #2563eb;
};
text ButtonLabel {
  content "Toggle lamp";
  fontFamily "sans";
  fontSize 32;
  fontWeight 700;
  align center;
  baseline middle;
  position (640, 360);
  fill #f8fafc;
};
rectangle Glass {
  position (450, 260);
  size (380, 200);
  cornerRadius 28;
  fill #e2e8f0;
  opacity 0.35;
};
rectangle Lamp {
  position (940, 320);
  size (100, 100);
  cornerRadius 20;
  fill #fbbf24;
  opacity 0.2;
};
interact Button {
  focusable true;
  tabIndex 0;
  on click toggle Lamp.opacity 1 0.2;
};
interact Glass {
  pointer none;
};
interact ButtonLabel {
  pointer none;
};
complete;
