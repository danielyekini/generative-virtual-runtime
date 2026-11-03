scene "click-toggle" {
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
  content "Click the switch · Enter / Space with focus";
  fontFamily "sans";
  fontSize 28;
  fontWeight 600;
  align center;
  baseline middle;
  position (640, 80);
  fill #94a3b8;
};
group Switch {
  position (520, 300);
  rectangle Track {
    size (240, 120);
    cornerRadius 24;
    fill #1e293b;
  };
  rectangle Thumb {
    position (20, 20);
    size (80, 80);
    cornerRadius 16;
    fill #64748b;
  };
};
rectangle Lamp {
  position (900, 320);
  size (100, 100);
  cornerRadius 20;
  fill #fbbf24;
  opacity 0.2;
};
interact Switch {
  focusable true;
  tabIndex 0;
  on click toggle Lamp.opacity 1 0.2;
};
complete;
