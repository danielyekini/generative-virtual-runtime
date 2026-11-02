scene "falling-cyan-rectangle" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 3s;
};

rectangle cyanBox {
  size (24, 24);
  fill #00bcd4;
  position (40, 20);
  opacity 1;
};

animate cyanBox.position.y {
  from 20;
  to 120;
  duration 1s;
  ease easeIn;
};

seal 1s;

animate cyanBox.opacity {
  from 1;
  to 0.4;
  start 1s;
  duration 1s;
};

seal 2s;

complete;