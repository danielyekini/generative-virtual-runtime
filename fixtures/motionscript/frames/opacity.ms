scene "opacity" {
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
rectangle solid {
  position (120, 220);
  size (220, 180);
  opacity 1;
  fill #e23d3d;
};
rectangle half {
  position (420, 220);
  size (220, 180);
  opacity 0.5;
  fill #e23d3d;
};
rectangle quarter {
  position (720, 220);
  size (220, 180);
  opacity 0.25;
  fill #e23d3d;
};
text solidLabel {
  position (200, 460);
  content "1";
  fontFamily "sans";
  fontSize 36;
  fontWeight 700;
  fill #f8fafc;
};
text halfLabel {
  position (500, 460);
  content "0.5";
  fontFamily "sans";
  fontSize 36;
  fontWeight 700;
  fill #f8fafc;
};
text quarterLabel {
  position (790, 460);
  content "0.25";
  fontFamily "sans";
  fontSize 36;
  fontWeight 700;
  fill #f8fafc;
};
complete;
