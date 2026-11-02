scene "stream-offline" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 2s;
};

rectangle box {
  size (16, 16);
  fill #ffaa00;
  position (10, 10);
};

animate box.position.x {
  from 10;
  to 80;
  duration 2s;
};

complete;
