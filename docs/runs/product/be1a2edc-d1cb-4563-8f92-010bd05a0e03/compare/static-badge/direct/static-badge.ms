scene "simple-circle" {
  version "0.2";
  viewport (200, 200);
  background #000000;
  duration 2s;
};

ellipse badge {
  size (50, 50);
  fill #ffffff;
  position (100, 100);
};

text label {
  content "OK";
  fontSize 20;
  align center;
  baseline middle;
  fill #ffffff;
  position (100, 150);
};

complete;