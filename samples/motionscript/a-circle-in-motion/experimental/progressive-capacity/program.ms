scene "a-circle-in-motion" {
  version "0.2";
  viewport (1280, 720);
  background #f4efe6;
  duration 30s;
  requires "easing.hold";
  requires "easing.cubicBezier";
  requires "geometry.pathMorph";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "text.basic";
};

camera main {
  position (0, -110);
  zoom 1;
  rotation 0deg;
};

group body {
  zIndex 2;
  group turn {
    path ring { move (19.53, -237.66); cubic (19.53, -222.41) (5.86, -206.95) (0, -195.31); cubic (-5.86, -206.95) (-19.53, -222.41) (-19.53, -237.66); cubic (-19.53, -248.7) (-10.79, -257.66) (0, -257.66); cubic (10.79, -257.66) (19.53, -248.7) (19.53, -237.66); close; move (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); close; fillRule evenodd; fill #111111; zIndex 1; };
    path splash { move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; fill #111111; zIndex 1; visible false; };
    group ticks {
      zIndex 2;
      path t0 { move (0, -148); line (0, -148); stroke #111111 width 2.5 cap butt; visible false; };
      path t1 { move (74, -128.17); line (74, -128.17); stroke #111111 width 2.5 cap butt; visible false; };
      path t2 { move (128.17, -74); line (128.17, -74); stroke #111111 width 2.5 cap butt; visible false; };
      path t3 { move (148, 0); line (148, 0); stroke #111111 width 2.5 cap butt; visible false; };
      path t4 { move (128.17, 74); line (128.17, 74); stroke #111111 width 2.5 cap butt; visible false; };
      path t5 { move (74, 128.17); line (74, 128.17); stroke #111111 width 2.5 cap butt; visible false; };
      path t6 { move (0, 148); line (0, 148); stroke #111111 width 2.5 cap butt; visible false; };
      path t7 { move (-74, 128.17); line (-74, 128.17); stroke #111111 width 2.5 cap butt; visible false; };
      path t8 { move (-128.17, 74); line (-128.17, 74); stroke #111111 width 2.5 cap butt; visible false; };
      path t9 { move (-148, 0); line (-148, 0); stroke #111111 width 2.5 cap butt; visible false; };
      path t10 { move (-128.17, -74); line (-128.17, -74); stroke #111111 width 2.5 cap butt; visible false; };
      path t11 { move (-74, -128.17); line (-74, -128.17); stroke #111111 width 2.5 cap butt; visible false; };
    };
    path innerRim { move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; stroke #111111 width 1.6; zIndex 2; visible false; };
    group hands {
      zIndex 3;
      path pondL { move (-420, 0); quadratic (-210, 0) (0, 0); stroke #111111 width 3 cap round; };
      path pondR { move (420, 0); quadratic (210, 0) (0, 0); stroke #111111 width 3 cap round; };
    };
    circle hub { radius 10; fill #111111; scale (0, 0); zIndex 4; visible false; };
  };
  group bike {
    zIndex 3;
    path bars { move (0, 0); line (-55, -150); line (-70, -195); line (-50, -222); quadratic (-5, -226) (-18, -196); stroke #111111 width 4 cap round join round; };
    path chain { move (0, 0); line (-55, -150); line (-205, 30); line (-400, 0); stroke #111111 width 4 cap round join round; };
    path seatTube { move (0, 0); line (-55, -150); line (-205, 30); line (-255, -180); line (-262, -210); line (-292, -212); line (-234, -215); stroke #111111 width 4 cap round join round; };
    path loop { move (0, 0); line (-55, -150); line (-70, -195); line (-255, -180); line (-305.9, -116.81); cubic (-336.88, -141.77) (-376.51, -153.4) (-416.06, -149.14); cubic (-455.61, -144.88) (-491.86, -125.08) (-516.81, -94.1); cubic (-541.77, -63.12) (-553.4, -23.49) (-549.14, 16.06); cubic (-544.88, 55.61) (-525.08, 91.86) (-494.1, 116.81); cubic (-463.12, 141.77) (-423.49, 153.4) (-383.94, 149.14); cubic (-344.39, 144.88) (-308.14, 125.08) (-283.19, 94.1); cubic (-258.23, 63.12) (-246.6, 23.49) (-250.86, -16.06); cubic (-255.12, -55.61) (-274.92, -91.86) (-305.9, -116.81); stroke #111111 width 4 cap round join round; };
  };
  group rays {
    zIndex 3;
    path r0 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r1 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r2 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r3 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r4 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r5 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r6 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r7 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r8 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r9 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r10 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
    path r11 { move (0, 0); quadratic (0, 0) (0, 0); stroke #111111 width 3 cap round; visible false; };
  };
};

rectangle ground { position (772.92018645439, 60); size (2400, 600); fill #f4efe6; scale (0, 1); zIndex 5; visible false; };

path horizon { move (772.92, 60); line (3172.92, 60); stroke #111111 width 3 cap round; zIndex 6; visible false; };

group cues {
  space screen;
  zIndex 20;
  text cue1 { position (640, 688); content "sound · one soft water plink"; fontFamily "sans"; fontSize 15; fontWeight 400; fontStyle italic; align center; baseline middle; fill #9a9184; opacity 0; };
  text cue2 { position (640, 688); content "sound · water resonance becomes a quiet tick"; fontFamily "sans"; fontSize 15; fontWeight 400; fontStyle italic; align center; baseline middle; fill #9a9184; opacity 0; };
  text cue3 { position (640, 688); content "sound · ticks quicken into a light freewheel"; fontFamily "sans"; fontSize 15; fontWeight 400; fontStyle italic; align center; baseline middle; fill #9a9184; opacity 0; };
  text cue4 { position (640, 688); content "sound · the freewheel softens into a low tone"; fontFamily "sans"; fontSize 15; fontWeight 400; fontStyle italic; align center; baseline middle; fill #9a9184; opacity 0; };
  text cue5 { position (640, 688); content "sound · a soft tonal swell"; fontFamily "sans"; fontSize 15; fontWeight 400; fontStyle italic; align center; baseline middle; fill #9a9184; opacity 0; };
  text cue6 { position (640, 688); content "sound · the tone fades into water ambience"; fontFamily "sans"; fontSize 15; fontWeight 400; fontStyle italic; align center; baseline middle; fill #9a9184; opacity 0; };
};

operators body.bike.bars { trim 0, 0, 0; };

operators body.bike.chain { trim 0, 0, 0; };

operators body.bike.seatTube { trim 0, 0, 0; };

operators body.bike.loop { trim 0, 0, 0; };

operators horizon { trim 0, 0, 0; };

keyframes body.position.x {
  start 0ms;
  duration 15000ms;
  0% 0 ease hold;
  100% 0;
};
keyframes body.position.y {
  start 0ms;
  duration 18000ms;
  0% 0 ease hold;
  100% 0;
};
keyframes body.turn.rotation {
  start 0ms;
  duration 15000ms;
  0% 0deg ease hold;
  100% 0deg;
};
keyframes body.turn.ring.commands {
  start 0ms;
  duration 2150.0099999999998ms;
  0% path { move (19.53, -237.66); cubic (19.53, -222.41) (5.86, -206.95) (0, -195.31); cubic (-5.86, -206.95) (-19.53, -222.41) (-19.53, -237.66); cubic (-19.53, -248.7) (-10.79, -257.66) (0, -257.66); cubic (10.79, -257.66) (19.53, -248.7) (19.53, -237.66); close; move (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); cubic (0, -237.66) (0, -237.66) (0, -237.66); close; } ease cubic(0.3333, 0.2424, 0.6667, 0.5758);
  69.76711736224483% path { move (18.56, -47.2); cubic (18.56, -30.21) (5.57, -12.98) (0, 0); cubic (-5.57, -12.98) (-18.56, -30.21) (-18.56, -47.2); cubic (-18.56, -58.25) (-10.25, -67.2) (0, -67.2); cubic (10.25, -67.2) (18.56, -58.25) (18.56, -47.2); close; move (0, -47.2); cubic (0, -47.2) (0, -47.2) (0, -47.2); cubic (0, -47.2) (0, -47.2) (0, -47.2); cubic (0, -47.2) (0, -47.2) (0, -47.2); cubic (0, -47.2) (0, -47.2) (0, -47.2); close; } ease easeOut;
  81.39450514183656% path { move (34, -7); cubic (34, -2.03) (18.78, 2) (0, 2); cubic (-18.78, 2) (-34, -2.03) (-34, -7); cubic (-34, -11.97) (-18.78, -16) (0, -16); cubic (18.78, -16) (34, -11.97) (34, -7); close; move (0, -7); cubic (0, -7) (0, -7) (0, -7); cubic (0, -7) (0, -7) (0, -7); cubic (0, -7) (0, -7) (0, -7); cubic (0, -7) (0, -7) (0, -7); close; } ease easeOut;
  100% path { move (60, 0); cubic (60, 9.39) (33.14, 17) (0, 17); cubic (-33.14, 17) (-60, 9.39) (-60, 0); cubic (-60, -9.39) (-33.14, -17) (0, -17); cubic (33.14, -17) (60, -9.39) (60, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; };
};
keyframes body.turn.splash.commands {
  start 0ms;
  duration 2450.01ms;
  0% path { move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease hold;
  77.55029571307873% path { move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease easeOut;
  100% path { move (-7, 0); cubic (-7, -18.7) (-3.5, -34) (0, -34); cubic (3.5, -34) (7, -18.7) (7, 0); close; };
};
keyframes body.turn.hands.pondL.commands {
  start 0ms;
  duration 5000.009999999999ms;
  0% path { move (-420, 0); quadratic (-210, 0) (0, 0); } ease hold;
  100% path { move (-420, 0); quadratic (-210, 0) (0, 0); };
};
keyframes body.turn.hands.pondR.commands {
  start 0ms;
  duration 5000.009999999999ms;
  0% path { move (420, 0); quadratic (210, 0) (0, 0); } ease hold;
  100% path { move (420, 0); quadratic (210, 0) (0, 0); };
};
keyframes body.turn.hands.rotation {
  start 0ms;
  duration 9999.99ms;
  0% 0deg ease hold;
  100% 0deg;
};
keyframes body.turn.ticks.t0.commands {
  start 0ms;
  duration 7599.990000000001ms;
  0% path { move (0, -148); line (0, -148); } ease hold;
  100% path { move (0, -148); line (0, -148); };
};
keyframes body.turn.ticks.t1.commands {
  start 0ms;
  duration 7700.009999999999ms;
  0% path { move (74, -128.17); line (74, -128.17); } ease hold;
  100% path { move (74, -128.17); line (74, -128.17); };
};
keyframes body.turn.ticks.t2.commands {
  start 0ms;
  duration 7800ms;
  0% path { move (128.17, -74); line (128.17, -74); } ease hold;
  100% path { move (128.17, -74); line (128.17, -74); };
};
keyframes body.turn.ticks.t3.commands {
  start 0ms;
  duration 7899.990000000002ms;
  0% path { move (148, 0); line (148, 0); } ease hold;
  100% path { move (148, 0); line (148, 0); };
};
keyframes body.turn.ticks.t4.commands {
  start 0ms;
  duration 8000.009999999999ms;
  0% path { move (128.17, 74); line (128.17, 74); } ease hold;
  100% path { move (128.17, 74); line (128.17, 74); };
};
keyframes body.turn.ticks.t5.commands {
  start 0ms;
  duration 8100.000000000001ms;
  0% path { move (74, 128.17); line (74, 128.17); } ease hold;
  100% path { move (74, 128.17); line (74, 128.17); };
};
keyframes body.turn.ticks.t6.commands {
  start 0ms;
  duration 8199.99ms;
  0% path { move (0, 148); line (0, 148); } ease hold;
  100% path { move (0, 148); line (0, 148); };
};
keyframes body.turn.ticks.t7.commands {
  start 0ms;
  duration 8300.01ms;
  0% path { move (-74, 128.17); line (-74, 128.17); } ease hold;
  100% path { move (-74, 128.17); line (-74, 128.17); };
};
keyframes body.turn.ticks.t8.commands {
  start 0ms;
  duration 8400ms;
  0% path { move (-128.17, 74); line (-128.17, 74); } ease hold;
  100% path { move (-128.17, 74); line (-128.17, 74); };
};
keyframes body.turn.ticks.t9.commands {
  start 0ms;
  duration 8499.99ms;
  0% path { move (-148, 0); line (-148, 0); } ease hold;
  100% path { move (-148, 0); line (-148, 0); };
};
keyframes body.turn.ticks.t10.commands {
  start 0ms;
  duration 8600.01ms;
  0% path { move (-128.17, -74); line (-128.17, -74); } ease hold;
  100% path { move (-128.17, -74); line (-128.17, -74); };
};
keyframes body.turn.ticks.t11.commands {
  start 0ms;
  duration 8700ms;
  0% path { move (-74, -128.17); line (-74, -128.17); } ease hold;
  100% path { move (-74, -128.17); line (-74, -128.17); };
};
keyframes body.turn.hub.scale {
  start 0ms;
  duration 8600.01ms;
  0% (0, 0) ease hold;
  100% (0, 0);
};
keyframes body.turn.innerRim.commands {
  start 0ms;
  duration 11600.01ms;
  0% path { move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; } ease hold;
  100% path { move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; };
};
keyframes body.bike.bars.trim.end {
  start 0ms;
  duration 12500.01ms;
  0% 0 ease hold;
  100% 0;
};
keyframes body.bike.chain.trim.end {
  start 0ms;
  duration 12600ms;
  0% 0 ease hold;
  100% 0;
};
keyframes body.bike.seatTube.trim.end {
  start 0ms;
  duration 12800.009999999998ms;
  0% 0 ease hold;
  100% 0;
};
keyframes body.bike.loop.trim.end {
  start 0ms;
  duration 12699.99ms;
  0% 0 ease hold;
  100% 0;
};
keyframes horizon.trim.end {
  start 0ms;
  duration 17000.010000000002ms;
  0% 0 ease hold;
  100% 0;
};
keyframes ground.scale.x {
  start 0ms;
  duration 17000.010000000002ms;
  0% 0 ease hold;
  100% 0;
};
keyframes horizon.commands {
  start 0ms;
  duration 24999.989999999998ms;
  0% path { move (772.92, 60); line (3172.92, 60); } ease hold;
  100% path { move (772.92, 60); line (3172.92, 60); };
};
keyframes body.rays.r0.commands {
  start 0ms;
  duration 21000ms;
  0% path { move (0, -169); quadratic (0, -169) (0, -169); } ease hold;
  100% path { move (0, -169); quadratic (0, -169) (0, -169); };
};
keyframes body.rays.r1.commands {
  start 0ms;
  duration 21060.000000000004ms;
  0% path { move (91.23, -142.29); quadratic (91.23, -142.29) (91.23, -142.29); } ease hold;
  100% path { move (91.23, -142.29); quadratic (91.23, -142.29) (91.23, -142.29); };
};
keyframes body.rays.r2.commands {
  start 0ms;
  duration 21120.000000000004ms;
  0% path { move (147.66, -82.27); quadratic (147.66, -82.27) (147.66, -82.27); } ease hold;
  100% path { move (147.66, -82.27); quadratic (147.66, -82.27) (147.66, -82.27); };
};
keyframes body.rays.r3.commands {
  start 0ms;
  duration 21180ms;
  0% path { move (169, 0); quadratic (169, 0) (169, 0); } ease hold;
  100% path { move (169, 0); quadratic (169, 0) (169, 0); };
};
keyframes body.rays.r4.commands {
  start 0ms;
  duration 21240ms;
  0% path { move (142.29, 91.23); quadratic (142.29, 91.23) (142.29, 91.23); } ease hold;
  100% path { move (142.29, 91.23); quadratic (142.29, 91.23) (142.29, 91.23); };
};
keyframes body.rays.r5.commands {
  start 0ms;
  duration 21300ms;
  0% path { move (82.27, 147.66); quadratic (82.27, 147.66) (82.27, 147.66); } ease hold;
  100% path { move (82.27, 147.66); quadratic (82.27, 147.66) (82.27, 147.66); };
};
keyframes body.rays.r6.commands {
  start 0ms;
  duration 21360.000000000004ms;
  0% path { move (0, 169); quadratic (0, 169) (0, 169); } ease hold;
  100% path { move (0, 169); quadratic (0, 169) (0, 169); };
};
keyframes body.rays.r7.commands {
  start 0ms;
  duration 21420.000000000004ms;
  0% path { move (-91.23, 142.29); quadratic (-91.23, 142.29) (-91.23, 142.29); } ease hold;
  100% path { move (-91.23, 142.29); quadratic (-91.23, 142.29) (-91.23, 142.29); };
};
keyframes body.rays.r8.commands {
  start 0ms;
  duration 21480ms;
  0% path { move (-147.66, 82.27); quadratic (-147.66, 82.27) (-147.66, 82.27); } ease hold;
  100% path { move (-147.66, 82.27); quadratic (-147.66, 82.27) (-147.66, 82.27); };
};
keyframes body.rays.r9.commands {
  start 0ms;
  duration 21540ms;
  0% path { move (-169, 0); quadratic (-169, 0) (-169, 0); } ease hold;
  100% path { move (-169, 0); quadratic (-169, 0) (-169, 0); };
};
keyframes body.rays.r10.commands {
  start 0ms;
  duration 21600ms;
  0% path { move (-142.29, -91.23); quadratic (-142.29, -91.23) (-142.29, -91.23); } ease hold;
  100% path { move (-142.29, -91.23); quadratic (-142.29, -91.23) (-142.29, -91.23); };
};
keyframes body.rays.r11.commands {
  start 0ms;
  duration 21660ms;
  0% path { move (-82.27, -147.66); quadratic (-82.27, -147.66) (-82.27, -147.66); } ease hold;
  100% path { move (-82.27, -147.66); quadratic (-82.27, -147.66) (-82.27, -147.66); };
};
keyframes cues.cue1.opacity {
  start 0ms;
  duration 4250.01ms;
  0% 0 ease hold;
  34.11733148863179% 0 ease easeOut;
  42.352841522725825% 1 ease hold;
  100% 1;
};
keyframes cues.cue2.opacity {
  start 0ms;
  duration 5199.990000000001ms;
  0% 0 ease hold;
  100% 0;
};
keyframes cues.cue3.opacity {
  start 0ms;
  duration 10200ms;
  0% 0 ease hold;
  100% 0;
};
keyframes cues.cue4.opacity {
  start 0ms;
  duration 15200.01ms;
  0% 0 ease hold;
  100% 0;
};
keyframes cues.cue5.opacity {
  start 0ms;
  duration 20199.989999999998ms;
  0% 0 ease hold;
  100% 0;
};
keyframes cues.cue6.opacity {
  start 0ms;
  duration 25200ms;
  0% 0 ease hold;
  100% 0;
};
keyframes camera(main).position.x {
  start 0ms;
  duration 5000.009999999999ms;
  0% 0 ease hold;
  100% 0;
};
keyframes camera(main).position.y {
  start 0ms;
  duration 5000.009999999999ms;
  0% -110 ease hold;
  100% -110;
};
keyframes camera(main).zoom {
  start 0ms;
  duration 5000.009999999999ms;
  0% 1 ease hold;
  100% 1;
};
step body.turn.splash.visible { at 1900ms; value true; };

seal 2000ms;
keyframes body.turn.ring.commands {
  start 2150.0099999999998ms;
  duration 5349.99ms;
  0% path { move (60, 0); cubic (60, 9.39) (33.14, 17) (0, 17); cubic (-33.14, 17) (-60, 9.39) (-60, 0); cubic (-60, -9.39) (-33.14, -17) (0, -17); cubic (33.14, -17) (60, -9.39) (60, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease easeOut;
  45.7941042880454% path { move (150, 0); cubic (150, 22.09) (82.84, 40) (0, 40); cubic (-82.84, 40) (-150, 22.09) (-150, 0); cubic (-150, -22.09) (-82.84, -40) (0, -40); cubic (82.84, -40) (150, -22.09) (150, 0); close; move (147, 0); cubic (147, 20.77) (81.19, 37.6) (0, 37.6); cubic (-81.19, 37.6) (-147, 20.77) (-147, 0); cubic (-147, -20.77) (-81.19, -37.6) (0, -37.6); cubic (81.19, -37.6) (147, -20.77) (147, 0); close; } ease easeInOut;
  100% path { move (152, 0); cubic (152, 83.95) (83.95, 152) (0, 152); cubic (-83.95, 152) (-152, 83.95) (-152, 0); cubic (-152, -83.95) (-83.95, -152) (0, -152); cubic (83.95, -152) (152, -83.95) (152, 0); close; move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; };
};
keyframes body.turn.splash.commands {
  start 2450.01ms;
  duration 27549.989999999998ms;
  0% path { move (-7, 0); cubic (-7, -18.7) (-3.5, -34) (0, -34); cubic (3.5, -34) (7, -18.7) (7, 0); close; } ease easeInOut;
  3.085264277772877% path { move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease hold;
  100% path { move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; };
};
step body.turn.splash.visible { at 3350ms; value false; };

keyframes cues.cue1.opacity {
  start 4250.01ms;
  duration 25749.989999999998ms;
  0% 1 ease easeIn;
  1.3591461588917104% 0 ease hold;
  100% 0;
};
seal 5000ms;
keyframes body.turn.hands.pondL.commands {
  start 5000.009999999999ms;
  duration 5999.999999999999ms;
  0% path { move (-420, 0); quadratic (-210, 0) (0, 0); } ease easeInOut;
  41.66650000000002% path { move (-150, 0); quadratic (-75, 0) (0, 0); } ease easeIn;
  55.00000000000003% path { move (-109.68, -34.58); quadratic (-57.26, -5.26) (0, 0); } ease easeOut;
  66.66650000000001% path { move (-65.53, -45.89); quadratic (-32.77, -22.94) (0, 0); } ease hold;
  100% path { move (-65.53, -45.89); quadratic (-32.77, -22.94) (0, 0); };
};
keyframes body.turn.hands.pondR.commands {
  start 5000.009999999999ms;
  duration 5999.999999999999ms;
  0% path { move (420, 0); quadratic (210, 0) (0, 0); } ease easeInOut;
  41.66650000000002% path { move (150, 0); quadratic (75, 0) (0, 0); } ease easeIn;
  55.00000000000003% path { move (129.43, -34.68); quadratic (66.79, -5.26) (0, 0); } ease easeOut;
  66.66650000000001% path { move (102.19, -59); quadratic (51.1, -29.5) (0, 0); } ease hold;
  100% path { move (102.19, -59); quadratic (51.1, -29.5) (0, 0); };
};
keyframes camera(main).position.x {
  start 5000.009999999999ms;
  duration 8799.990000000002ms;
  0% 0 ease easeInOut;
  51.13642174593378% 0 ease hold;
  56.818019111385354% 0 ease easeInOut;
  100% -185;
};
keyframes camera(main).position.y {
  start 5000.009999999999ms;
  duration 8799.990000000002ms;
  0% -110 ease easeInOut;
  51.13642174593378% 0 ease hold;
  56.818019111385354% 0 ease easeInOut;
  100% -40;
};
keyframes camera(main).zoom {
  start 5000.009999999999ms;
  duration 8799.990000000002ms;
  0% 1 ease easeInOut;
  51.13642174593378% 1.3 ease hold;
  56.818019111385354% 1.3 ease easeInOut;
  100% 0.92;
};
keyframes cues.cue2.opacity {
  start 5199.990000000001ms;
  duration 24800.01ms;
  0% 0 ease easeOut;
  1.4113300760765795% 1 ease hold;
  17.137130186641052% 1 ease easeIn;
  18.548460262717636% 0 ease hold;
  100% 0;
};
keyframes body.turn.ring.commands {
  start 7500ms;
  duration 3999.9900000000016ms;
  0% path { move (152, 0); cubic (152, 83.95) (83.95, 152) (0, 152); cubic (-83.95, 152) (-152, 83.95) (-152, 0); cubic (-152, -83.95) (-83.95, -152) (0, -152); cubic (83.95, -152) (152, -83.95) (152, 0); close; move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; } ease hold;
  100% path { move (152, 0); cubic (152, 83.95) (83.95, 152) (0, 152); cubic (-83.95, 152) (-152, 83.95) (-152, 0); cubic (-152, -83.95) (-83.95, -152) (0, -152); cubic (83.95, -152) (152, -83.95) (152, 0); close; move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; };
};
keyframes body.turn.ticks.t0.commands {
  start 7599.990000000001ms;
  duration 3600.000000000001ms;
  0% path { move (0, -148); line (0, -148); } ease easeOut;
  16.66666666666664% path { move (0, -148); line (0, -118); } ease hold;
  100% path { move (0, -148); line (0, -118); };
};
step body.turn.ticks.t0.visible { at 7600ms; value true; };

step body.turn.ticks.t1.visible { at 7700ms; value true; };

keyframes body.turn.ticks.t1.commands {
  start 7700.009999999999ms;
  duration 3559.9800000000005ms;
  0% path { move (74, -128.17); line (74, -128.17); } ease easeOut;
  16.854027269816147% path { move (74, -128.17); line (63, -109.12); } ease hold;
  100% path { move (74, -128.17); line (63, -109.12); };
};
step body.turn.ticks.t2.visible { at 7800ms; value true; };

keyframes body.turn.ticks.t2.commands {
  start 7800ms;
  duration 3519.99ms;
  0% path { move (128.17, -74); line (128.17, -74); } ease easeOut;
  17.045502970178894% path { move (128.17, -74); line (109.12, -63); } ease hold;
  100% path { move (128.17, -74); line (109.12, -63); };
};
keyframes body.turn.ticks.t3.commands {
  start 7899.990000000002ms;
  duration 3480ms;
  0% path { move (148, 0); line (148, 0); } ease easeOut;
  17.241379310344776% path { move (148, 0); line (118, 0); } ease hold;
  100% path { move (148, 0); line (118, 0); };
};
step body.turn.ticks.t3.visible { at 7900ms; value true; };

step body.turn.ticks.t4.visible { at 8000ms; value true; };

keyframes body.turn.ticks.t4.commands {
  start 8000.009999999999ms;
  duration 3439.9800000000005ms;
  0% path { move (128.17, 74); line (128.17, 74); } ease easeOut;
  17.441961871871374% path { move (128.17, 74); line (109.12, 63); } ease hold;
  100% path { move (128.17, 74); line (109.12, 63); };
};
step body.turn.ticks.t5.visible { at 8100ms; value true; };

keyframes body.turn.ticks.t5.commands {
  start 8100.000000000001ms;
  duration 3399.9900000000007ms;
  0% path { move (74, 128.17); line (74, 128.17); } ease easeOut;
  17.647110726796225% path { move (74, 128.17); line (63, 109.12); } ease hold;
  100% path { move (74, 128.17); line (63, 109.12); };
};
keyframes body.turn.ticks.t6.commands {
  start 8199.99ms;
  duration 3360ms;
  0% path { move (0, 148); line (0, 148); } ease easeOut;
  17.857142857142858% path { move (0, 148); line (0, 118); } ease hold;
  100% path { move (0, 148); line (0, 118); };
};
step body.turn.ticks.t6.visible { at 8200ms; value true; };

step body.turn.ticks.t7.visible { at 8300ms; value true; };

keyframes body.turn.ticks.t7.commands {
  start 8300.01ms;
  duration 3319.9799999999996ms;
  0% path { move (-74, 128.17); line (-74, 128.17); } ease easeOut;
  18.072398026494138% path { move (-74, 128.17); line (-63, 109.12); } ease hold;
  100% path { move (-74, 128.17); line (-63, 109.12); };
};
step body.turn.ticks.t8.visible { at 8400ms; value true; };

keyframes body.turn.ticks.t8.commands {
  start 8400ms;
  duration 3279.9900000000016ms;
  0% path { move (-128.17, 74); line (-128.17, 74); } ease easeOut;
  18.29273869737407% path { move (-128.17, 74); line (-109.12, 63); } ease hold;
  100% path { move (-128.17, 74); line (-109.12, 63); };
};
keyframes body.turn.ticks.t9.commands {
  start 8499.99ms;
  duration 3240ms;
  0% path { move (-148, 0); line (-148, 0); } ease easeOut;
  18.51851851851852% path { move (-148, 0); line (-118, 0); } ease hold;
  100% path { move (-148, 0); line (-118, 0); };
};
step body.turn.ticks.t9.visible { at 8500ms; value true; };

step body.turn.ticks.t10.visible { at 8600ms; value true; };

step body.turn.hub.visible { at 8600ms; value true; };

keyframes body.turn.ticks.t10.commands {
  start 8600.01ms;
  duration 3199.9799999999996ms;
  0% path { move (-128.17, -74); line (-128.17, -74); } ease easeOut;
  18.75011718823237% path { move (-128.17, -74); line (-109.12, -63); } ease hold;
  100% path { move (-128.17, -74); line (-109.12, -63); };
};
keyframes body.turn.hub.scale {
  start 8600.01ms;
  duration 2799.99ms;
  0% (0, 0) ease easeOut;
  14.285408162172% (0.6, 0.6) ease hold;
  100% (0.6, 0.6);
};
step body.turn.ticks.t11.visible { at 8700ms; value true; };

keyframes body.turn.ticks.t11.commands {
  start 8700ms;
  duration 3159.99ms;
  0% path { move (-74, -128.17); line (-74, -128.17); } ease easeOut;
  18.987401858866644% path { move (-74, -128.17); line (-63, -109.12); } ease hold;
  100% path { move (-74, -128.17); line (-63, -109.12); };
};
keyframes body.turn.hands.rotation {
  start 9999.99ms;
  duration 1400.0100000000002ms;
  0% 0deg ease easeInOut;
  100% 375deg;
};
seal 10000ms;
keyframes cues.cue3.opacity {
  start 10200ms;
  duration 19800ms;
  0% 0 ease easeOut;
  1.767727272727274% 1 ease hold;
  21.46469696969697% 1 ease easeIn;
  23.232272727272726% 0 ease hold;
  100% 0;
};
keyframes body.turn.hands.pondL.commands {
  start 11000.009999999998ms;
  duration 5599.98ms;
  0% path { move (-65.53, -45.89); quadratic (-32.77, -22.94) (0, 0); } ease easeInOut;
  16.071485969592782% path { move (-120.42, -84.32); quadratic (-60.21, -42.16) (0, 0); } ease hold;
  100% path { move (-120.42, -84.32); quadratic (-60.21, -42.16) (0, 0); };
};
keyframes body.turn.hands.pondR.commands {
  start 11000.009999999998ms;
  duration 5599.98ms;
  0% path { move (102.19, -59); quadratic (51.1, -29.5) (0, 0); } ease easeInOut;
  16.071485969592782% path { move (127.31, -73.5); quadratic (63.65, -36.75) (0, 0); } ease hold;
  100% path { move (127.31, -73.5); quadratic (63.65, -36.75) (0, 0); };
};
keyframes body.turn.ticks.t0.commands {
  start 11199.990000000002ms;
  duration 5399.999999999996ms;
  0% path { move (0, -148); line (0, -118); } ease easeInOut;
  11.111111111111086% path { move (0, -148); line (0, 0); } ease hold;
  100% path { move (0, -148); line (0, 0); };
};
keyframes body.turn.ticks.t1.commands {
  start 11259.99ms;
  duration 5339.999999999998ms;
  0% path { move (74, -128.17); line (63, -109.12); } ease easeInOut;
  11.23595505617978% path { move (74, -128.17); line (0, 0); } ease hold;
  100% path { move (74, -128.17); line (0, 0); };
};
keyframes body.turn.ticks.t2.commands {
  start 11319.99ms;
  duration 5279.999999999998ms;
  0% path { move (128.17, -74); line (109.12, -63); } ease easeInOut;
  11.363636363636367% path { move (128.17, -74); line (0, 0); } ease hold;
  100% path { move (128.17, -74); line (0, 0); };
};
keyframes body.turn.ticks.t3.commands {
  start 11379.990000000002ms;
  duration 5219.999999999996ms;
  0% path { move (148, 0); line (118, 0); } ease easeInOut;
  11.494252873563227% path { move (148, 0); line (0, 0); } ease hold;
  100% path { move (148, 0); line (0, 0); };
};
keyframes body.turn.hands.rotation {
  start 11400ms;
  duration 18600ms;
  0% 375deg ease hold;
  100% 375deg;
};
keyframes body.turn.hub.scale {
  start 11400ms;
  duration 5199.989999999998ms;
  0% (0.6, 0.6) ease easeInOut;
  19.230613905026743% (1.4, 1.4) ease hold;
  100% (1.4, 1.4);
};
keyframes body.turn.ticks.t4.commands {
  start 11439.99ms;
  duration 5159.999999999998ms;
  0% path { move (128.17, 74); line (109.12, 63); } ease easeInOut;
  11.62790697674419% path { move (128.17, 74); line (0, 0); } ease hold;
  100% path { move (128.17, 74); line (0, 0); };
};
keyframes body.turn.ring.commands {
  start 11499.990000000002ms;
  duration 6500.009999999998ms;
  0% path { move (152, 0); cubic (152, 83.95) (83.95, 152) (0, 152); cubic (-83.95, 152) (-152, 83.95) (-152, 0); cubic (-152, -83.95) (-83.95, -152) (0, -152); cubic (83.95, -152) (152, -83.95) (152, 0); close; move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; } ease easeInOut;
  13.846132544411446% path { move (157, 0); cubic (157, 86.71) (86.71, 157) (0, 157); cubic (-86.71, 157) (-157, 86.71) (-157, 0); cubic (-157, -86.71) (-86.71, -157) (0, -157); cubic (86.71, -157) (157, -86.71) (157, 0); close; move (143, 0); cubic (143, 78.98) (78.98, 143) (0, 143); cubic (-78.98, 143) (-143, 78.98) (-143, 0); cubic (-143, -78.98) (-78.98, -143) (0, -143); cubic (78.98, -143) (143, -78.98) (143, 0); close; } ease hold;
  100% path { move (157, 0); cubic (157, 86.71) (86.71, 157) (0, 157); cubic (-86.71, 157) (-157, 86.71) (-157, 0); cubic (-157, -86.71) (-86.71, -157) (0, -157); cubic (86.71, -157) (157, -86.71) (157, 0); close; move (143, 0); cubic (143, 78.98) (78.98, 143) (0, 143); cubic (-78.98, 143) (-143, 78.98) (-143, 0); cubic (-143, -78.98) (-78.98, -143) (0, -143); cubic (78.98, -143) (143, -78.98) (143, 0); close; };
};
keyframes body.turn.ticks.t5.commands {
  start 11499.990000000002ms;
  duration 5099.999999999996ms;
  0% path { move (74, 128.17); line (63, 109.12); } ease easeInOut;
  11.764705882352914% path { move (74, 128.17); line (0, 0); } ease hold;
  100% path { move (74, 128.17); line (0, 0); };
};
keyframes body.turn.ticks.t6.commands {
  start 11559.99ms;
  duration 5039.999999999998ms;
  0% path { move (0, 148); line (0, 118); } ease easeInOut;
  11.904761904761873% path { move (0, 148); line (0, 0); } ease hold;
  100% path { move (0, 148); line (0, 0); };
};
step body.turn.innerRim.visible { at 11600ms; value true; };

keyframes body.turn.innerRim.commands {
  start 11600.01ms;
  duration 18399.989999999998ms;
  0% path { move (148, 0); cubic (148, 81.74) (81.74, 148) (0, 148); cubic (-81.74, 148) (-148, 81.74) (-148, 0); cubic (-148, -81.74) (-81.74, -148) (0, -148); cubic (81.74, -148) (148, -81.74) (148, 0); close; } ease easeInOut;
  4.347719754195517% path { move (136, 0); cubic (136, 75.11) (75.11, 136) (0, 136); cubic (-75.11, 136) (-136, 75.11) (-136, 0); cubic (-136, -75.11) (-75.11, -136) (0, -136); cubic (75.11, -136) (136, -75.11) (136, 0); close; } ease hold;
  100% path { move (136, 0); cubic (136, 75.11) (75.11, 136) (0, 136); cubic (-75.11, 136) (-136, 75.11) (-136, 0); cubic (-136, -75.11) (-75.11, -136) (0, -136); cubic (75.11, -136) (136, -75.11) (136, 0); close; };
};
keyframes body.turn.ticks.t7.commands {
  start 11619.99ms;
  duration 4979.999999999998ms;
  0% path { move (-74, 128.17); line (-63, 109.12); } ease easeInOut;
  12.048192771084342% path { move (-74, 128.17); line (0, 0); } ease hold;
  100% path { move (-74, 128.17); line (0, 0); };
};
keyframes body.turn.ticks.t8.commands {
  start 11679.990000000002ms;
  duration 4919.999999999996ms;
  0% path { move (-128.17, 74); line (-109.12, 63); } ease easeInOut;
  12.195121951219484% path { move (-128.17, 74); line (0, 0); } ease hold;
  100% path { move (-128.17, 74); line (0, 0); };
};
keyframes body.turn.ticks.t9.commands {
  start 11739.99ms;
  duration 4859.999999999998ms;
  0% path { move (-148, 0); line (-118, 0); } ease easeInOut;
  12.345679012345684% path { move (-148, 0); line (0, 0); } ease hold;
  100% path { move (-148, 0); line (0, 0); };
};
keyframes body.turn.ticks.t10.commands {
  start 11799.99ms;
  duration 4799.999999999998ms;
  0% path { move (-128.17, -74); line (-109.12, -63); } ease easeInOut;
  12.500000000000005% path { move (-128.17, -74); line (0, 0); } ease hold;
  100% path { move (-128.17, -74); line (0, 0); };
};
keyframes body.turn.ticks.t11.commands {
  start 11859.99ms;
  duration 4739.999999999998ms;
  0% path { move (-74, -128.17); line (-63, -109.12); } ease easeInOut;
  12.658227848101234% path { move (-74, -128.17); line (0, 0); } ease hold;
  100% path { move (-74, -128.17); line (0, 0); };
};
keyframes body.bike.bars.trim.end {
  start 12500.01ms;
  duration 3000ms;
  0% 0 ease easeInOut;
  26.666000000000047% 1 ease hold;
  100% 1;
};
keyframes body.bike.chain.trim.end {
  start 12600ms;
  duration 3000ms;
  0% 0 ease easeInOut;
  30% 1 ease hold;
  100% 1;
};
keyframes body.bike.loop.trim.end {
  start 12699.99ms;
  duration 2900.01ms;
  0% 0 ease easeInOut;
  44.82812128234042% 1 ease hold;
  100% 1;
};
keyframes body.bike.seatTube.trim.end {
  start 12800.009999999998ms;
  duration 2799.9900000000016ms;
  0% 0 ease easeInOut;
  32.14297193918554% 1 ease hold;
  100% 1;
};
keyframes camera(main).position.x {
  start 13800ms;
  duration 1200ms;
  0% -185 ease hold;
  100% -185;
};
keyframes camera(main).position.y {
  start 13800ms;
  duration 1700.0100000000002ms;
  0% -40 ease hold;
  100% -40;
};
keyframes camera(main).zoom {
  start 13800ms;
  duration 1700.0100000000002ms;
  0% 0.92 ease hold;
  100% 0.92;
};
seal 15000ms;
keyframes body.position.x {
  start 15000ms;
  duration 15000ms;
  0% 0 ease easeInOut;
  21.333399999999987% 1972.9202 ease hold;
  100% 1972.9202;
};
keyframes body.turn.rotation {
  start 15000ms;
  duration 12000ms;
  0% 0deg ease easeInOut;
  26.66674999999999% 720deg ease hold;
  100% 720deg;
};
keyframes camera(main).position.x {
  start 15000ms;
  duration 9999.989999999998ms;
  0% -185 ease linear;
  2.4999024999025163% -179.5022 ease linear;
  5.000105000105004% -131.2186 ease linear;
  7.500007500007501% -31.479 ease linear;
  9.999909999910018% 119.7164 ease linear;
  12.500112500112504% 322.3676 ease linear;
  15.000015000015003% 576.4748 ease linear;
  17.499917499917483% 882.0379 ease linear;
  20.000120000120024% 1190.0676 ease linear;
  22.500022500022503% 1447.4637 ease linear;
  24.999924999924986% 1653.4038 ease linear;
  27.50012750012749% 1807.8881 ease linear;
  30.000030000030005% 1910.9165 ease linear;
  32.49993249993252% 1962.489 ease linear;
  35.00013500013499% 1971.2757 ease linear;
  37.50003750003751% 1972.9202 ease hold;
  100% 1972.9202;
};
keyframes cues.cue4.opacity {
  start 15200.01ms;
  duration 14799.99ms;
  0% 0 ease easeOut;
  2.3647313275211768% 1 ease hold;
  28.716100483851665% 1 ease easeIn;
  31.081034514212508% 0 ease hold;
  100% 0;
};
keyframes body.bike.bars.trim.end {
  start 15500.01ms;
  duration 14499.99ms;
  0% 1 ease easeInOut;
  5.517107253177426% 0 ease hold;
  100% 0;
};
keyframes camera(main).position.y {
  start 15500.01ms;
  duration 9499.979999999998ms;
  0% -40 ease easeInOut;
  34.21049307472227% -80 ease hold;
  100% -80;
};
keyframes camera(main).zoom {
  start 15500.01ms;
  duration 9499.979999999998ms;
  0% 0.92 ease easeInOut;
  34.21049307472227% 0.9 ease hold;
  100% 0.9;
};
keyframes body.bike.chain.trim.end {
  start 15600ms;
  duration 14400ms;
  0% 1 ease easeInOut;
  6.944374999999986% 0 ease hold;
  100% 0;
};
keyframes body.bike.seatTube.trim.end {
  start 15600ms;
  duration 14400ms;
  0% 1 ease easeInOut;
  6.25% 0 ease hold;
  100% 0;
};
keyframes body.bike.loop.trim.end {
  start 15600ms;
  duration 14400ms;
  0% 1 ease easeInOut;
  11.805625000000013% 0 ease hold;
  100% 0;
};
keyframes body.turn.hands.pondL.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (-120.42, -84.32); quadratic (-60.21, -42.16) (0, 0); } ease easeIn;
  6.716412898199328% path { move (-3.28, -2.29); quadratic (-1.64, -1.15) (0, 0); } ease hold;
  100% path { move (-3.28, -2.29); quadratic (-1.64, -1.15) (0, 0); };
};
keyframes body.turn.hands.pondR.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (127.31, -73.5); quadratic (63.65, -36.75) (0, 0); } ease easeIn;
  6.716412898199328% path { move (3.46, -2); quadratic (1.73, -1) (0, 0); } ease hold;
  100% path { move (3.46, -2); quadratic (1.73, -1) (0, 0); };
};
keyframes body.turn.ticks.t0.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (0, -148); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (0, -6); line (0, 0); } ease hold;
  100% path { move (0, -6); line (0, 0); };
};
keyframes body.turn.ticks.t1.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (74, -128.17); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (3, -5.2); line (0, 0); } ease hold;
  100% path { move (3, -5.2); line (0, 0); };
};
keyframes body.turn.ticks.t2.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (128.17, -74); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (5.2, -3); line (0, 0); } ease hold;
  100% path { move (5.2, -3); line (0, 0); };
};
keyframes body.turn.ticks.t3.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (148, 0); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (6, 0); line (0, 0); } ease hold;
  100% path { move (6, 0); line (0, 0); };
};
keyframes body.turn.ticks.t4.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (128.17, 74); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (5.2, 3); line (0, 0); } ease hold;
  100% path { move (5.2, 3); line (0, 0); };
};
keyframes body.turn.ticks.t5.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (74, 128.17); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (3, 5.2); line (0, 0); } ease hold;
  100% path { move (3, 5.2); line (0, 0); };
};
keyframes body.turn.ticks.t6.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (0, 148); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (0, 6); line (0, 0); } ease hold;
  100% path { move (0, 6); line (0, 0); };
};
keyframes body.turn.ticks.t7.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (-74, 128.17); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (-3, 5.2); line (0, 0); } ease hold;
  100% path { move (-3, 5.2); line (0, 0); };
};
keyframes body.turn.ticks.t8.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (-128.17, 74); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (-5.2, 3); line (0, 0); } ease hold;
  100% path { move (-5.2, 3); line (0, 0); };
};
keyframes body.turn.ticks.t9.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (-148, 0); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (-6, 0); line (0, 0); } ease hold;
  100% path { move (-6, 0); line (0, 0); };
};
keyframes body.turn.ticks.t10.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (-128.17, -74); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (-5.2, -3); line (0, 0); } ease hold;
  100% path { move (-5.2, -3); line (0, 0); };
};
keyframes body.turn.ticks.t11.commands {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% path { move (-74, -128.17); line (0, 0); } ease easeIn;
  6.716412898199328% path { move (-3, -5.2); line (0, 0); } ease hold;
  100% path { move (-3, -5.2); line (0, 0); };
};
keyframes body.turn.hub.scale {
  start 16599.989999999998ms;
  duration 13400.010000000002ms;
  0% (1.4, 1.4) ease easeIn;
  10.44782802400895% (14.6, 14.6) ease hold;
  100% (14.6, 14.6);
};
step horizon.visible { at 17000ms; value true; };

step ground.visible { at 17000ms; value true; };

keyframes horizon.trim.end {
  start 17000.010000000002ms;
  duration 12999.989999999998ms;
  0% 0 ease easeInOut;
  12.307624852019103% 1 ease hold;
  100% 1;
};
keyframes ground.scale.x {
  start 17000.010000000002ms;
  duration 12999.989999999998ms;
  0% 0 ease easeInOut;
  12.307624852019103% 1 ease hold;
  100% 1;
};
keyframes body.position.y {
  start 18000ms;
  duration 4400.010000000002ms;
  0% 0 ease easeInOut;
  20.454498967047794% 28 ease easeIn;
  43.181492769334554% -15 ease linear;
  100% -190;
};
keyframes body.turn.ring.commands {
  start 18000ms;
  duration 6000ms;
  0% path { move (157, 0); cubic (157, 86.71) (86.71, 157) (0, 157); cubic (-86.71, 157) (-157, 86.71) (-157, 0); cubic (-157, -86.71) (-86.71, -157) (0, -157); cubic (86.71, -157) (157, -86.71) (157, 0); close; move (143, 0); cubic (143, 78.98) (78.98, 143) (0, 143); cubic (-78.98, 143) (-143, 78.98) (-143, 0); cubic (-143, -78.98) (-78.98, -143) (0, -143); cubic (78.98, -143) (143, -78.98) (143, 0); close; } ease easeInOut;
  10% path { move (157, 0); cubic (157, 86.71) (86.71, 157) (0, 157); cubic (-86.71, 157) (-157, 86.71) (-157, 0); cubic (-157, -86.71) (-86.71, -157) (0, -157); cubic (86.71, -157) (157, -86.71) (157, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease hold;
  100% path { move (157, 0); cubic (157, 86.71) (86.71, 157) (0, 157); cubic (-86.71, 157) (-157, 86.71) (-157, 0); cubic (-157, -86.71) (-86.71, -157) (0, -157); cubic (86.71, -157) (157, -86.71) (157, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; };
};
step body.turn.hands.visible { at 18700ms; value false; };

step body.turn.ticks.t0.visible { at 18700ms; value false; };

step body.turn.ticks.t1.visible { at 18700ms; value false; };

step body.turn.ticks.t2.visible { at 18700ms; value false; };

step body.turn.ticks.t3.visible { at 18700ms; value false; };

step body.turn.ticks.t4.visible { at 18700ms; value false; };

step body.turn.ticks.t5.visible { at 18700ms; value false; };

step body.turn.ticks.t6.visible { at 18700ms; value false; };

step body.turn.ticks.t7.visible { at 18700ms; value false; };

step body.turn.ticks.t8.visible { at 18700ms; value false; };

step body.turn.ticks.t9.visible { at 18700ms; value false; };

step body.turn.ticks.t10.visible { at 18700ms; value false; };

step body.turn.ticks.t11.visible { at 18700ms; value false; };

step body.turn.hub.visible { at 18700ms; value false; };

step body.turn.innerRim.visible { at 18700ms; value false; };

seal 20000ms;
keyframes cues.cue5.opacity {
  start 20199.989999999998ms;
  duration 9800.010000000002ms;
  0% 0 ease easeOut;
  3.571526967829645% 1 ease hold;
  43.36740472713805% 1 ease easeIn;
  46.93893169496769% 0 ease hold;
  100% 0;
};
step body.rays.r0.visible { at 21000ms; value true; };

keyframes body.rays.r0.commands {
  start 21000ms;
  duration 5600.010000000002ms;
  0% path { move (0, -169); quadratic (0, -169) (0, -169); } ease easeOut;
  16.071399872500223% path { move (0, -169); quadratic (0, -184) (0, -199); } ease hold;
  35.71440050999911% path { move (0, -169); quadratic (0, -184) (0, -199); } ease easeInOut;
  53.57133290833407% path { move (0, -169); quadratic (0, -191.6) (0, -203); } ease easeInOut;
  71.42826530666903% path { move (0, -203.54); quadratic (0, -235.64) (0, -242.54); } ease easeInOut;
  100% path { move (0, -40); quadratic (0, -40) (0, -40); };
};
step body.rays.r1.visible { at 21060ms; value true; };

keyframes body.rays.r1.commands {
  start 21060.000000000004ms;
  duration 5540.009999999998ms;
  0% path { move (91.23, -142.29); quadratic (91.23, -142.29) (91.23, -142.29); } ease easeOut;
  16.245458040689396% path { move (91.23, -142.29); quadratic (99.32, -154.92) (107.42, -167.55); } ease hold;
  35.01816783724215% path { move (91.23, -142.29); quadratic (99.32, -154.92) (107.42, -167.55); } ease easeInOut;
  53.068496266252176% path { move (91.23, -142.29); quadratic (99.32, -162.52) (107.42, -171.55); } ease easeInOut;
  71.1188246952622% path { move (87.37, -159.66); quadratic (95.47, -189.39) (103.57, -193.92); } ease easeInOut;
  100% path { move (8.56, -26.9); quadratic (8.56, -26.9) (8.56, -26.9); };
};
step body.rays.r2.visible { at 21120ms; value true; };

keyframes body.rays.r2.commands {
  start 21120.000000000004ms;
  duration 5480.009999999998ms;
  0% path { move (147.66, -82.27); quadratic (147.66, -82.27) (147.66, -82.27); } ease easeOut;
  16.423327694657498% path { move (147.66, -82.27); quadratic (160.76, -89.58) (173.87, -96.88); } ease hold;
  34.306689221370014% path { move (147.66, -82.27); quadratic (160.76, -89.58) (173.87, -96.88); } ease easeInOut;
  52.55464862290392% path { move (147.66, -82.27); quadratic (160.76, -97.18) (173.87, -100.88); } ease easeInOut;
  70.80260802443783% path { move (145.84, -89.22); quadratic (158.94, -113.63) (172.05, -112.83); } ease easeInOut;
  100% path { move (16.42, -13.76); quadratic (16.42, -13.76) (16.42, -13.76); };
};
step body.rays.r3.visible { at 21180ms; value true; };

keyframes body.rays.r3.commands {
  start 21180ms;
  duration 5420.010000000002ms;
  0% path { move (169, 0); quadratic (169, 0) (169, 0); } ease easeOut;
  16.605135414879303% path { move (169, 0); quadratic (184, 0) (199, 0); } ease hold;
  33.579458340482795% path { move (169, 0); quadratic (184, 0) (199, 0); } ease easeInOut;
  52.02942429995515% path { move (169, 0); quadratic (184, -7.6) (199, -4); } ease easeInOut;
  70.4793902594275% path { move (169, 0); quadratic (184, -17.1) (199, -9); } ease easeInOut;
  100% path { move (20, 0); quadratic (20, 0) (20, 0); };
};
step body.rays.r4.visible { at 21240ms; value true; };

keyframes body.rays.r4.commands {
  start 21240ms;
  duration 5360.010000000002ms;
  0% path { move (142.29, 91.23); quadratic (142.29, 91.23) (142.29, 91.23); } ease easeOut;
  16.791013449601767% path { move (142.29, 91.23); quadratic (154.92, 99.32) (167.55, 107.42); } ease hold;
  32.83594620159293% path { move (142.29, 91.23); quadratic (154.92, 99.32) (167.55, 107.42); } ease easeInOut;
  51.49244124544542% path { move (142.29, 91.23); quadratic (154.92, 91.72) (167.55, 103.42); } ease easeInOut;
  70.14893628929791% path { move (142.29, 91.23); quadratic (154.92, 82.22) (167.55, 98.42); } ease easeInOut;
  100% path { move (16.84, 10.8); quadratic (16.84, 10.8) (16.84, 10.8); };
};
step body.rays.r5.visible { at 21300ms; value true; };

keyframes body.rays.r5.commands {
  start 21300ms;
  duration 5300.010000000002ms;
  0% path { move (82.27, 147.66); quadratic (82.27, 147.66) (82.27, 147.66); } ease easeOut;
  16.981100035660305% path { move (82.27, 147.66); quadratic (89.58, 160.76) (96.88, 173.87); } ease hold;
  32.07559985735878% path { move (82.27, 147.66); quadratic (89.58, 160.76) (96.88, 173.87); } ease easeInOut;
  50.943300106980914% path { move (82.27, 147.66); quadratic (89.58, 153.16) (96.88, 169.87); } ease easeInOut;
  69.81100035660303% path { move (82.27, 147.66); quadratic (89.58, 143.66) (96.88, 164.87); } ease easeInOut;
  100% path { move (9.74, 17.47); quadratic (9.74, 17.47) (9.74, 17.47); };
};
step body.rays.r6.visible { at 21360ms; value true; };

keyframes body.rays.r6.commands {
  start 21360.000000000004ms;
  duration 5240.009999999998ms;
  0% path { move (0, 169); quadratic (0, 169) (0, 169); } ease easeOut;
  17.17553974133631% path { move (0, 169); quadratic (0, 184) (0, 199); } ease hold;
  31.297841034654496% path { move (0, 169); quadratic (0, 184) (0, 199); } ease easeInOut;
  50.3815832412533% path { move (0, 169); quadratic (0, 176.4) (0, 195); } ease easeInOut;
  69.46532544785211% path { move (0, 169); quadratic (0, 166.9) (0, 190); } ease easeInOut;
  100% path { move (0, 20); quadratic (0, 20) (0, 20); };
};
step body.rays.r7.visible { at 21420ms; value true; };

keyframes body.rays.r7.commands {
  start 21420.000000000004ms;
  duration 5180.009999999998ms;
  0% path { move (-91.23, 142.29); quadratic (-91.23, 142.29) (-91.23, 142.29); } ease easeOut;
  17.3744838330428% path { move (-91.23, 142.29); quadratic (-99.32, 154.92) (-107.42, 167.55); } ease hold;
  30.502064667828805% path { move (-91.23, 142.29); quadratic (-99.32, 154.92) (-107.42, 167.55); } ease easeInOut;
  49.80685365472262% path { move (-91.23, 142.29); quadratic (-99.32, 147.32) (-107.42, 163.55); } ease easeInOut;
  69.11164264161643% path { move (-91.23, 142.29); quadratic (-99.32, 137.82) (-107.42, 158.55); } ease easeInOut;
  100% path { move (-10.8, 16.84); quadratic (-10.8, 16.84) (-10.8, 16.84); };
};
step body.rays.r8.visible { at 21480ms; value true; };

keyframes body.rays.r8.commands {
  start 21480ms;
  duration 5120.010000000002ms;
  0% path { move (-147.66, 82.27); quadratic (-147.66, 82.27) (-147.66, 82.27); } ease easeOut;
  17.578090667791656% path { move (-147.66, 82.27); quadratic (-160.76, 89.58) (-173.87, 96.88); } ease hold;
  29.68763732883337% path { move (-147.66, 82.27); quadratic (-160.76, 89.58) (-173.87, 96.88); } ease easeInOut;
  49.21865386981664% path { move (-147.66, 82.27); quadratic (-160.76, 81.98) (-173.87, 92.88); } ease easeInOut;
  68.74967041079991% path { move (-147.66, 82.27); quadratic (-160.76, 72.48) (-173.87, 87.88); } ease easeInOut;
  100% path { move (-17.47, 9.74); quadratic (-17.47, 9.74) (-17.47, 9.74); };
};
step body.rays.r9.visible { at 21540ms; value true; };

keyframes body.rays.r9.commands {
  start 21540ms;
  duration 5060.010000000002ms;
  0% path { move (-169, 0); quadratic (-169, 0) (-169, 0); } ease easeOut;
  17.78652611358475% path { move (-169, 0); quadratic (-184, 0) (-199, 0); } ease hold;
  28.853895545661008% path { move (-169, 0); quadratic (-184, 0) (-199, 0); } ease easeInOut;
  48.61650471046498% path { move (-169, 0); quadratic (-184, -7.6) (-199, -4); } ease easeInOut;
  68.37911387526894% path { move (-169, 0); quadratic (-184, -17.1) (-199, -9); } ease easeInOut;
  100% path { move (-20, 0); quadratic (-20, 0) (-20, 0); };
};
step body.rays.r10.visible { at 21600ms; value true; };

keyframes body.rays.r10.commands {
  start 21600ms;
  duration 5000.010000000002ms;
  0% path { move (-142.29, -91.23); quadratic (-142.29, -91.23) (-142.29, -91.23); } ease easeOut;
  17.99996400007199% path { move (-142.29, -91.23); quadratic (-154.92, -99.32) (-167.55, -107.42); } ease hold;
  28.00014399971203% path { move (-142.29, -91.23); quadratic (-154.92, -99.32) (-167.55, -107.42); } ease easeInOut;
  47.999904000191975% path { move (-142.29, -91.23); quadratic (-154.92, -106.92) (-167.55, -111.42); } ease easeInOut;
  67.99966400067193% path { move (-140.12, -99.27); quadratic (-152.75, -124.47) (-165.38, -124.46); } ease easeInOut;
  100% path { move (-15.58, -15.45); quadratic (-15.58, -15.45) (-15.58, -15.45); };
};
step body.rays.r11.visible { at 21660ms; value true; };

keyframes body.rays.r11.commands {
  start 21660ms;
  duration 4940.010000000002ms;
  0% path { move (-82.27, -147.66); quadratic (-82.27, -147.66) (-82.27, -147.66); } ease easeOut;
  18.218586602051406% path { move (-82.27, -147.66); quadratic (-89.58, -160.76) (-96.88, -173.87); } ease hold;
  27.12565359179438% path { move (-82.27, -147.66); quadratic (-89.58, -160.76) (-96.88, -173.87); } ease easeInOut;
  47.36832516533365% path { move (-82.27, -147.66); quadratic (-89.58, -168.36) (-96.88, -177.87); } ease easeInOut;
  67.61099673887293% path { move (-78.41, -166.63); quadratic (-85.71, -196.83) (-93.01, -201.84); } ease easeInOut;
  100% path { move (-7.5, -28.46); quadratic (-7.5, -28.46) (-7.5, -28.46); };
};
keyframes body.position.y {
  start 22400.010000000002ms;
  duration 4200ms;
  0% -190 ease easeOut;
  23.809285714285664% -230 ease hold;
  61.90428571428561% -230 ease easeInOut;
  100% -330;
};
keyframes body.turn.ring.commands {
  start 24000ms;
  duration 2600.010000000002ms;
  0% path { move (157, 0); cubic (157, 86.71) (86.71, 157) (0, 157); cubic (-86.71, 157) (-157, 86.71) (-157, 0); cubic (-157, -86.71) (-86.71, -157) (0, -157); cubic (86.71, -157) (157, -86.71) (157, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease easeInOut;
  38.4610059192079% path { move (157, 0); cubic (157, 86.71) (86.71, 157) (0, 157); cubic (-86.71, 157) (-157, 86.71) (-157, 0); cubic (-157, -92.5) (-78, -172.54) (0, -191.54); cubic (78, -172.54) (157, -92.5) (157, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease easeInOut;
  100% path { move (20, 0); cubic (20, 11.05) (11.05, 20) (0, 20); cubic (-11.05, 20) (-20, 11.05) (-20, 0); cubic (-20, -14.4) (-6, -29) (0, -40); cubic (6, -29) (20, -14.4) (20, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; };
};
keyframes horizon.commands {
  start 24999.989999999998ms;
  duration 3000ms;
  0% path { move (772.92, 60); line (3172.92, 60); } ease easeInOut;
  100% path { move (1552.92, 0); line (2392.92, 0); };
};
keyframes camera(main).position.x {
  start 24999.989999999998ms;
  duration 3000ms;
  0% 1972.9202 ease easeInOut;
  100% 1972.9202;
};
keyframes camera(main).position.y {
  start 24999.989999999998ms;
  duration 3000ms;
  0% -80 ease easeInOut;
  100% -110;
};
keyframes camera(main).zoom {
  start 24999.989999999998ms;
  duration 3000ms;
  0% 0.9 ease easeInOut;
  100% 1;
};
seal 25000ms;
step ground.visible { at 25000ms; value false; };

keyframes cues.cue6.opacity {
  start 25200ms;
  duration 4800ms;
  0% 0 ease easeOut;
  7.291875000000042% 1 ease hold;
  80.20812499999995% 1 ease easeIn;
  87.5% 0 ease hold;
  100% 0;
};
step body.rays.r0.visible { at 26600ms; value false; };

step body.rays.r1.visible { at 26600ms; value false; };

step body.rays.r2.visible { at 26600ms; value false; };

step body.rays.r3.visible { at 26600ms; value false; };

step body.rays.r4.visible { at 26600ms; value false; };

step body.rays.r5.visible { at 26600ms; value false; };

step body.rays.r6.visible { at 26600ms; value false; };

step body.rays.r7.visible { at 26600ms; value false; };

step body.rays.r8.visible { at 26600ms; value false; };

step body.rays.r9.visible { at 26600ms; value false; };

step body.rays.r10.visible { at 26600ms; value false; };

step body.rays.r11.visible { at 26600ms; value false; };

keyframes body.position.y {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% -330 ease hold;
  41.17600345883361% -330 ease easeIn;
  100% -237.6571;
};
keyframes body.turn.ring.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (20, 0); cubic (20, 11.05) (11.05, 20) (0, 20); cubic (-11.05, 20) (-20, 11.05) (-20, 0); cubic (-20, -14.4) (-6, -29) (0, -40); cubic (6, -29) (20, -14.4) (20, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease hold;
  41.17600345883361% path { move (20, 0); cubic (20, 11.05) (11.05, 20) (0, 20); cubic (-11.05, 20) (-20, 11.05) (-20, 0); cubic (-20, -14.4) (-6, -29) (0, -40); cubic (6, -29) (20, -14.4) (20, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; } ease easeIn;
  100% path { move (19.53, 0); cubic (19.53, 11.05) (10.79, 20) (0, 20); cubic (-10.79, 20) (-19.53, 11.05) (-19.53, 0); cubic (-19.53, -15.25) (-5.86, -30.7) (0, -42.35); cubic (5.86, -30.7) (19.53, -15.25) (19.53, 0); close; move (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); cubic (0, 0) (0, 0) (0, 0); close; };
};
keyframes body.rays.r0.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (0, -40); quadratic (0, -40) (0, -40); } ease hold;
  100% path { move (0, -40); quadratic (0, -40) (0, -40); };
};
keyframes body.rays.r1.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (8.56, -26.9); quadratic (8.56, -26.9) (8.56, -26.9); } ease hold;
  100% path { move (8.56, -26.9); quadratic (8.56, -26.9) (8.56, -26.9); };
};
keyframes body.rays.r2.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (16.42, -13.76); quadratic (16.42, -13.76) (16.42, -13.76); } ease hold;
  100% path { move (16.42, -13.76); quadratic (16.42, -13.76) (16.42, -13.76); };
};
keyframes body.rays.r3.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (20, 0); quadratic (20, 0) (20, 0); } ease hold;
  100% path { move (20, 0); quadratic (20, 0) (20, 0); };
};
keyframes body.rays.r4.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (16.84, 10.8); quadratic (16.84, 10.8) (16.84, 10.8); } ease hold;
  100% path { move (16.84, 10.8); quadratic (16.84, 10.8) (16.84, 10.8); };
};
keyframes body.rays.r5.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (9.74, 17.47); quadratic (9.74, 17.47) (9.74, 17.47); } ease hold;
  100% path { move (9.74, 17.47); quadratic (9.74, 17.47) (9.74, 17.47); };
};
keyframes body.rays.r6.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (0, 20); quadratic (0, 20) (0, 20); } ease hold;
  100% path { move (0, 20); quadratic (0, 20) (0, 20); };
};
keyframes body.rays.r7.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (-10.8, 16.84); quadratic (-10.8, 16.84) (-10.8, 16.84); } ease hold;
  100% path { move (-10.8, 16.84); quadratic (-10.8, 16.84) (-10.8, 16.84); };
};
keyframes body.rays.r8.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (-17.47, 9.74); quadratic (-17.47, 9.74) (-17.47, 9.74); } ease hold;
  100% path { move (-17.47, 9.74); quadratic (-17.47, 9.74) (-17.47, 9.74); };
};
keyframes body.rays.r9.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (-20, 0); quadratic (-20, 0) (-20, 0); } ease hold;
  100% path { move (-20, 0); quadratic (-20, 0) (-20, 0); };
};
keyframes body.rays.r10.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (-15.58, -15.45); quadratic (-15.58, -15.45) (-15.58, -15.45); } ease hold;
  100% path { move (-15.58, -15.45); quadratic (-15.58, -15.45) (-15.58, -15.45); };
};
keyframes body.rays.r11.commands {
  start 26600.010000000002ms;
  duration 3399.989999999998ms;
  0% path { move (-7.5, -28.46); quadratic (-7.5, -28.46) (-7.5, -28.46); } ease hold;
  100% path { move (-7.5, -28.46); quadratic (-7.5, -28.46) (-7.5, -28.46); };
};
keyframes body.turn.rotation {
  start 27000ms;
  duration 3000ms;
  0% 720deg ease easeInOut;
  33.33299999999993% 900deg ease hold;
  100% 900deg;
};
keyframes horizon.commands {
  start 27999.989999999998ms;
  duration 2000.010000000002ms;
  0% path { move (1552.92, 0); line (2392.92, 0); } ease hold;
  100% path { move (1552.92, 0); line (2392.92, 0); };
};
keyframes camera(main).position.x {
  start 27999.989999999998ms;
  duration 2000.010000000002ms;
  0% 1972.9202 ease hold;
  100% 1972.9202;
};
keyframes camera(main).position.y {
  start 27999.989999999998ms;
  duration 2000.010000000002ms;
  0% -110 ease hold;
  100% -110;
};
keyframes camera(main).zoom {
  start 27999.989999999998ms;
  duration 2000.010000000002ms;
  0% 1 ease hold;
  100% 1;
};
seal 30000ms;
complete;
