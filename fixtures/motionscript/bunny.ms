scene "bunny-demo" {
  version "0.1";
  viewport (1280, 720);
  background #101014;
  duration 6s;
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
group bunny {
  position (180, 500);
  ellipse body {
    size (110, 80);
    fill #f5f5f5;
  };
  circle head {
    position (55, -55);
    radius 42;
    fill #ffffff;
  };
  ellipse ear {
    position (55, -105);
    size (18, 60);
    fill #ffffff;
  };
};
rectangle chocolate {
  position (970, 475);
  size (60, 50);
  fill #6b3f24;
};
batch {
  animate bunny.position.x {
    from 180;
    to 900;
    start 0s;
    duration 5s;
    ease easeInOut;
  };
  animate bunny.position.y {
    expression "500 - abs(sin(local_t * 4 * PI)) * 90";
    start 0s;
    duration 5s;
  };
};
seal 2s;
animate camera(main).zoom {
  from 1;
  to 1.25;
  start 2s;
  duration 3s;
  ease easeInOut;
};
complete;
