scene "static-badge" {
  version "0.2";
  viewport (200, 200);
  background #0b0b10;
  duration 2s;
};

circle badge {
  radius 32;
  fill #ffffff;
  position (100, 80);
};

text label {
  content "OK";
  position (100, 140);
  fontFamily "sans-serif";
  fontSize 18;
  align center;
  baseline middle;
  fill #cfd8dc;
};

complete;
