scene "Spatial seams" {
  version "0.2";
  viewport (640, 360);
  background #f4f1ea;
  duration 2s;
  requires "space.planar25d";
  requires "space.planarSeams";
};

// Two panels cross through each other: with seams they split along their
// plane intersection, so each half shows the nearer panel.
rectangle Red { position (80, 110); size (200, 140); fill #d64545; };
rectangle Blue { position (80, 110); size (200, 140); fill #3d6bd6; };

// A card folds about a declared hinge seam on its base's right edge.
rectangle Base { position (360, 110); size (120, 140); fill #e8c872; };
rectangle Flap { position (480, 110); size (90, 140); fill #7fb37f; };

// Counterexample: Drift folds about the same kind of hinge, but its position
// is animated off the crease. It still looks continuous at first glance; the
// declared seam reports SPATIAL_SEAM_OPEN once the edges no longer coincide.
rectangle Under { position (360, 270); size (120, 60); fill #c9b8e8; };
rectangle Drift { position (480, 270); size (90, 60); fill #8a72c4; };
animate Drift.position.x {
  from 480;
  to 492;
  duration 2s;
};

spatialLayer stage {
  camera {
    projection perspective;
    position (37.8, 50.6, -944.6);
    yaw 0.3;
    pitch -0.15;
  };
  surface Red {
    pivot (180, 180, 0);
    rotation (0, 0.6, 0);
  };
  surface Blue {
    pivot (180, 180, 0);
    rotation (0, -0.6, 0);
  };
  surface Base { };
  surface Flap {
    parent Base;
    hinge (480, 110) (480, 250) -0.9;
  };
  surface Under { };
  surface Drift {
    parent Under;
    hinge (480, 270) (480, 330) -0.9;
  };
  seams {
    split true;
    epsilon 0.001;
    maxFragments 16;
    edge Base Flap;
    edge Under Drift;
  };
};

complete;
