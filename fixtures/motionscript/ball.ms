scene "bouncing-ball" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 4s;
};
const AMP = 160;
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
line ground {
  from (80, 560);
  to (1200, 560);
  stroke #334155 width 4;
};
circle ball {
  position (140, 524);
  radius 36;
  fill #38bdf8;
};
batch {
  animate ball.position.x {
    from 140;
    to 1100;
    duration 4s;
    ease easeInOut;
  };
  animate ball.position.y {
    expression "524 - abs(sin(local_t * 3 * PI)) * AMP";
    duration 4s;
  };
};
complete;
