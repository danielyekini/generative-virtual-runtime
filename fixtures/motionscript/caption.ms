scene "moving-caption" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 3s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
text title {
  content "Hello";
  fontFamily "sans";
  fontSize 96;
  fontWeight 700;
  align center;
  baseline middle;
  position (640, 520);
  fill #f8fafc;
};
animate title.position.y {
  from 520;
  to 180;
  duration 3s;
  ease easeOut;
};
animate title.opacity {
  from 0;
  to 1;
  duration 1s;
};
complete;
