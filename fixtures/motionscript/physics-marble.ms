scene "physics-marble" {
  version "0.2";
  viewport (400, 300);
  background #eef2f7;
  duration 3s;
  requires "physics.planar2d";
};
circle Marble {
  position (120, 40);
  radius 14;
  fill #3366ff;
};
rectangle Floor {
  position (200, 280);
  size (360, 20);
  fill #4a5568;
};
rectangle Block {
  position (260, 200);
  size (40, 40);
  fill #dd6b20;
};
physics bowl {
  mode dynamic;
  gravity (0, 980);
  seed 1;
  body marble {
    entity Marble;
    kind dynamic;
    position (120, 40);
    mass 1;
    restitution 0.35;
    friction 0.2;
    collider circle 14;
  };
  body floor {
    entity Floor;
    kind static;
    position (200, 280);
    collider aabb 180 10;
  };
  body block {
    entity Block;
    kind dynamic;
    position (260, 200);
    mass 2;
    restitution 0.1;
    friction 0.5;
    collider aabb 20 20;
  };
};
complete;
