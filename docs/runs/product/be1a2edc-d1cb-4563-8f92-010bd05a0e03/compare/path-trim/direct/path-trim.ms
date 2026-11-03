scene "trim-path-demo" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 2s;
  requires "geometry.trimPath";
};

path rail {
  move (50, 50);
  line (250, 50);
  line (250, 150);
  line (50, 150);
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

seal 1s;

complete;