scene "spatial-crane" {
  version "0.2";
  viewport (640, 360);
  background #d9d4cc;
  duration 1s;
  requires "space.planar25d";
};
polygon Base {
  points ((220, 80), (420, 80), (420, 280));
  fill #fff8e6;
  stroke #c8b890 width 1;
};
polygon Flap {
  points ((220, 80), (420, 280), (220, 280));
  fill #fff8e6;
  stroke #c8b890 width 1;
};
circle Mark {
  position (232, 268);
  radius 5;
  fill #c8902a;
};
spatialLayer crane {
  camera {
    projection perspective;
    position (88, 523, -910);
    yaw 0.25;
    pitch 0.35;
    focalLength 1000;
  };
  surface Base {
    backFill #5973b3;
  };
  surface Flap {
    parent Base;
    hinge (220, 80) (420, 280) -45deg;
    backFill #5973b3;
  };
  surface Mark {
    parent Flap;
    backface hidden;
  };
};
complete;
