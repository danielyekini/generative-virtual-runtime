scene "falling-rectangle" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 3s;
};

rectangle rect1 {
  size (24, 24);
  fill #4fc3f7;
  position (148, 20);
  opacity 1;
};

animate rect1.position.y {
  from 20;
  to 160;
  duration 2s;
  ease easeIn;
};

seal 1s;

animate rect1.opacity {
  from 1;
  to 0.5;
  start 1s;
  duration 1s;
};

seal 2s;

complete;