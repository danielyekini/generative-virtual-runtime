scene "loading-pulse-dot" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 8s;
  requires "timing.cyclicScopes";
};

timing pulse { period 1.2s; };

circle hub {
  radius 18;
  fill #4fc3f7;
  position (160, 90);
  opacity 0.35;
};

keyframes hub.opacity {
  timing pulse;
  fill forwards;
  at 0s 0.35 ease easeInOut;
  at 0.6s 1 ease easeInOut;
  at 1.2s 0.35;
};

keyframes hub.scale.x {
  timing pulse;
  fill forwards;
  at 0s 0.85 ease easeInOut;
  at 0.6s 1.15 ease easeInOut;
  at 1.2s 0.85;
};

keyframes hub.scale.y {
  timing pulse;
  fill forwards;
  at 0s 0.85 ease easeInOut;
  at 0.6s 1.15 ease easeInOut;
  at 1.2s 0.85;
};

seal 1.2s;
complete;
