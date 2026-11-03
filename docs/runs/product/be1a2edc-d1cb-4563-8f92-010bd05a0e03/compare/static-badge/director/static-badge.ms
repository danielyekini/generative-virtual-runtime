scene "static-circle-label" {
  version "0.2";
  viewport (200, 200);
  background #101014;
  duration 2s;
};

circle badge {
  radius 40;
  fill #ffffff;
  position (100, 100);
};

text label {
  content "OK";
  fontSize 16;
  align center;
  baseline middle;
  fill #ffffff;
  position (100, 160);
};

complete;