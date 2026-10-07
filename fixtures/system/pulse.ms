scene "pulse" {
  version "0.1";
  viewport (1280, 720);
  background #14161c;
  duration 3s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
group mark {
  position (640, 360);
  circle hub { radius 18; fill #f8fafc; };
  circle a { position (0, -110); radius 26; fill #a3e635; };
  circle b { position (95, 55); radius 26; fill #38bdf8; };
  circle c { position (-95, 55); radius 26; fill #f59e0b; };
};
animate mark.rotation {
  from 0deg;
  to 360deg;
  duration 3s;
};
animate mark.scale.x {
  expression "1 + 0.06 * sin(local_t * 2 * PI / 3)";
  duration 3s;
};
animate mark.scale.y {
  expression "1 + 0.06 * sin(local_t * 2 * PI / 3)";
  duration 3s;
};
complete;
