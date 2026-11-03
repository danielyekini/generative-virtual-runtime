scene "trim-path-animation" {
  version "0.2";
  viewport (800, 600);
  background #101014;
  duration 2s;
  requires "geometry.trimPath";
};

path rail {
  move (100, 100);
  line (200, 200);
  line (300, 100);
  stroke #ff0000 width 4;
};

operators rail {
  trim 0, 0, 0;
};

animate rail.trim.end {
  from 0;
  to 1;
  duration 1500ms;
};

seal 1900ms;

complete;