// ADDING TWO VECTORS
// 30 seconds. Off-white sheet, equal scales, a = (3, 1) and b = (1, 2).
// 0:00 draw a, then b. 0:05 slide b onto the head of a. 0:10 draw a + b.
// 0:15 add the components. 0:20 reverse the order. 0:25 hold a + b = b + a.
scene "adding-two-vectors" {
  version "0.2";
  viewport (1280, 720);
  background #f6f3ec;
  duration 30s;
  requires "easing.hold";
  requires "geometry.operators";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "text.basic";
};
camera main {
  position (640, 360);
  zoom 1;
  rotation 0deg;
};
group plane {
  opacity 0;
  zIndex 1;
  line vertical0 { from (132, 552); to (132, 136); stroke #e0d9cc width 1.15; zIndex 0; };
  line vertical1 { from (236, 552); to (236, 136); stroke #e0d9cc width 1.15; zIndex 0; };
  line vertical2 { from (340, 552); to (340, 136); stroke #e0d9cc width 1.15; zIndex 0; };
  line vertical3 { from (444, 552); to (444, 136); stroke #e0d9cc width 1.15; zIndex 0; };
  line vertical4 { from (548, 552); to (548, 136); stroke #e0d9cc width 1.15; zIndex 0; };
  line vertical5 { from (652, 552); to (652, 136); stroke #e0d9cc width 1.15; zIndex 0; };
  line horizontal0 { from (132, 552); to (652, 552); stroke #e0d9cc width 1.15; zIndex 0; };
  line horizontal1 { from (132, 448); to (652, 448); stroke #e0d9cc width 1.15; zIndex 0; };
  line horizontal2 { from (132, 344); to (652, 344); stroke #e0d9cc width 1.15; zIndex 0; };
  line horizontal3 { from (132, 240); to (652, 240); stroke #e0d9cc width 1.15; zIndex 0; };
  line horizontal4 { from (132, 136); to (652, 136); stroke #e0d9cc width 1.15; zIndex 0; };
  line axisX { from (132, 552); to (652, 552); stroke #b7b0a3 width 1.8 cap butt; zIndex 1; };
  line axisY { from (132, 552); to (132, 136); stroke #b7b0a3 width 1.8 cap butt; zIndex 1; };
  text tickX1 { position (236, 580); content "1"; fontFamily "sans"; fontSize 16; fontWeight 500; align center; baseline alphabetic; fill #8a8478; zIndex 2; };
  text tickX2 { position (340, 580); content "2"; fontFamily "sans"; fontSize 16; fontWeight 500; align center; baseline alphabetic; fill #8a8478; zIndex 2; };
  text tickX3 { position (444, 580); content "3"; fontFamily "sans"; fontSize 16; fontWeight 500; align center; baseline alphabetic; fill #8a8478; zIndex 2; };
  text tickX4 { position (548, 580); content "4"; fontFamily "sans"; fontSize 16; fontWeight 500; align center; baseline alphabetic; fill #8a8478; zIndex 2; };
  text tickX5 { position (652, 580); content "5"; fontFamily "sans"; fontSize 16; fontWeight 500; align center; baseline alphabetic; fill #8a8478; zIndex 2; };
  text tickY1 { position (116, 448); content "1"; fontFamily "sans"; fontSize 16; fontWeight 500; align right; baseline middle; fill #8a8478; zIndex 2; };
  text tickY2 { position (116, 344); content "2"; fontFamily "sans"; fontSize 16; fontWeight 500; align right; baseline middle; fill #8a8478; zIndex 2; };
  text tickY3 { position (116, 240); content "3"; fontFamily "sans"; fontSize 16; fontWeight 500; align right; baseline middle; fill #8a8478; zIndex 2; };
  text tickY4 { position (116, 136); content "4"; fontFamily "sans"; fontSize 16; fontWeight 500; align right; baseline middle; fill #8a8478; zIndex 2; };
  text axisNameX { position (670, 552); content "x"; fontFamily "sans"; fontSize 18; fontStyle italic; fontWeight 500; align left; baseline middle; fill #8a8478; zIndex 2; };
  text axisNameY { position (132, 114); content "y"; fontFamily "sans"; fontSize 18; fontStyle italic; fontWeight 500; align center; baseline alphabetic; fill #8a8478; zIndex 2; };
  text originLabel { position (118, 580); content "O"; fontFamily "sans"; fontSize 22; fontWeight 600; align right; baseline alphabetic; fill #3c3c38; zIndex 3; };
  circle originDot { position (132, 552); radius 5; fill #3c3c38; stroke #f6f3ec width 3; zIndex 4; };
};
group guides {
  opacity 0;
  zIndex 4;
  path across {
    stroke #a39888 width 1.7 cap butt;
    zIndex 1;
    move (146, 240);
    line (153, 240);
    move (159, 240);
    line (166, 240);
    move (172, 240);
    line (179, 240);
    move (185, 240);
    line (192, 240);
    move (198, 240);
    line (205, 240);
    move (211, 240);
    line (218, 240);
    move (224, 240);
    line (231, 240);
    move (237, 240);
    line (244, 240);
    move (250, 240);
    line (257, 240);
    move (263, 240);
    line (270, 240);
    move (276, 240);
    line (283, 240);
    move (289, 240);
    line (296, 240);
    move (302, 240);
    line (309, 240);
    move (315, 240);
    line (322, 240);
    move (328, 240);
    line (335, 240);
    move (341, 240);
    line (348, 240);
    move (354, 240);
    line (361, 240);
    move (367, 240);
    line (374, 240);
    move (380, 240);
    line (387, 240);
    move (393, 240);
    line (400, 240);
    move (406, 240);
    line (413, 240);
    move (419, 240);
    line (426, 240);
    move (432, 240);
    line (439, 240);
    move (445, 240);
    line (452, 240);
    move (458, 240);
    line (465, 240);
    move (471, 240);
    line (478, 240);
    move (484, 240);
    line (491, 240);
    move (497, 240);
    line (504, 240);
    move (510, 240);
    line (517, 240);
    move (523, 240);
    line (530, 240);
  };
  path down {
    stroke #a39888 width 1.7 cap butt;
    zIndex 1;
    move (548, 538);
    line (548, 531);
    move (548, 525);
    line (548, 518);
    move (548, 512);
    line (548, 505);
    move (548, 499);
    line (548, 492);
    move (548, 486);
    line (548, 479);
    move (548, 473);
    line (548, 466);
    move (548, 460);
    line (548, 453);
    move (548, 447);
    line (548, 440);
    move (548, 434);
    line (548, 427);
    move (548, 421);
    line (548, 414);
    move (548, 408);
    line (548, 401);
    move (548, 395);
    line (548, 388);
    move (548, 382);
    line (548, 375);
    move (548, 369);
    line (548, 362);
    move (548, 356);
    line (548, 349);
    move (548, 343);
    line (548, 336);
    move (548, 330);
    line (548, 323);
    move (548, 317);
    line (548, 310);
    move (548, 304);
    line (548, 297);
    move (548, 291);
    line (548, 284);
    move (548, 278);
    line (548, 271);
    move (548, 265);
    line (548, 258);
  };
};
group ghostB {
  position (132, 552);
  opacity 0;
  zIndex 5;
  path shaft {
    stroke #b6843c width 4 cap butt;
    zIndex 1;
    move (0, 0);
    line (3.58, -7.16);
    move (6.71, -13.42);
    line (10.29, -20.57);
    move (13.42, -26.83);
    line (16.99, -33.99);
    move (20.12, -40.25);
    line (23.7, -47.4);
    move (26.83, -53.67);
    line (30.41, -60.82);
    move (33.54, -67.08);
    line (37.12, -74.24);
    move (40.25, -80.5);
    line (43.83, -87.65);
    move (46.96, -93.91);
    line (50.54, -101.07);
    move (53.67, -107.33);
    line (57.24, -114.49);
    move (60.37, -120.75);
    line (63.95, -127.9);
    move (67.08, -134.16);
    line (70.66, -141.32);
    move (73.79, -147.58);
    line (77.37, -154.74);
    move (80.5, -161);
    line (84.08, -168.15);
    move (87.21, -174.41);
    line (90.78, -181.57);
    move (93.91, -187.83);
    line (96.84, -193.69);
  };
  path chevron {
    stroke #b6843c width 4 cap round join round;
    zIndex 2;
    move (101.76, -183.4);
    line (104, -208);
    line (85.66, -191.45);
  };
};
group vectorA {
  position (132, 552);
  zIndex 6;
  path shaft {
    stroke #4e7594 width 5.5 cap round join round;
    zIndex 1;
    move (0, 0);
    line (296.82, -98.94);
  };
  polygon head {
    points ((312, -104), (293.03, -88.19), (287.33, -105.26));
    fill #4e7594;
    opacity 0;
    zIndex 2;
  };
  text label {
    position (168.31, -98.27);
    content "a";
    fontFamily "sans";
    fontSize 26;
    fontWeight 600;
    align center;
    baseline middle;
    fill #3c3c38;
    opacity 0;
    zIndex 3;
  };
};
group vectorB {
  position (132, 552);
  zIndex 7;
  path shaft {
    stroke #b6843c width 5.5 cap round join round;
    zIndex 1;
    move (0, 0);
    line (96.84, -193.69);
  };
  polygon head {
    points ((104, -208), (101.76, -183.4), (85.66, -191.45));
    fill #b6843c;
    opacity 0;
    zIndex 2;
  };
  text label {
    position (12.65, -123.68);
    content "b";
    fontFamily "sans";
    fontSize 26;
    fontWeight 600;
    align center;
    baseline middle;
    fill #3c3c38;
    opacity 0;
    zIndex 3;
  };
};
group vectorB2 {
  position (132, 552);
  zIndex 8;
  path shaft {
    stroke #b6843c width 5.5 cap round join round;
    zIndex 1;
    move (0, 0);
    line (96.84, -193.69);
  };
  polygon head {
    points ((104, -208), (101.76, -183.4), (85.66, -191.45));
    fill #b6843c;
    opacity 0;
    zIndex 2;
  };
  text label {
    position (12.65, -123.68);
    content "b";
    fontFamily "sans";
    fontSize 26;
    fontWeight 600;
    align center;
    baseline middle;
    fill #3c3c38;
    opacity 0;
    zIndex 3;
  };
};
group vectorA2 {
  position (236, 344);
  zIndex 9;
  path shaft {
    stroke #4e7594 width 5.5 cap round join round;
    zIndex 1;
    move (0, 0);
    line (296.82, -98.94);
  };
  polygon head {
    points ((312, -104), (293.03, -88.19), (287.33, -105.26));
    fill #4e7594;
    opacity 0;
    zIndex 2;
  };
  text label {
    position (142.72, -91.84);
    content "a";
    fontFamily "sans";
    fontSize 26;
    fontWeight 600;
    align center;
    baseline middle;
    fill #3c3c38;
    opacity 0;
    zIndex 3;
  };
};
group sum {
  position (132, 552);
  zIndex 11;
  path shaft {
    stroke #2f7d76 width 5.5 cap round join round;
    zIndex 1;
    move (0, 0);
    line (403.2, -302.4);
  };
  polygon head {
    points ((416, -312), (403, -291), (392.2, -305.4));
    fill #2f7d76;
    opacity 0;
    zIndex 2;
  };
  text label {
    position (160.24, -167.68);
    content "a + b";
    fontFamily "sans";
    fontSize 24;
    fontWeight 600;
    align center;
    baseline middle;
    fill #3c3c38;
    opacity 0;
    zIndex 3;
  };
};
text title { position (56, 58); content "Adding Two Vectors"; fontFamily "sans"; fontSize 34; fontWeight 600; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text capMeet { position (56, 646); content "Add vectors by placing them head to tail."; fontFamily "sans"; fontSize 22; fontWeight 500; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text capSame { position (56, 646); content "Same length. Same direction."; fontFamily "sans"; fontSize 22; fontWeight 500; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text capSum { position (56, 646); content "The sum connects the start to the final endpoint."; fontFamily "sans"; fontSize 22; fontWeight 500; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text capOrder { position (56, 646); content "Either order reaches the same endpoint."; fontFamily "sans"; fontSize 22; fontWeight 500; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text capCommute { position (56, 616); content "a + b = b + a"; fontFamily "sans"; fontSize 28; fontWeight 600; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text capRule { position (56, 658); content "Place head to tail. Connect start to finish."; fontFamily "sans"; fontSize 22; fontWeight 500; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text eqLine1 { position (792, 324); content "a + b = (3, 1) + (1, 2)"; fontFamily "Menlo"; fontSize 26; fontWeight 400; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text eqLine2 { position (792, 372); content "      = (3 + 1, 1 + 2)"; fontFamily "Menlo"; fontSize 26; fontWeight 400; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text eqLine3 { position (792, 420); content "      = (4, 3)"; fontFamily "Menlo"; fontSize 26; fontWeight 400; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
text eqResult { position (792, 372); content "a + b = (4, 3)"; fontFamily "Menlo"; fontSize 26; fontWeight 400; align left; baseline alphabetic; fill #3c3c38; opacity 0; zIndex 20; };
line underX { from (933.88, 381); to (1010.15, 381); stroke #3c3c38 width 2.4 cap round; opacity 0; zIndex 21; };
line underY { from (1043.45, 381); to (1119.72, 381); stroke #3c3c38 width 2.4 cap round; opacity 0; zIndex 21; };
group endpoint {
  opacity 0;
  zIndex 14;
  circle dot { position (548, 240); radius 5.5; fill #3c3c38; stroke #f6f3ec width 3; zIndex 1; };
  text coord { position (566, 214); content "(4, 3)"; fontFamily "sans"; fontSize 18; fontWeight 600; align left; baseline middle; fill #3c3c38; zIndex 2; };
};
circle ringOrigin { position (132, 552); radius 15; stroke #3c3c38 width 2.1; opacity 0; zIndex 15; };
circle ringJoint { position (444, 448); radius 16; stroke #3c3c38 width 2.1; opacity 0; zIndex 15; };
circle ringSum { position (548, 240); radius 16; stroke #2f7d76 width 2.1; opacity 0; zIndex 15; };
operators vectorA.shaft { trim 0, 0, 0; };
operators vectorB.shaft { trim 0, 0, 0; };
operators vectorB2.shaft { trim 0, 0, 0; };
operators vectorA2.shaft { trim 0, 0, 0; };
operators sum.shaft { trim 0, 0, 0; };
keyframes vectorA.shaft.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.3333% 0 ease easeOut;
  6.6667% 1 ease hold;
  100% 1;
};
keyframes vectorA.head.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  5.8% 0 ease easeOut;
  6.6667% 1 ease hold;
  100% 1;
};
keyframes vectorA.label.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  6.0667% 0 ease easeOut;
  7.2% 1 ease hold;
  100% 1;
};
keyframes vectorB.shaft.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  8.3333% 0 ease easeOut;
  11.6667% 1 ease hold;
  100% 1;
};
keyframes vectorB.head.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  10.8% 0 ease easeOut;
  11.6667% 1 ease hold;
  100% 1;
};
keyframes vectorB.label.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  11.0667% 0 ease easeOut;
  12.2% 1 ease hold;
  100% 1;
};
keyframes vectorB2.shaft.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  68.3333% 0 ease easeOut;
  71.6667% 1 ease hold;
  100% 1;
};
keyframes vectorB2.head.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70.8% 0 ease easeOut;
  71.6667% 1 ease hold;
  100% 1;
};
keyframes vectorB2.label.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  71.0667% 0 ease easeOut;
  72.2% 1 ease hold;
  100% 1;
};
keyframes vectorA2.shaft.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  73.3333% 0 ease easeOut;
  76.6667% 1 ease hold;
  100% 1;
};
keyframes vectorA2.head.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  75.8% 0 ease easeOut;
  76.6667% 1 ease hold;
  100% 1;
};
keyframes vectorA2.label.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  76.0667% 0 ease easeOut;
  77.2% 1 ease hold;
  100% 1;
};
keyframes sum.shaft.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  36.6667% 0 ease easeOut;
  43.3333% 1 ease hold;
  100% 1;
};
keyframes sum.head.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  42.4667% 0 ease easeOut;
  43.3333% 1 ease hold;
  100% 1;
};
keyframes sum.label.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  42.7333% 0 ease easeOut;
  43.8667% 1 ease hold;
  100% 1;
};
keyframes plane.opacity {
  start 0s;
  duration 30s;
  0% 0 ease easeOut;
  3.3333% 1 ease hold;
  100% 1;
};
keyframes title.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  0.1667% 0 ease easeOut;
  2.5% 1 ease hold;
  100% 1;
};
keyframes capMeet.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.5% 0 ease easeOut;
  3.8333% 1 ease hold;
  14.1667% 1 ease easeInOut;
  16.6667% 0.55 ease hold;
  17.3333% 0.55 ease easeIn;
  19.1667% 0 ease hold;
  100% 0;
};
keyframes capSame.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  17.8333% 0 ease easeOut;
  20.1667% 1 ease hold;
  31.8333% 1 ease easeIn;
  34.5% 0 ease hold;
  100% 0;
};
keyframes capSum.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  34.5% 0 ease easeOut;
  36.8333% 1 ease hold;
  48.6667% 1 ease easeIn;
  50.8333% 0 ease hold;
  100% 0;
};
keyframes capOrder.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  68% 0 ease easeOut;
  70.1667% 1 ease hold;
  82.5% 1 ease easeIn;
  84.6667% 0 ease hold;
  100% 0;
};
keyframes capCommute.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  84% 0 ease easeOut;
  86.5% 1 ease hold;
  100% 1;
};
keyframes capRule.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  87.1667% 0 ease easeOut;
  90% 1 ease hold;
  100% 1;
};
keyframes ghostB.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.3333% 0 ease easeOut;
  20.5% 0.38 ease hold;
  31.8333% 0.38 ease easeIn;
  34.6667% 0 ease hold;
  100% 0;
};
keyframes vectorB.position {
  start 0s;
  duration 30s;
  0% (132, 552) ease hold;
  18.3333% (132, 552) ease easeInOut;
  26.6667% (444, 448) ease hold;
  100% (444, 448);
};
keyframes vectorA.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  48.5% 1 ease easeInOut;
  50.6667% 0.78 ease hold;
  66.8333% 0.78 ease easeInOut;
  69.1667% 0.2 ease hold;
  83.5% 0.2 ease easeIn;
  86.8333% 0 ease hold;
  100% 0;
};
keyframes vectorB.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  48.5% 1 ease easeInOut;
  50.6667% 0.78 ease hold;
  66.8333% 0.78 ease easeInOut;
  69.1667% 0.2 ease hold;
  83.5% 0.2 ease easeIn;
  86.8333% 0 ease hold;
  100% 0;
};
keyframes endpoint.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  33.3333% 0 ease easeOut;
  36.6667% 1 ease hold;
  100% 1;
};
keyframes ringOrigin.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  33.5% 0 ease easeOut;
  34.3% 0.55 ease easeIn;
  36% 0 ease hold;
  100% 0;
};
keyframes ringOrigin.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  33.5% (1, 1) ease easeOut;
  36% (1.48, 1.48) ease hold;
  36.1333% (1, 1) ease hold;
  100% (1, 1);
};
keyframes ringJoint.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  26.5% 0 ease easeOut;
  27.1933% 0.72 ease easeIn;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes ringJoint.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  26.5% (1, 1) ease easeOut;
  28.6667% (1.62, 1.62) ease hold;
  28.8% (1, 1) ease hold;
  100% (1, 1);
};
keyframes guides.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  50% 0 ease easeOut;
  52.3333% 1 ease hold;
  66.5% 1 ease easeIn;
  68.5% 0 ease hold;
  100% 0;
};
keyframes eqLine1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  50.1667% 0 ease easeOut;
  52% 1 ease hold;
  66.6667% 1 ease easeIn;
  68.1667% 0 ease hold;
  100% 0;
};
keyframes eqLine2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  53.5% 0 ease easeOut;
  55.3333% 1 ease hold;
  66.6667% 1 ease easeIn;
  68.1667% 0 ease hold;
  100% 0;
};
keyframes eqLine3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  56.8333% 0 ease easeOut;
  58.6667% 1 ease hold;
  66.6667% 1 ease easeIn;
  68.1667% 0 ease hold;
  100% 0;
};
keyframes underX.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  60.6667% 0 ease easeOut;
  61.6% 1 ease hold;
  62.7333% 1 ease easeIn;
  63.6% 0 ease hold;
  100% 0;
};
keyframes underY.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  63.8333% 0 ease easeOut;
  64.7333% 1 ease hold;
  65.7333% 1 ease easeIn;
  66.5333% 0 ease hold;
  100% 0;
};
keyframes eqResult.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67.3333% 0 ease easeOut;
  69.1667% 1 ease hold;
  100% 1;
};
keyframes ringSum.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  76.8333% 0 ease easeOut;
  77.6333% 0.5 ease easeIn;
  79.3333% 0 ease hold;
  100% 0;
};
keyframes ringSum.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  76.8333% (1, 1) ease easeOut;
  79.3333% (1.4, 1.4) ease hold;
  79.4667% (1, 1) ease hold;
  100% (1, 1);
};
complete;
