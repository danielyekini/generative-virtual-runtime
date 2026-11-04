scene "loading-orbit-ring" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 8s;
  requires "timing.cyclicScopes";
};

timing spin { period 2s; };

circle track {
  radius 36;
  fill #00000000;
  stroke #263238 width 2;
  position (160, 90);
};

circle bead {
  radius 8;
  fill #81c784;
  position (196, 90);
};

keyframes bead.position.x {
  timing spin;
  fill forwards;
  at 0s 196 ease easeInOut;
  at 0.5s 160 ease easeInOut;
  at 1s 124 ease easeInOut;
  at 1.5s 160 ease easeInOut;
  at 2s 196;
};

keyframes bead.position.y {
  timing spin;
  fill forwards;
  at 0s 90 ease easeInOut;
  at 0.5s 54 ease easeInOut;
  at 1s 90 ease easeInOut;
  at 1.5s 126 ease easeInOut;
  at 2s 90;
};

seal 2s;
complete;
