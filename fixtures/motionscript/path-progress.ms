scene "Path progress" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 6s;
  requires "geometry.pathProgress";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "geometry.pathMorph";
};

// An arrow rides the drawing tip of a growing stroke. The attachment says
// "place Tip at progress 1 of Rail and point along its tangent"; there is no
// arc-length arithmetic, and no baked position keys. As trim.end grows the tip
// follows the visible end on its own.
path Rail {
  stroke #38bdf8 width 4;
  move (60, 90);
  cubic (200, 10) (320, 170) (460, 90);
  cubic (520, 60) (560, 80) (600, 120);
};
operators Rail { trim 0, 0.02, 0; };
polygon Tip {
  points ((-12, -8), (14, 0), (-12, 8));
  fill #fbbf24;
};
attach Tip along Rail {
  progress 1;
  orient true;
};
animate Rail.trim.end {
  from 0.02;
  to 1;
  duration 4s;
};

// A wheel rolls along a track that bends while it travels. orient is left off
// and rollRadius is explicit: rolling is distance / radius, a separate choice
// from pointing along the tangent. Morphing the track moves the wheel's contact
// without touching its progress.
path Track {
  stroke #475569 width 3;
  move (40, 300);
  cubic (160, 300) (240, 300) (360, 300);
  line (600, 300);
};
group Wheel {
  circle Rim {
    radius 16;
    stroke #f8fafc width 3;
  };
  rectangle Spoke {
    position (-1.5, -16);
    size (3, 16);
    fill #f87171;
  };
};
attach Wheel along Track {
  progress 0;
  rollRadius 16;
};
animate Wheel.path.progress {
  from 0;
  to 1;
  duration 6s;
};
keyframes Track.commands {
  duration 6s;
  0% path { move (40, 300); cubic (160, 300) (240, 300) (360, 300); line (600, 300); };
  100% path { move (40, 300); cubic (160, 230) (240, 370) (360, 300); line (600, 250); };
};

complete;
