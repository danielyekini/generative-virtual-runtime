scene "loading-sweep-bar" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 8s;
  requires "timing.cyclicScopes";
};

timing sweep { period 1.5s; };

rectangle rail {
  size (160, 6);
  fill #263238;
  position (160, 90);
  pivot (0.5, 0.5);
};

rectangle traveller {
  size (36, 6);
  fill #ffb74d;
  position (100, 90);
  pivot (0.5, 0.5);
};

keyframes traveller.position.x {
  timing sweep;
  fill forwards;
  at 0s 100 ease easeInOut;
  at 0.75s 220 ease easeInOut;
  at 1.5s 100;
};

seal 1.5s;
complete;
