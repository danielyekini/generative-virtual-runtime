scene "Clip mask" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 4s;
  requires "compositing.mask";
  requires "compositing.isolatedOpacity";
};

// A bright panel is clipped to a circular window. The window shape is hidden;
// only the clipped content shows. Drag your eye across the edges: the square
// panel never paints outside the circle.
group Card {
  position (220, 90);
  clip Window;
  rectangle Panel {
    size (200, 180);
    fill #38bdf8;
  };
  rectangle Stripe {
    position (0, 70);
    size (200, 40);
    fill #fbbf24;
  };
  text Title {
    position (100, 40);
    content "CLIP";
    fontSize 28;
    align center;
    fill #0b1220;
  };
};

circle Window {
  position (320, 180);
  radius 88;
  visible false;
  fill #000000;
};

// Unclipped reference square so the human can compare clipped vs raw paint.
rectangle Raw {
  position (40, 40);
  size (80, 80);
  fill #64748b;
};

animate Card.rotation {
  from 0deg;
  to 20deg;
  duration 4s;
};

complete;
