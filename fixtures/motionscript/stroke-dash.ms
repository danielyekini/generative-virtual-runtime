scene "Stroke dash" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 2s;
  requires "paint.strokeDash";
};
line Wire {
  from (80, 180);
  to (560, 180);
  stroke #f8fafc width 6 dash (18, 10);
};
keyframes Wire.stroke.phase {
  start 0ms;
  duration 2s;
  0% 0;
  100% 28;
};
complete;
