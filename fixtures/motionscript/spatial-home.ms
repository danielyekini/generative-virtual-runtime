scene "spatial-home" {
  version "0.2";
  viewport (640, 360);
  background #f4f1ea;
  duration 1s;
  requires "space.planar25d";
};
rectangle Floor {
  position (220, 100);
  size (200, 200);
  fill #e0d6c0;
  stroke #8a7a5a width 2;
};
rectangle Front {
  position (220, 100);
  size (200, 160);
  fill #d8c8a8;
  stroke #5a4a30 width 2;
};
rectangle Door {
  position (290, 180);
  size (60, 80);
  fill #6b4a2b;
};
rectangle Back {
  position (220, 100);
  size (200, 160);
  fill #b0a080;
  stroke #5a4a30 width 2;
};
rectangle Left {
  position (220, 100);
  size (200, 160);
  fill #c0b090;
  stroke #5a4a30 width 2;
};
spatialLayer home {
  camera {
    projection perspective;
    position (140, -552, -392);
    yaw 0.35;
    pitch -0.95;
    focalLength 1000;
  };
  surface Floor {
    hinge (220, 260) (420, 260) 90deg;
    position (0, 160, 0);
  };
  surface Front {
    backFill #5973b3;
  };
  surface Door {
    parent Front;
    hinge (290, 180) (290, 260) 0;
    backFill #4d331a;
  };
  surface Back {
    position (0, 0, 200);
  };
  surface Left {
    hinge (220, 100) (220, 260) -90deg;
  };
};
complete;
