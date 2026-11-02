scene "spatial-echo" {
  version "0.2";
  viewport (640, 360);
  background #2a1840;
  duration 1s;
  requires "space.planar25d";
};
polygon WallL {
  points ((0, 0), (300, 180), (0, 360));
  fill #c98a55;
};
polygon WallR {
  points ((640, 0), (340, 180), (640, 360));
  fill #b5774a;
};
text W0 {
  position (320, 220);
  content "ECHO";
  fontFamily "sans-serif";
  fontSize 64;
  fontWeight 800;
  fill #fff4dc;
  align center;
};
text W1 {
  position (320, 220);
  content "ECHO";
  fontFamily "sans-serif";
  fontSize 64;
  fontWeight 800;
  fill #e8e4f4;
  opacity 0.75;
  align center;
};
text W2 {
  position (320, 220);
  content "ECHO";
  fontFamily "sans-serif";
  fontSize 64;
  fontWeight 800;
  fill #d0d8f4;
  opacity 0.52;
  align center;
};
text W3 {
  position (320, 220);
  content "ECHO";
  fontFamily "sans-serif";
  fontSize 64;
  fontWeight 800;
  fill #b8d0f0;
  opacity 0.34;
  align center;
};
text W4 {
  position (320, 220);
  content "ECHO";
  fontFamily "sans-serif";
  fontSize 64;
  fontWeight 800;
  fill #a8c8ec;
  opacity 0.2;
  align center;
};
spatialLayer echo {
  camera {
    projection perspective;
    focalLength 1000;
  };
  surface W0 {
    position (0, 0, 0);
  };
  surface W1 {
    position (-110, -40, 333);
  };
  surface W2 {
    position (90, -80, 818);
  };
  surface W3 {
    position (-60, -120, 1632);
  };
  surface W4 {
    position (30, -160, 3000);
  };
};
complete;
