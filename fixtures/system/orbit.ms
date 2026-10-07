scene "orbit" {
  version "0.1";
  viewport (1280, 720);
  background #10141c;
  duration 4s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
group wheel {
  position (640, 360);
  circle sun { radius 40; fill #f59e0b; };
  circle planet { position (210, 0); radius 18; fill #38bdf8; };
};
animate wheel.rotation {
  from 0deg;
  to 360deg;
  duration 4s;
};
complete;
