scene "Dynamic text" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 6s;
  requires "text.dynamicContent";
};

// One price chip formats a live number. Authors state fractionDigits and a
// prefix; the runtime derives the display string — no N static content nodes.
text Price {
  position (320, 140);
  content "0.00";
  fontSize 48;
  fill #22c55e;
  align center;
  number 10;
  fractionDigits 2;
  group ",";
  prefix "$";
};
animate Price.number {
  from 10;
  to 1284.5;
  duration 5s;
};

// Discrete label updates swap a single text node's content over time.
text Status {
  position (320, 220);
  content "Ready";
  fontSize 22;
  fill #94a3b8;
  align center;
};
step Status.content { at 1s; value "Counting"; };
step Status.content { at 5s; value "Done"; };

complete;
