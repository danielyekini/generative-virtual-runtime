scene "path-trim" {
  version "0.2";
  viewport (320, 180);
  background #101014;
  duration 3s;
  requires "geometry.trimPath";
};

path rail {
  move (20, 90);
  line (100, 30);
  line (180, 90);
  line (220, 50);
  stroke #ffab40 width 4;
};

operators rail {
  trim 0, 0, 0;
};

animate rail.trim.end {
  from 0;
  to 1;
  duration 1500ms;
  ease easeInOut;
};

seal 1500ms;

complete;
