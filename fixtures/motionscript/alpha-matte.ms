scene "Alpha matte" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 4s;
  requires "compositing.matte";
  requires "compositing.isolatedOpacity";
};

// The card is kept only where Window paints. Window is two circles plus a
// word, hidden from the main picture. Its opacity fades, so the reveal fades
// with the ink. A clip outline cannot do that.
group Card {
  position (180, 90);
  matte Window;
  rectangle Panel {
    size (280, 180);
    fill #38bdf8;
  };
  rectangle Stripe {
    position (0, 70);
    size (280, 40);
    fill #fbbf24;
  };
  text Title {
    position (140, 40);
    content "MATTE";
    fontSize 28;
    align center;
    fill #0b1220;
  };
};

group Window {
  position (180, 90);
  visible false;
  circle Left {
    position (70, 90);
    radius 54;
    fill #ffffff;
  };
  circle Right {
    position (210, 90);
    radius 54;
    fill #ffffff;
  };
  text Word {
    position (140, 96);
    content "GO";
    fontSize 42;
    align center;
    baseline middle;
    fill #ffffff;
  };
};

animate Window.opacity {
  from 1;
  to 0.35;
  duration 4s;
};

complete;
