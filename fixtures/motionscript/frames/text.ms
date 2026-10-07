scene "text" {
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
line leftX {
  position (160, 220);
  from (-18, 0);
  to (18, 0);
  stroke #facc15 width 2;
};
line leftY {
  position (160, 220);
  from (0, -18);
  to (0, 18);
  stroke #facc15 width 2;
};
line middleX {
  position (640, 360);
  from (-18, 0);
  to (18, 0);
  stroke #facc15 width 2;
};
line middleY {
  position (640, 360);
  from (0, -18);
  to (0, 18);
  stroke #facc15 width 2;
};
line rightX {
  position (1120, 520);
  from (-18, 0);
  to (18, 0);
  stroke #facc15 width 2;
};
line rightY {
  position (1120, 520);
  from (0, -18);
  to (0, 18);
  stroke #facc15 width 2;
};
text left {
  position (160, 220);
  content "Left";
  fontFamily "sans";
  fontSize 72;
  fontWeight 700;
  align left;
  baseline alphabetic;
  fill #f8fafc;
};
text middle {
  position (640, 360);
  content "Middle";
  fontFamily "sans";
  fontSize 72;
  fontWeight 700;
  align center;
  baseline middle;
  fill #fde68a;
};
text right {
  position (1120, 520);
  content "Right";
  fontFamily "sans";
  fontSize 48;
  fontWeight 700;
  align right;
  baseline bottom;
  fill #a5f3fc;
};
complete;
