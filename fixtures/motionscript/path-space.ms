scene "Path space" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 4s;
  requires "geometry.pathProgress";
  requires "geometry.pathSpace";
};

// The traveller is not a child of Wagon. Wagon moves and the rail rotates.
// attach follows the stroke anyway; there is no extra identity parent and no
// baked position track.
group Wagon {
  position (80, 220);
  path Rail {
    stroke #38bdf8 width 4;
    move (0, 0);
    line (220, 0);
    line (300, 70);
  };
};
polygon Tip {
  points ((-12, -8), (14, 0), (-12, 8));
  fill #fbbf24;
};
attach Tip along Wagon.Rail {
  progress 0.72;
  orient true;
};
animate Wagon.position.y {
  from 220;
  to 80;
  duration 4s;
};
animate Wagon.Rail.rotation {
  from 0deg;
  to 35deg;
  duration 4s;
};
complete;
