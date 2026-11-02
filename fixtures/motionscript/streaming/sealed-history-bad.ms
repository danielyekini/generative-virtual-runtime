scene "stream-backdate" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 3s;
};

rectangle box {
  size (10, 10);
  fill #ff0000;
  position (0, 0);
};

animate box.opacity {
  from 1;
  to 1;
  duration 1s;
};

seal 2s;

animate box.position.x {
  from 0;
  to 10;
  start 1s;
  duration 1s;
};

complete;
