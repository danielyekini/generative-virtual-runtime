scene "nested-rotation" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 4s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
group wheel {
  position (640, 360);
  rectangle spoke {
    position (0, -18);
    size (220, 36);
    pivot (0, 18);
    fill #a3e635;
  };
  circle hub {
    radius 28;
    fill #f8fafc;
  };
};
animate wheel.rotation {
  from 0deg;
  to 360deg;
  duration 4s;
};
animate wheel.spoke.rotation {
  from 0deg;
  to -180deg;
  duration 4s;
};
complete;
