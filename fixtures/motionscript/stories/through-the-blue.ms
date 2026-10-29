// THROUGH THE BLUE
// 30 seconds. A translucent jellyfish crosses a moonlit reef.
// 0:00 first light, 0:05 through the plants, 0:10 crossing light,
// 0:15 behind the rocks, 0:20 into the foreground, 0:25 suspended glow.
// Sound is not a MotionScript channel. Cues from the score stay in comments:
// underwater ambience throughout, a rounded tone on each pulse,
// a shimmer in the light at 0:11 and again at 0:28, fading by 0:30.
scene "through-the-blue" {
  version "0.2";
  viewport (1280, 720);
  background #031820;
  duration 30s;
  requires "paint.linearGradient";
  requires "paint.radialGradient";
  requires "compositing.blend";
  requires "compositing.isolatedOpacity";
  requires "effects.blur";
};
camera main {
  position (637.368, 544.211);
  zoom 0.76;
  rotation 0deg;
};
rectangle abyss {
  position (-1600, -900);
  size (6400, 2800);
  fill linear (0, 0) (0, 2800) 0 #0c6070 0.42 #084552 1 #021016;
  zIndex 0;
};
rectangle depth {
  position (-1600, 620);
  size (6400, 1200);
  opacity 0.55;
  fill linear (0, 0) (0, 1200) 0 #02182000 1 #010c10ee;
  zIndex 1;
};
group caustA {
  position (420, 260);
  blend screen;
  blur 28;
  opacity 0.42;
  zIndex 3;
  ellipse pool { size (760, 280); fill radial (0, 0) 260 0 #d8fbff66 1 #7ee8f000; };
};
group caustB {
  position (1680, 180);
  blend screen;
  blur 34;
  opacity 0.28;
  zIndex 3;
  ellipse pool { size (920, 340); fill radial (0, 0) 320 0 #efe7ff44 1 #9d8cff00; };
};
group farBed {
  zIndex 6;
    group kelpA {
    position (-24.737, 987.895);
    rotation -6deg;
    scale (1.15, 1.15);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #0d5c54ee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #14685ccc 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #0d5c54ee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
    group kelpB {
    position (215.263, 1037.895);
    rotation 8deg;
    scale (0.9, 0.9);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #0c4e48dd 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #18806ecc 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #0c4e48dd 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
    group kelpC {
    position (1280, 760);
    rotation -4deg;
    scale (1, 1);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #0e564eee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #1a7464bb 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #0e564eee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
    group kelpD {
    position (1830.246, 437.435);
    rotation 6deg;
    scale (0.85, 0.85);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #0b4642cc 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #157264aa 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #0b4642cc 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
};
group midBed {
  zIndex 10;
    group frondL {
    position (210, 770);
    rotation -8deg;
    scale (1.05, 1.05);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #127066ee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #1c8874cc 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #127066ee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
    group frondR {
    position (490, 800);
    rotation 10deg;
    scale (0.95, 0.95);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #0f5e56ee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #188672bb 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #0f5e56ee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
    group gapL {
    position (961.8, 518.38);
    rotation -12deg;
    scale (1.2, 1.2);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #14685cee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #238f78cc 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #14685cee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
    group gapTall {
    position (1178.4, 541.6);
    rotation 4deg;
    scale (1.35, 1.35);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #0e6258ee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #1b7c6acc 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #0e6258ee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
  line grassA { position (1219.474, 1007.895); from (0, 0); to (18, -230); stroke #1a8f78bb width 4 cap round; };
  line grassB { position (-124.737, 997.895); from (0, 0); to (-12, -190); stroke #14685cbb width 3 cap round; };
};
group dust {
  zIndex 7;
    circle mote0 { position (-24.737, 280); radius 1.6; fill #e7fdff; opacity 0.28; };
  circle mote1 { position (65.263, 350); radius 2.05; fill #e7fdff; opacity 0.36; };
  circle mote2 { position (155.263, 420); radius 2.5; fill #e7fdff; opacity 0.44; };
  circle mote3 { position (245.263, 490); radius 1.6; fill #e7fdff; opacity 0.28; };
  circle mote4 { position (335.263, 280); radius 2.05; fill #e7fdff; opacity 0.36; };
  circle mote5 { position (425.263, 350); radius 2.5; fill #e7fdff; opacity 0.44; };
  circle mote6 { position (515.263, 420); radius 1.6; fill #e7fdff; opacity 0.28; };
  circle mote7 { position (605.263, 490); radius 2.05; fill #e7fdff; opacity 0.36; };
  circle mote8 { position (695.263, 280); radius 2.5; fill #e7fdff; opacity 0.44; };
  circle mote9 { position (785.263, 350); radius 1.6; fill #e7fdff; opacity 0.28; };
};
group farBubbles {
  zIndex 8;
    circle b0 { position (200, 640); radius 3.5; fill #d7fbff55; stroke #f4fdffaa width 1.2; };
  circle b1 { position (460, 600); radius 4.5; fill #d7fbff55; stroke #f4fdffaa width 1.2; };
  circle b2 { position (720, 560); radius 5.5; fill #d7fbff55; stroke #f4fdffaa width 1.2; };
  circle b3 { position (980, 520); radius 6.5; fill #d7fbff55; stroke #f4fdffaa width 1.2; };
  circle b4 { position (1240, 480); radius 7.5; fill #d7fbff55; stroke #f4fdffaa width 1.2; };
};
group shaftBack {
  position (480, 180);
  rotation 18deg;
  blend screen;
  blur 16;
  opacity 0.55;
  zIndex 12;
  rectangle beam {
    position (-46, -640);
    pivot (46, 640);
    size (92, 1280);
    fill linear (0, 0) (92, 0) 0 #bff7ff00 0.5 #e7fdff88 1 #bff7ff00;
  };
};
group jelly {
  position (-60, 860);
  rotation 34deg;
  scale (1, 1);
  zIndex 18;
  group turn {
    scale (1, 1);
    group bellBreath {
      zIndex 10;
      group bellPulse {
        group glow {
          blur 20;
          opacity 0.85;
          ellipse halo {
            position (0, -8);
            size (210, 156);
            fill radial (-8, -16) 86 0 #f7fbffcc 0.4 #b7a6ff55 1 #5ee7f000;
          };
        };
        ellipse dome {
          position (0, -6);
          size (176, 126);
          opacity 0.58;
          fill radial (-22, -24) 84 0 #f8fdffee 0.26 #b9fff2aa 0.58 #8b7cff66 1 #14687800;
        };
        ellipse inner {
          position (8, -2);
          size (112, 80);
          opacity 0.74;
          fill radial (0, -4) 48 0 #f4ecffee 0.5 #b9a2ff99 1 #67e8f000;
        };
        ellipse ring {
          position (0, 8);
          size (86, 58);
          stroke #eddffc width 3.4;
        };
        ellipse rim {
          position (-34, -14);
          size (58, 40);
          opacity 0.22;
          fill radial (0, 0) 30 0 #e7fdffee 1 #7ef9ff00;
        };
        circle glint {
          position (0, -74);
          radius 4;
          fill #f7fdff;
          opacity 0.9;
        };
      };
    };
        group tent0 {
      position (-56, 39);
      rotation 30deg;
      zIndex 3;
      group wave {
        path strand { stroke #9aeff4c8 width 6.2 cap round; move (0, -4); quadratic (16, 28.6) (0, 52); };
        group mid {
          position (0, 52);
          path strand { stroke #9aeff4c8 width 4.3 cap round; move (0, -4); quadratic (-13.6, 27.5) (0, 50); };
          group tipPose {
            position (0, 50);
            group tipWave {
              path strand { stroke #e7fbffd4 width 2.5 cap round; move (0, -3); quadratic (9.6, 20.9) (0, 38); };
            };
          };
        };
      };
    };
    group tent1 {
      position (-40, 36.429);
      rotation 21.429deg;
      zIndex 6;
      group wave {
        path strand { stroke #d7c8ffc8 width 6.2 cap round; move (0, -4); quadratic (-14, 31.35) (0, 57); };
        group mid {
          position (0, 57);
          path strand { stroke #d7c8ffc8 width 4.3 cap round; move (0, -4); quadratic (11.9, 29.7) (0, 54); };
          group tipPose {
            position (0, 54);
            group tipWave {
              path strand { stroke #f4ecffd8 width 2.5 cap round; move (0, -3); quadratic (-8.4, 23.65) (0, 43); };
            };
          };
        };
      };
    };
    group tent2 {
      position (-24, 33.857);
      rotation 12.857deg;
      zIndex 2;
      group wave {
        path strand { stroke #9aeff4c8 width 6.2 cap round; move (0, -4); quadratic (16, 34.1) (0, 62); };
        group mid {
          position (0, 62);
          path strand { stroke #9aeff4c8 width 4.3 cap round; move (0, -4); quadratic (-13.6, 25.3) (0, 46); };
          group tipPose {
            position (0, 46);
            group tipWave {
              path strand { stroke #e7fbffd4 width 2.5 cap round; move (0, -3); quadratic (9.6, 26.4) (0, 48); };
            };
          };
        };
      };
    };
    group tent3 {
      position (-8, 31.286);
      rotation 4.286deg;
      zIndex 7;
      group wave {
        path strand { stroke #d7c8ffc8 width 6.2 cap round; move (0, -4); quadratic (-14, 28.6) (0, 52); };
        group mid {
          position (0, 52);
          path strand { stroke #d7c8ffc8 width 4.3 cap round; move (0, -4); quadratic (11.9, 27.5) (0, 50); };
          group tipPose {
            position (0, 50);
            group tipWave {
              path strand { stroke #f4ecffd8 width 2.5 cap round; move (0, -3); quadratic (-8.4, 29.15) (0, 53); };
            };
          };
        };
      };
    };
    group tent4 {
      position (8, 31.286);
      rotation -4.286deg;
      zIndex 1;
      group wave {
        path strand { stroke #9aeff4c8 width 6.2 cap round; move (0, -4); quadratic (16, 31.35) (0, 57); };
        group mid {
          position (0, 57);
          path strand { stroke #9aeff4c8 width 4.3 cap round; move (0, -4); quadratic (-13.6, 29.7) (0, 54); };
          group tipPose {
            position (0, 54);
            group tipWave {
              path strand { stroke #e7fbffd4 width 2.5 cap round; move (0, -3); quadratic (9.6, 20.9) (0, 38); };
            };
          };
        };
      };
    };
    group tent5 {
      position (24, 33.857);
      rotation -12.857deg;
      zIndex 8;
      group wave {
        path strand { stroke #d7c8ffc8 width 6.2 cap round; move (0, -4); quadratic (-14, 34.1) (0, 62); };
        group mid {
          position (0, 62);
          path strand { stroke #d7c8ffc8 width 4.3 cap round; move (0, -4); quadratic (11.9, 25.3) (0, 46); };
          group tipPose {
            position (0, 46);
            group tipWave {
              path strand { stroke #f4ecffd8 width 2.5 cap round; move (0, -3); quadratic (-8.4, 23.65) (0, 43); };
            };
          };
        };
      };
    };
    group tent6 {
      position (40, 36.429);
      rotation -21.429deg;
      zIndex 4;
      group wave {
        path strand { stroke #9aeff4c8 width 6.2 cap round; move (0, -4); quadratic (16, 28.6) (0, 52); };
        group mid {
          position (0, 52);
          path strand { stroke #9aeff4c8 width 4.3 cap round; move (0, -4); quadratic (-13.6, 27.5) (0, 50); };
          group tipPose {
            position (0, 50);
            group tipWave {
              path strand { stroke #e7fbffd4 width 2.5 cap round; move (0, -3); quadratic (9.6, 26.4) (0, 48); };
            };
          };
        };
      };
    };
    group tent7 {
      position (56, 39);
      rotation -30deg;
      zIndex 5;
      group wave {
        path strand { stroke #d7c8ffc8 width 6.2 cap round; move (0, -4); quadratic (-14, 31.35) (0, 57); };
        group mid {
          position (0, 57);
          path strand { stroke #d7c8ffc8 width 4.3 cap round; move (0, -4); quadratic (11.9, 29.7) (0, 54); };
          group tipPose {
            position (0, 54);
            group tipWave {
              path strand { stroke #f4ecffd8 width 2.5 cap round; move (0, -3); quadratic (-8.4, 29.15) (0, 53); };
            };
          };
        };
      };
    };
  };
};
group shaftCross {
  position (1340, 220);
  rotation 16deg;
  blend screen;
  blur 18;
  opacity 0.2;
  zIndex 22;
  rectangle beam {
    position (-70, -720);
    pivot (70, 720);
    size (140, 1440);
    fill linear (0, 0) (140, 0) 0 #c8fbff00 0.48 #f4feff99 1 #d8c8ff00;
  };
};
group shaftLast {
  position (2800, -68);
  rotation 20deg;
  blend screen;
  blur 14;
  opacity 0;
  zIndex 22;
  rectangle beam {
    position (-54, -560);
    pivot (54, 560);
    size (108, 1120);
    fill linear (0, 0) (108, 0) 0 #d5fbff00 0.5 #f7fdffaa 1 #c9b6ff00;
  };
};
group rock {
  zIndex 30;
  polygon mass {
    points ((1678.742, -13.256), (1968.846, -17.638), (2154.68, 65.081), (2232.953, 137.236), (2223.262, 337.344), (1972.319, 564.193), (1840.921, 519.086));
    fill #163e48;
  };
  polygon shade {
    points ((2193.439, 321.956), (1977.629, 517.047), (1864.627, 478.255), (2011.204, 350.193));
    fill #0e2c34;
  };
  polygon lit {
    points ((1718.523, 15.627), (1973.814, 11.771), (2137.348, 84.563), (1968.695, 109.564));
    fill #1e4c58;
  };
};
group maskFrond {
  position (1041.8, 538.38);
  rotation -14deg;
  zIndex 26;
      path leaf {
      fill linear (0, 0) (-10, -150) 0 #1a8a74ee 1 #06383000;
      move (0, 0);
      quadratic (-42.2, -63) (-14.6, -150);
      quadratic (6.1, -93) (20.7, -117);
      quadratic (9.2, -42) (0, 0);
      close;
    };
      path leafB {
      fill linear (0, 0) (22, -120) 0 #146456dd 1 #06383000;
      move (0, 0);
      quadratic (1, -50.4) (19, -120);
      quadratic (32.5, -74.4) (13.5, -93.6);
      quadratic (6, -33.6) (0, 0);
      close;
    };
};
group foreBed {
  zIndex 44;
    group cornerL {
    position (-164.737, 1027.895);
    rotation -16deg;
    scale (1.35, 1.35);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #178878ee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #2aa890cc 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #178878ee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
    group cornerR {
    position (1359.474, 1047.895);
    rotation 14deg;
    scale (1.25, 1.25);
        path leafA {
      fill linear (0, 0) (-18, -210) 0 #126e64ee 1 #06383000;
      move (0, 0);
      quadratic (-41.8, -88.2) (-21.4, -210);
      quadratic (-6.1, -130.2) (15.3, -163.8);
      quadratic (6.8, -58.8) (0, 0);
      close;
    };
        path leafB {
      fill linear (0, 0) (16, -250) 0 #1f9880cc 1 #06383000;
      move (0, 0);
      quadratic (-3.6, -105) (13.2, -250);
      quadratic (25.8, -155) (12.6, -195);
      quadratic (5.6, -70) (0, 0);
      close;
    };
        path leafC {
      fill linear (0, 0) (4, -180) 0 #126e64ee 1 #06383000;
      move (0, 0);
      quadratic (-11.4, -75.6) (1.8, -180);
      quadratic (11.7, -111.6) (9.9, -140.4);
      quadratic (4.4, -50.4) (0, 0);
      close;
    };
  };
};
circle heroBubble {
  position (742, 634);
  radius 26;
  fill #ffffff14;
  stroke #f3fdffcc width 2.2;
  zIndex 46;
};
group nearMotes {
  zIndex 48;
    circle mote0 { position (2200, 28); radius 2.2; fill #f4feff; opacity 0.45; };
  circle mote1 { position (2270, 78); radius 2.7; fill #f4feff; opacity 0.45; };
  circle mote2 { position (2340, 128); radius 3.2; fill #f4feff; opacity 0.45; };
  circle mote3 { position (2410, 28); radius 2.2; fill #f4feff; opacity 0.45; };
  circle mote4 { position (2480, 78); radius 2.7; fill #f4feff; opacity 0.45; };
  circle mote5 { position (2550, 128); radius 3.2; fill #f4feff; opacity 0.45; };
  circle mote6 { position (2620, 28); radius 2.2; fill #f4feff; opacity 0.45; };
  circle mote7 { position (2690, 78); radius 2.7; fill #f4feff; opacity 0.45; };
};
group nearBubbles {
  zIndex 50;
  circle bigA { position (1980, 646.286); radius 18; fill #ffffff10; stroke #f7fdffbb width 2; };
  circle bigB { position (2100, 596.286); radius 11; stroke #e7fbffaa width 1.6; };
};
group rise {
  opacity 0;
  zIndex 9;
    circle b0 { position (1920, 666.286); radius 2.4; fill #e5fbffaa; };
  circle b1 { position (1956, 652.286); radius 3.4; fill #e5fbffaa; };
  circle b2 { position (1992, 638.286); radius 4.4; fill #e5fbffaa; };
  circle b3 { position (2028, 624.286); radius 2.4; fill #e5fbffaa; };
  circle b4 { position (2064, 610.286); radius 3.4; fill #e5fbffaa; };
  circle b5 { position (2100, 596.286); radius 4.4; fill #e5fbffaa; };
};
ellipse vignette {
  space screen;
  position (640, 360);
  size (1680, 1080);
  opacity 0.42;
  zIndex 80;
  fill radial (0, 0) 430 0 #00000000 0.62 #00000000 1 #021016cc;
};
rectangle fade {
  space screen;
  position (0, 0);
  size (1280, 720);
  fill #04262e;
  opacity 0;
  zIndex 100;
};

// Camera. Hold the wide view for one second, track right, move closer,
// drift up through the light, widen on the rock, then pull back and stop at 0:28.
keyframes camera(main).position.x {
  start 0s;
  duration 30s;
  0% 637.368;
  0.833333% 637.368;
  1.666667% 637.368;
  2.5% 637.368;
  3.333333% 637.368;
  4.166667% 661.936;
  5% 660.047;
  5.833333% 701.224;
  6.666667% 785;
  7.5% 829.732;
  8.333333% 860.277;
  9.166667% 876.611;
  10% 878.714;
  10.833333% 866.567;
  11.666667% 884.745;
  12.5% 906.092;
  13.333333% 920.141;
  14.166667% 926.876;
  15% 926.281;
  15.833333% 918.342;
  16.666667% 903.043;
  17.5% 890.946;
  18.333333% 890.694;
  19.166667% 902.245;
  20% 925.556;
  20.833333% 960.588;
  21.666667% 1007.308;
  22.5% 1042.188;
  23.333333% 1071.58;
  24.166667% 1095.482;
  25% 1113.889;
  25.833333% 1126.798;
  26.666667% 1134.205;
  27.5% 1136.106;
  28.333333% 1132.5;
  29.166667% 1171.195;
  30% 1180;
  30.833333% 1193.431;
  31.666667% 1206.88;
  32.5% 1220.349;
  33.333333% 1233.837;
  34.166667% 1247.344;
  35% 1260.87;
  35.833333% 1274.414;
  36.666667% 1287.977;
  37.5% 1287.183;
  38.333333% 1297.659;
  39.166667% 1319.402;
  40% 1352.414;
  40.833333% 1384.358;
  41.666667% 1410.455;
  42.5% 1430.705;
  43.333333% 1445.107;
  44.166667% 1453.661;
  45% 1456.364;
  45.833333% 1453.218;
  46.666667% 1452.738;
  47.5% 1496.197;
  48.333333% 1572.618;
  49.166667% 1640.075;
  50% 1691.256;
  50.833333% 1744.27;
  51.666667% 1785.81;
  52.5% 1815.854;
  53.333333% 1835.755;
  54.166667% 1853.681;
  55% 1872.819;
  55.833333% 1888.625;
  56.666667% 1900.447;
  57.5% 1907.767;
  58.333333% 1910.246;
  59.166667% 1918.635;
  60% 1926.913;
  60.833333% 1935.083;
  61.666667% 1943.147;
  62.5% 1951.106;
  63.333333% 1958.964;
  64.166667% 1966.722;
  65% 1974.381;
  65.833333% 1988.164;
  66.666667% 2014.436;
  67.5% 2047.321;
  68.333333% 2092.37;
  69.166667% 2145.839;
  70% 2201.838;
  70.833333% 2239.079;
  71.666667% 2277.381;
  72.5% 2316.623;
  73.333333% 2362.963;
  74.166667% 2421.015;
  75% 2473.116;
  75.833333% 2519.27;
  76.666667% 2559.48;
  77.5% 2593.75;
  78.333333% 2622.085;
  79.166667% 2644.491;
  80% 2660.973;
  80.833333% 2671.537;
  81.666667% 2676.19;
  82.5% 2698.225;
  83.333333% 2714.785;
  84.166667% 2725.849;
  85% 2731.392;
  85.833333% 2731.391;
  86.666667% 2725.817;
  87.5% 2714.643;
  88.333333% 2697.838;
  89.166667% 2708.737;
  90% 2713.721;
  90.833333% 2712.778;
  91.666667% 2705.898;
  92.5% 2693.071;
  93.333333% 2674.286;
  94.166667% 2674.286;
  95% 2674.286;
  95.833333% 2674.286;
  96.666667% 2674.286;
  97.5% 2674.286;
  98.333333% 2674.286;
  99.166667% 2674.286;
  100% 2674.286;
};

keyframes camera(main).position.y {
  start 0s;
  duration 30s;
  0% 544.211;
  0.833333% 544.211;
  1.666667% 544.211;
  2.5% 544.211;
  3.333333% 544.211;
  4.166667% 560.334;
  5% 566.682;
  5.833333% 552.317;
  6.666667% 517.5;
  7.5% 492.264;
  8.333333% 474.519;
  9.166667% 464.276;
  10% 461.544;
  10.833333% 466.332;
  11.666667% 459.554;
  12.5% 451.469;
  13.333333% 446.406;
  14.166667% 444.373;
  15% 445.377;
  15.833333% 449.424;
  16.666667% 456.522;
  17.5% 463.534;
  18.333333% 464.583;
  19.166667% 459.694;
  20% 448.889;
  20.833333% 432.19;
  21.666667% 409.615;
  22.5% 396.897;
  23.333333% 386.083;
  24.166667% 377.172;
  25% 370.167;
  25.833333% 365.067;
  26.666667% 361.875;
  27.5% 360.59;
  28.333333% 361.214;
  29.166667% 355.279;
  30% 354.316;
  30.833333% 352.967;
  31.666667% 351.612;
  32.5% 350.251;
  33.333333% 348.884;
  34.166667% 347.51;
  35% 346.13;
  35.833333% 344.745;
  36.666667% 343.353;
  37.5% 344.58;
  38.333333% 344.05;
  39.166667% 341.765;
  40% 337.724;
  40.833333% 329.208;
  41.666667% 322.169;
  42.5% 316.607;
  43.333333% 312.524;
  44.166667% 309.918;
  45% 308.79;
  45.833333% 309.14;
  46.666667% 308.944;
  47.5% 300.576;
  48.333333% 284.92;
  49.166667% 271.354;
  50% 261.293;
  50.833333% 250.306;
  51.666667% 240.505;
  52.5% 231.908;
  53.333333% 224.696;
  54.166667% 217.334;
  55% 209.474;
  55.833333% 202.982;
  56.666667% 198.126;
  57.5% 195.12;
  58.333333% 194.102;
  59.166667% 192.115;
  60% 190.154;
  60.833333% 188.219;
  61.666667% 186.31;
  62.5% 184.424;
  63.333333% 182.563;
  64.166667% 180.726;
  65% 178.912;
  65.833333% 179.05;
  66.666667% 183.149;
  67.5% 192.165;
  68.333333% 203.541;
  69.166667% 216.113;
  70% 228.41;
  70.833333% 235.897;
  71.666667% 239.5;
  72.5% 234.767;
  73.333333% 219.111;
  74.166667% 207.383;
  75% 197.417;
  75.833333% 189.224;
  76.666667% 182.816;
  77.5% 178.208;
  78.333333% 175.415;
  79.166667% 174.454;
  80% 175.344;
  80.833333% 178.106;
  81.666667% 182.762;
  82.5% 179.683;
  83.333333% 177.894;
  84.166667% 177.402;
  85% 178.215;
  85.833333% 180.342;
  86.666667% 183.792;
  87.5% 188.576;
  88.333333% 194.703;
  89.166667% 188.162;
  90% 182.724;
  90.833333% 178.389;
  91.666667% 175.157;
  92.5% 173.027;
  93.333333% 172;
  94.166667% 172;
  95% 172;
  95.833333% 172;
  96.666667% 172;
  97.5% 172;
  98.333333% 172;
  99.166667% 172;
  100% 172;
};

keyframes camera(main).zoom {
  start 0s;
  duration 30s;
  0% 0.76;
  0.833333% 0.76;
  1.666667% 0.76;
  2.5% 0.76;
  3.333333% 0.76;
  4.166667% 0.789;
  5% 0.795;
  5.833333% 0.799;
  6.666667% 0.8;
  7.5% 0.81;
  8.333333% 0.82;
  9.166667% 0.83;
  10% 0.84;
  10.833333% 0.85;
  11.666667% 0.86;
  12.5% 0.87;
  13.333333% 0.88;
  14.166667% 0.89;
  15% 0.9;
  15.833333% 0.91;
  16.666667% 0.92;
  17.5% 0.94;
  18.333333% 0.96;
  19.166667% 0.98;
  20% 1;
  20.833333% 1.02;
  21.666667% 1.04;
  22.5% 1.05;
  23.333333% 1.06;
  24.166667% 1.07;
  25% 1.08;
  25.833333% 1.09;
  26.666667% 1.1;
  27.5% 1.11;
  28.333333% 1.12;
  29.166667% 1.13;
  30% 1.14;
  30.833333% 1.142;
  31.666667% 1.143;
  32.5% 1.145;
  33.333333% 1.147;
  34.166667% 1.148;
  35% 1.15;
  35.833333% 1.152;
  36.666667% 1.153;
  37.5% 1.155;
  38.333333% 1.157;
  39.166667% 1.158;
  40% 1.16;
  40.833333% 1.155;
  41.666667% 1.15;
  42.5% 1.145;
  43.333333% 1.14;
  44.166667% 1.135;
  45% 1.13;
  45.833333% 1.125;
  46.666667% 1.12;
  47.5% 1.115;
  48.333333% 1.108;
  49.166667% 1.1;
  50% 1.093;
  50.833333% 1.085;
  51.666667% 1.071;
  52.5% 1.05;
  53.333333% 1.022;
  54.166667% 0.99;
  55% 0.958;
  55.833333% 0.932;
  56.666667% 0.914;
  57.5% 0.904;
  58.333333% 0.9;
  59.166667% 0.906;
  60% 0.912;
  60.833333% 0.918;
  61.666667% 0.924;
  62.5% 0.93;
  63.333333% 0.936;
  64.166667% 0.942;
  65% 0.948;
  65.833333% 0.958;
  66.666667% 0.972;
  67.5% 0.982;
  68.333333% 0.994;
  69.166667% 1.003;
  70% 1.011;
  70.833333% 1.025;
  71.666667% 1.05;
  72.5% 1.073;
  73.333333% 1.08;
  74.166667% 1.056;
  75% 1.032;
  75.833333% 1.008;
  76.666667% 0.984;
  77.5% 0.96;
  78.333333% 0.936;
  79.166667% 0.912;
  80% 0.888;
  80.833333% 0.864;
  81.666667% 0.84;
  82.5% 0.828;
  83.333333% 0.815;
  84.166667% 0.803;
  85% 0.79;
  85.833333% 0.778;
  86.666667% 0.765;
  87.5% 0.753;
  88.333333% 0.74;
  89.166667% 0.733;
  90% 0.727;
  90.833333% 0.72;
  91.666667% 0.713;
  92.5% 0.707;
  93.333333% 0.7;
  94.166667% 0.7;
  95% 0.7;
  95.833333% 0.7;
  96.666667% 0.7;
  97.5% 0.7;
  98.333333% 0.7;
  99.166667% 0.7;
  100% 0.7;
};

// Jellyfish travel. Contractions at 0:02, 0:06.5, 0:12, 0:22 and a small settle at 0:26.5.
// Glides ease out. Travel behind the rock stays steady.
// Pulse tones sit on those contractions; the shimmer sits on the rim track.
keyframes jelly.position.x {
  start 0s;
  duration 30s;
  0% -60;
  3.333333% 150 ease easeIn;
  6.666667% 360 ease easeOut;
  11% 560 ease easeOut;
  16.666667% 740 ease easeIn;
  21.666667% 940 ease easeOut;
  28.333333% 1120 ease easeOut;
  30% 1180;
  36.666667% 1340 ease easeIn;
  40% 1430 ease easeOut;
  46% 1580 ease easeInOut;
  50% 1700;
  56.666667% 1920;
  58.333333% 1980;
  63.333333% 2140;
  70% 2300 ease easeIn;
  73.333333% 2400 ease easeOut;
  81.666667% 2700 ease easeOut;
  88.333333% 2860 ease easeOut;
  93.333333% 2960;
  100% 3020;
};

keyframes jelly.position.y {
  start 0s;
  duration 30s;
  0% 860;
  3.333333% 770 ease easeIn;
  6.666667% 680 ease easeOut;
  11% 575 ease easeOut;
  16.666667% 500 ease easeIn;
  21.666667% 400 ease easeOut;
  28.333333% 338 ease easeOut;
  30% 328;
  36.666667% 300 ease easeIn;
  40% 286 ease easeOut;
  46% 248 ease easeInOut;
  50% 220;
  56.666667% 176;
  58.333333% 164;
  63.333333% 132;
  70% 150 ease easeIn;
  73.333333% 108 ease easeOut;
  81.666667% 28 ease easeOut;
  88.333333% -8 ease easeOut;
  93.333333% -28;
  100% -40;
};

keyframes jelly.rotation {
  start 0s;
  duration 30s;
  0% 34deg;
  3.333333% 30deg ease easeIn;
  6.666667% 24deg ease easeOut;
  11% 16deg ease easeOut;
  16.666667% 12deg ease easeIn;
  21.666667% 3deg ease easeOut;
  28.333333% 7deg ease easeOut;
  30% 8deg;
  36.666667% 10deg ease easeIn;
  40% 16deg ease easeOut;
  46% 22deg ease easeInOut;
  50% 24deg;
  56.666667% 18deg;
  58.333333% 16deg;
  63.333333% 14deg;
  70% 4deg ease easeIn;
  73.333333% -8deg ease easeOut;
  81.666667% 4deg ease easeOut;
  88.333333% 12deg ease easeOut;
  93.333333% 16deg;
  100% 18deg;
};

// Approach. Scale stands in for coming toward the lens while the camera pulls back.
keyframes jelly.scale.x {
  start 0s;
  duration 30s;
  0% 1;
  50% 1;
  66.666667% 1.12 ease easeIn;
  73.333333% 1.55 ease easeOut;
  81.666667% 2.25;
  88.333333% 2.85 ease easeOut;
  93.333333% 3.25;
  100% 3.35;
};

keyframes jelly.scale.y {
  start 0s;
  duration 30s;
  0% 1;
  50% 1;
  66.666667% 1.12 ease easeIn;
  73.333333% 1.55 ease easeOut;
  81.666667% 2.25;
  88.333333% 2.85 ease easeOut;
  93.333333% 3.25;
  100% 3.35;
};

// Foreshorten while the bell angles away, then broaden as the near side turns in.
keyframes jelly.turn.scale.x {
  start 0s;
  duration 30s;
  0% 1;
  36.666667% 1;
  40% 0.92 ease easeInOut;
  50% 0.78;
  63.333333% 0.84 ease easeInOut;
  70% 1.08;
  73.333333% 1.14 ease easeOut;
  83.333333% 1.02;
  93.333333% 0.88;
  100% 0.88;
};


animate jelly.turn.bellBreath.scale.x {
  expression "1 + 0.045 * sin(local_t * 1.35)";
  start 0s;
  duration 30s;
};
animate jelly.turn.bellBreath.scale.y {
  expression "1 - 0.04 * sin(local_t * 1.35)";
  start 0s;
  duration 30s;
};
// Bell opens, then contracts. The last two seconds stay nearly open so the breath reads.
keyframes jelly.turn.bellBreath.bellPulse.scale.x {
  start 0s;
  duration 30s;
  0% 1.05;
  4.833333% 1.12 ease easeIn;
  6.666667% 0.74 ease easeOut;
  11.333333% 1.02;
  18.666667% 1.12 ease easeIn;
  21.666667% 0.72 ease easeOut;
  27.666667% 0.98;
  30% 1;
  36.666667% 1.08;
  40% 0.76 ease easeIn;
  45% 1 ease easeOut;
  68% 1.04;
  71.5% 1.12 ease easeIn;
  73.333333% 0.68 ease easeOut;
  81.666667% 1.06;
  86.833333% 1.16 ease easeIn;
  88.333333% 0.94 ease easeOut;
  93.333333% 1.03;
  100% 1.02;
};

keyframes jelly.turn.bellBreath.bellPulse.scale.y {
  start 0s;
  duration 30s;
  0% 0.96;
  4.833333% 0.88 ease easeIn;
  6.666667% 1.22 ease easeOut;
  11.333333% 0.98;
  18.666667% 0.88 ease easeIn;
  21.666667% 1.24 ease easeOut;
  27.666667% 1.02;
  30% 1;
  36.666667% 0.94;
  40% 1.18 ease easeIn;
  45% 1 ease easeOut;
  68% 0.97;
  71.5% 0.88 ease easeIn;
  73.333333% 1.28 ease easeOut;
  81.666667% 0.96;
  86.833333% 0.84 ease easeIn;
  88.333333% 1.06 ease easeOut;
  93.333333% 0.98;
  100% 0.98;
};

// Near rim brightens in the shaft at 0:11 and again as the last shaft crosses at 0:28.
keyframes jelly.turn.bellBreath.bellPulse.rim.opacity {
  start 0s;
  duration 30s;
  0% 0.22;
  33.333333% 0.28;
  37% 0.95 ease easeIn;
  40.5% 0.9 ease easeOut;
  44.666667% 0.3;
  90.666667% 0.25;
  93.333333% 0.85 ease easeInOut;
  97.333333% 0.4;
  100% 0.15;
};


// tent0: hang 30deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent0.rotation {
  start 0s;
  duration 30s;
  0% 30deg;
  5% 24.6deg ease easeIn;
  6.833333% 6deg ease easeOut;
  9.5% 36.6deg ease easeOut;
  16.666667% 30deg;
  20.166667% 23.4deg ease easeIn;
  21.833333% 6deg ease easeOut;
  25.666667% 39.528deg ease easeOut;
  32.333333% 30deg;
  38.333333% 30deg ease easeIn;
  40.166667% 6deg ease easeOut;
  44% 36.6deg;
  50% 32.4deg;
  70% 33.6deg ease easeIn;
  73.666667% 4.2deg ease easeOut;
  78.333333% 43.188deg ease easeOut;
  81.666667% 42deg;
  87.166667% 46deg ease easeIn;
  88.666667% 38deg;
  93.333333% 43deg ease easeOut;
  100% 41deg;
};

keyframes jelly.turn.tent0.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% 30deg;
  1.6% 30deg;
  5% 26.328deg;
  6.6% 24.6deg;
  6.833333% 24.299deg;
  8.433333% 6deg;
  9.5% 25.584deg;
  11.1% 36.6deg;
  16.666667% 30.329deg;
  18.266667% 30deg;
  20.166667% 26.417deg;
  21.766667% 23.4deg;
  21.833333% 23.372deg;
  23.433333% 6deg;
  25.666667% 33.687deg;
  27.266667% 39.528deg;
  32.333333% 30.549deg;
  33.933333% 30deg;
  38.333333% 30deg;
  39.933333% 30deg;
  40.166667% 29.611deg;
  41.766667% 6deg;
  44% 31.269deg;
  45.6% 36.6deg;
  50% 33.52deg;
  51.6% 32.4deg;
  70% 33.504deg;
  71.6% 33.6deg;
  73.666667% 24.26deg;
  75.266667% 4.2deg;
  78.333333% 38.605deg;
  79.933333% 43.188deg;
  81.666667% 42.274deg;
  83.266667% 42deg;
  87.166667% 44.836deg;
  88.666667% 45.927deg;
  88.766667% 46deg;
  90.266667% 38deg;
  93.333333% 41.286deg;
  94.933333% 43deg;
  100% 41.115deg;
};

animate jelly.turn.tent0.wave.rotation {
  expression "(0.12 + sin(local_t * 1.55 - 0) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent0.wave.mid.rotation {
  expression "(-0.16 + sin(local_t * 1.7 - 0.45) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent0.wave.mid.tipPose.tipWave.rotation {
  expression "(0.18 + sin(local_t * 1.85 - 0.95) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// tent1: hang 21.429deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent1.rotation {
  start 0s;
  duration 30s;
  0% 21.429deg;
  5% 17.571deg ease easeIn;
  6.833333% 4.286deg ease easeOut;
  9.5% 26.143deg ease easeOut;
  16.666667% 21.429deg;
  20.166667% 16.714deg ease easeIn;
  21.833333% 4.286deg ease easeOut;
  25.666667% 28.234deg ease easeOut;
  32.333333% 21.429deg;
  38.333333% 21.429deg ease easeIn;
  40.166667% 4.286deg ease easeOut;
  44% 26.143deg;
  50% 23.143deg;
  70% 24deg ease easeIn;
  73.666667% 3deg ease easeOut;
  78.333333% 30.849deg ease easeOut;
  81.666667% 33.429deg;
  87.166667% 37.429deg ease easeIn;
  88.666667% 29.429deg;
  93.333333% 34.429deg ease easeOut;
  100% 32.429deg;
};

keyframes jelly.turn.tent1.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% 21.429deg;
  1.6% 21.429deg;
  5% 18.806deg;
  6.6% 17.571deg;
  6.833333% 17.356deg;
  8.433333% 4.286deg;
  9.5% 18.274deg;
  11.1% 26.143deg;
  16.666667% 21.664deg;
  18.266667% 21.429deg;
  20.166667% 18.869deg;
  21.766667% 16.714deg;
  21.833333% 16.694deg;
  23.433333% 4.286deg;
  25.666667% 24.062deg;
  27.266667% 28.234deg;
  32.333333% 21.821deg;
  33.933333% 21.429deg;
  38.333333% 21.429deg;
  39.933333% 21.429deg;
  40.166667% 21.151deg;
  41.766667% 4.286deg;
  44% 22.335deg;
  45.6% 26.143deg;
  50% 23.943deg;
  51.6% 23.143deg;
  70% 23.931deg;
  71.6% 24deg;
  73.666667% 17.329deg;
  75.266667% 3deg;
  78.333333% 27.575deg;
  79.933333% 30.849deg;
  81.666667% 32.834deg;
  83.266667% 33.429deg;
  87.166667% 36.265deg;
  88.666667% 37.356deg;
  88.766667% 37.429deg;
  90.266667% 29.429deg;
  93.333333% 32.714deg;
  94.933333% 34.429deg;
  100% 32.544deg;
};

animate jelly.turn.tent1.wave.rotation {
  expression "(-0.1 + sin(local_t * 1.55 - 0.62) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent1.wave.mid.rotation {
  expression "(0.14 + sin(local_t * 1.7 - 1.07) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent1.wave.mid.tipPose.tipWave.rotation {
  expression "(-0.2 + sin(local_t * 1.85 - 1.57) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// tent2: hang 12.857deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent2.rotation {
  start 0s;
  duration 30s;
  0% 12.857deg;
  5% 10.543deg ease easeIn;
  6.833333% 2.571deg ease easeOut;
  9.5% 15.686deg ease easeOut;
  16.666667% 12.857deg;
  20.166667% 10.029deg ease easeIn;
  21.833333% 2.571deg ease easeOut;
  25.666667% 16.941deg ease easeOut;
  32.333333% 12.857deg;
  38.333333% 12.857deg ease easeIn;
  40.166667% 2.571deg ease easeOut;
  44% 15.686deg;
  50% 13.886deg;
  70% 14.4deg ease easeIn;
  73.666667% 1.8deg ease easeOut;
  78.333333% 18.509deg ease easeOut;
  81.666667% 24.857deg;
  87.166667% 28.857deg ease easeIn;
  88.666667% 20.857deg;
  93.333333% 25.857deg ease easeOut;
  100% 23.857deg;
};

keyframes jelly.turn.tent2.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% 12.857deg;
  1.6% 12.857deg;
  5% 11.283deg;
  6.6% 10.543deg;
  6.833333% 10.414deg;
  8.433333% 2.571deg;
  9.5% 10.965deg;
  11.1% 15.686deg;
  16.666667% 12.998deg;
  18.266667% 12.857deg;
  20.166667% 11.322deg;
  21.766667% 10.029deg;
  21.833333% 10.017deg;
  23.433333% 2.571deg;
  25.666667% 14.437deg;
  27.266667% 16.941deg;
  32.333333% 13.092deg;
  33.933333% 12.857deg;
  38.333333% 12.857deg;
  39.933333% 12.857deg;
  40.166667% 12.691deg;
  41.766667% 2.571deg;
  44% 13.401deg;
  45.6% 15.686deg;
  50% 14.366deg;
  51.6% 13.886deg;
  70% 14.359deg;
  71.6% 14.4deg;
  73.666667% 10.397deg;
  75.266667% 1.8deg;
  78.333333% 16.545deg;
  79.933333% 18.509deg;
  81.666667% 23.395deg;
  83.266667% 24.857deg;
  87.166667% 27.694deg;
  88.666667% 28.784deg;
  88.766667% 28.857deg;
  90.266667% 20.857deg;
  93.333333% 24.143deg;
  94.933333% 25.857deg;
  100% 23.972deg;
};

animate jelly.turn.tent2.wave.rotation {
  expression "(0.12 + sin(local_t * 1.55 - 1.24) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent2.wave.mid.rotation {
  expression "(-0.16 + sin(local_t * 1.7 - 1.69) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent2.wave.mid.tipPose.tipWave.rotation {
  expression "(0.18 + sin(local_t * 1.85 - 2.19) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// tent3: hang 4.286deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent3.rotation {
  start 0s;
  duration 30s;
  0% 4.286deg;
  5% 3.514deg ease easeIn;
  6.833333% 0.857deg ease easeOut;
  9.5% 5.229deg ease easeOut;
  16.666667% 4.286deg;
  20.166667% 3.343deg ease easeIn;
  21.833333% 0.857deg ease easeOut;
  25.666667% 5.647deg ease easeOut;
  32.333333% 4.286deg;
  38.333333% 4.286deg ease easeIn;
  40.166667% 0.857deg ease easeOut;
  44% 5.229deg;
  50% 4.629deg;
  70% 4.8deg ease easeIn;
  73.666667% 0.6deg ease easeOut;
  78.333333% 6.17deg ease easeOut;
  81.666667% 16.286deg;
  87.166667% 20.286deg ease easeIn;
  88.666667% 12.286deg;
  93.333333% 17.286deg ease easeOut;
  100% 15.286deg;
};

keyframes jelly.turn.tent3.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% 4.286deg;
  1.6% 4.286deg;
  5% 3.761deg;
  6.6% 3.514deg;
  6.833333% 3.471deg;
  8.433333% 0.857deg;
  9.5% 3.655deg;
  11.1% 5.229deg;
  16.666667% 4.333deg;
  18.266667% 4.286deg;
  20.166667% 3.774deg;
  21.766667% 3.343deg;
  21.833333% 3.339deg;
  23.433333% 0.857deg;
  25.666667% 4.812deg;
  27.266667% 5.647deg;
  32.333333% 4.364deg;
  33.933333% 4.286deg;
  38.333333% 4.286deg;
  39.933333% 4.286deg;
  40.166667% 4.23deg;
  41.766667% 0.857deg;
  44% 4.467deg;
  45.6% 5.229deg;
  50% 4.789deg;
  51.6% 4.629deg;
  70% 4.786deg;
  71.6% 4.8deg;
  73.666667% 3.466deg;
  75.266667% 0.6deg;
  78.333333% 5.515deg;
  79.933333% 6.17deg;
  81.666667% 13.955deg;
  83.266667% 16.286deg;
  87.166667% 19.122deg;
  88.666667% 20.213deg;
  88.766667% 20.286deg;
  90.266667% 12.286deg;
  93.333333% 15.571deg;
  94.933333% 17.286deg;
  100% 15.401deg;
};

animate jelly.turn.tent3.wave.rotation {
  expression "(-0.1 + sin(local_t * 1.55 - 1.86) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent3.wave.mid.rotation {
  expression "(0.14 + sin(local_t * 1.7 - 2.31) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent3.wave.mid.tipPose.tipWave.rotation {
  expression "(-0.2 + sin(local_t * 1.85 - 2.81) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// tent4: hang -4.286deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent4.rotation {
  start 0s;
  duration 30s;
  0% -4.286deg;
  5% -3.514deg ease easeIn;
  6.833333% -0.857deg ease easeOut;
  9.5% -5.229deg ease easeOut;
  16.666667% -4.286deg;
  20.166667% -3.343deg ease easeIn;
  21.833333% -0.857deg ease easeOut;
  25.666667% -5.647deg ease easeOut;
  32.333333% -4.286deg;
  38.333333% -4.286deg ease easeIn;
  40.166667% -0.857deg ease easeOut;
  44% -5.229deg;
  50% -4.629deg;
  70% -4.8deg ease easeIn;
  73.666667% -0.6deg ease easeOut;
  78.333333% -6.17deg ease easeOut;
  81.666667% 7.714deg;
  87.166667% 11.714deg ease easeIn;
  88.666667% 3.714deg;
  93.333333% 8.714deg ease easeOut;
  100% 6.714deg;
};

keyframes jelly.turn.tent4.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% -4.286deg;
  1.6% -4.286deg;
  5% -3.761deg;
  6.6% -3.514deg;
  6.833333% -3.471deg;
  8.433333% -0.857deg;
  9.5% -3.655deg;
  11.1% -5.229deg;
  16.666667% -4.333deg;
  18.266667% -4.286deg;
  20.166667% -3.774deg;
  21.766667% -3.343deg;
  21.833333% -3.339deg;
  23.433333% -0.857deg;
  25.666667% -4.812deg;
  27.266667% -5.647deg;
  32.333333% -4.364deg;
  33.933333% -4.286deg;
  38.333333% -4.286deg;
  39.933333% -4.286deg;
  40.166667% -4.23deg;
  41.766667% -0.857deg;
  44% -4.467deg;
  45.6% -5.229deg;
  50% -4.789deg;
  51.6% -4.629deg;
  70% -4.786deg;
  71.6% -4.8deg;
  73.666667% -3.466deg;
  75.266667% -0.6deg;
  78.333333% -5.515deg;
  79.933333% -6.17deg;
  81.666667% 4.515deg;
  83.266667% 7.714deg;
  87.166667% 10.551deg;
  88.666667% 11.642deg;
  88.766667% 11.714deg;
  90.266667% 3.714deg;
  93.333333% 7deg;
  94.933333% 8.714deg;
  100% 6.829deg;
};

animate jelly.turn.tent4.wave.rotation {
  expression "(0.12 + sin(local_t * 1.55 - 2.48) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent4.wave.mid.rotation {
  expression "(-0.16 + sin(local_t * 1.7 - 2.93) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent4.wave.mid.tipPose.tipWave.rotation {
  expression "(0.18 + sin(local_t * 1.85 - 3.43) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// tent5: hang -12.857deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent5.rotation {
  start 0s;
  duration 30s;
  0% -12.857deg;
  5% -10.543deg ease easeIn;
  6.833333% -2.571deg ease easeOut;
  9.5% -15.686deg ease easeOut;
  16.666667% -12.857deg;
  20.166667% -10.029deg ease easeIn;
  21.833333% -2.571deg ease easeOut;
  25.666667% -16.941deg ease easeOut;
  32.333333% -12.857deg;
  38.333333% -12.857deg ease easeIn;
  40.166667% -2.571deg ease easeOut;
  44% -15.686deg;
  50% -13.886deg;
  70% -14.4deg ease easeIn;
  73.666667% -1.8deg ease easeOut;
  78.333333% -18.509deg ease easeOut;
  81.666667% -0.857deg;
  87.166667% 3.143deg ease easeIn;
  88.666667% -4.857deg;
  93.333333% 0.143deg ease easeOut;
  100% -1.857deg;
};

keyframes jelly.turn.tent5.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% -12.857deg;
  1.6% -12.857deg;
  5% -11.283deg;
  6.6% -10.543deg;
  6.833333% -10.414deg;
  8.433333% -2.571deg;
  9.5% -10.965deg;
  11.1% -15.686deg;
  16.666667% -12.998deg;
  18.266667% -12.857deg;
  20.166667% -11.322deg;
  21.766667% -10.029deg;
  21.833333% -10.017deg;
  23.433333% -2.571deg;
  25.666667% -14.437deg;
  27.266667% -16.941deg;
  32.333333% -13.092deg;
  33.933333% -12.857deg;
  38.333333% -12.857deg;
  39.933333% -12.857deg;
  40.166667% -12.691deg;
  41.766667% -2.571deg;
  44% -13.401deg;
  45.6% -15.686deg;
  50% -14.366deg;
  51.6% -13.886deg;
  70% -14.359deg;
  71.6% -14.4deg;
  73.666667% -10.397deg;
  75.266667% -1.8deg;
  78.333333% -16.545deg;
  79.933333% -18.509deg;
  81.666667% -4.924deg;
  83.266667% -0.857deg;
  87.166667% 1.979deg;
  88.666667% 3.07deg;
  88.766667% 3.143deg;
  90.266667% -4.857deg;
  93.333333% -1.571deg;
  94.933333% 0.143deg;
  100% -1.742deg;
};

animate jelly.turn.tent5.wave.rotation {
  expression "(-0.1 + sin(local_t * 1.55 - 3.1) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent5.wave.mid.rotation {
  expression "(0.14 + sin(local_t * 1.7 - 3.55) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent5.wave.mid.tipPose.tipWave.rotation {
  expression "(-0.2 + sin(local_t * 1.85 - 4.05) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// tent6: hang -21.429deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent6.rotation {
  start 0s;
  duration 30s;
  0% -21.429deg;
  5% -17.571deg ease easeIn;
  6.833333% -4.286deg ease easeOut;
  9.5% -26.143deg ease easeOut;
  16.666667% -21.429deg;
  20.166667% -16.714deg ease easeIn;
  21.833333% -4.286deg ease easeOut;
  25.666667% -28.234deg ease easeOut;
  32.333333% -21.429deg;
  38.333333% -21.429deg ease easeIn;
  40.166667% -4.286deg ease easeOut;
  44% -26.143deg;
  50% -23.143deg;
  70% -24deg ease easeIn;
  73.666667% -3deg ease easeOut;
  78.333333% -30.849deg ease easeOut;
  81.666667% -9.429deg;
  87.166667% -5.429deg ease easeIn;
  88.666667% -13.429deg;
  93.333333% -8.429deg ease easeOut;
  100% -10.429deg;
};

keyframes jelly.turn.tent6.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% -21.429deg;
  1.6% -21.429deg;
  5% -18.806deg;
  6.6% -17.571deg;
  6.833333% -17.356deg;
  8.433333% -4.286deg;
  9.5% -18.274deg;
  11.1% -26.143deg;
  16.666667% -21.664deg;
  18.266667% -21.429deg;
  20.166667% -18.869deg;
  21.766667% -16.714deg;
  21.833333% -16.694deg;
  23.433333% -4.286deg;
  25.666667% -24.062deg;
  27.266667% -28.234deg;
  32.333333% -21.821deg;
  33.933333% -21.429deg;
  38.333333% -21.429deg;
  39.933333% -21.429deg;
  40.166667% -21.151deg;
  41.766667% -4.286deg;
  44% -22.335deg;
  45.6% -26.143deg;
  50% -23.943deg;
  51.6% -23.143deg;
  70% -23.931deg;
  71.6% -24deg;
  73.666667% -17.329deg;
  75.266667% -3deg;
  78.333333% -27.575deg;
  79.933333% -30.849deg;
  81.666667% -14.364deg;
  83.266667% -9.429deg;
  87.166667% -6.592deg;
  88.666667% -5.501deg;
  88.766667% -5.429deg;
  90.266667% -13.429deg;
  93.333333% -10.143deg;
  94.933333% -8.429deg;
  100% -10.313deg;
};

animate jelly.turn.tent6.wave.rotation {
  expression "(0.12 + sin(local_t * 1.55 - 3.72) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent6.wave.mid.rotation {
  expression "(-0.16 + sin(local_t * 1.7 - 4.17) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent6.wave.mid.tipPose.tipWave.rotation {
  expression "(0.18 + sin(local_t * 1.85 - 4.67) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// tent7: hang -30deg, tip pose lags the root by 0.48s.
keyframes jelly.turn.tent7.rotation {
  start 0s;
  duration 30s;
  0% -30deg;
  5% -24.6deg ease easeIn;
  6.833333% -6deg ease easeOut;
  9.5% -36.6deg ease easeOut;
  16.666667% -30deg;
  20.166667% -23.4deg ease easeIn;
  21.833333% -6deg ease easeOut;
  25.666667% -39.528deg ease easeOut;
  32.333333% -30deg;
  38.333333% -30deg ease easeIn;
  40.166667% -6deg ease easeOut;
  44% -36.6deg;
  50% -32.4deg;
  70% -33.6deg ease easeIn;
  73.666667% -4.2deg ease easeOut;
  78.333333% -43.188deg ease easeOut;
  81.666667% -18deg;
  87.166667% -14deg ease easeIn;
  88.666667% -22deg;
  93.333333% -17deg ease easeOut;
  100% -19deg;
};

keyframes jelly.turn.tent7.wave.mid.tipPose.rotation {
  start 0s;
  duration 30s;
  0% -30deg;
  1.6% -30deg;
  5% -26.328deg;
  6.6% -24.6deg;
  6.833333% -24.299deg;
  8.433333% -6deg;
  9.5% -25.584deg;
  11.1% -36.6deg;
  16.666667% -30.329deg;
  18.266667% -30deg;
  20.166667% -26.417deg;
  21.766667% -23.4deg;
  21.833333% -23.372deg;
  23.433333% -6deg;
  25.666667% -33.687deg;
  27.266667% -39.528deg;
  32.333333% -30.549deg;
  33.933333% -30deg;
  38.333333% -30deg;
  39.933333% -30deg;
  40.166667% -29.611deg;
  41.766667% -6deg;
  44% -31.269deg;
  45.6% -36.6deg;
  50% -33.52deg;
  51.6% -32.4deg;
  70% -33.504deg;
  71.6% -33.6deg;
  73.666667% -24.26deg;
  75.266667% -4.2deg;
  78.333333% -38.605deg;
  79.933333% -43.188deg;
  81.666667% -23.803deg;
  83.266667% -18deg;
  87.166667% -15.164deg;
  88.666667% -14.073deg;
  88.766667% -14deg;
  90.266667% -22deg;
  93.333333% -18.714deg;
  94.933333% -17deg;
  100% -18.885deg;
};

animate jelly.turn.tent7.wave.rotation {
  expression "(-0.1 + sin(local_t * 1.55 - 4.34) * 0.16 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent7.wave.mid.rotation {
  expression "(0.14 + sin(local_t * 1.7 - 4.79) * 0.22 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};
animate jelly.turn.tent7.wave.mid.tipPose.tipWave.rotation {
  expression "(-0.2 + sin(local_t * 1.85 - 5.29) * 0.3 * (1 - 0.35 * clamp((local_t - 26) / 4, 0, 1)))";
  start 0s;
  duration 30s;
};

// Plants sway in one current. Foreground beds slide left faster than the far reef.
animate farBed.kelpA.rotation {
  expression "0.05 * sin(local_t * 0.42 + 0)";
  start 0s;
  duration 30s;
};
animate farBed.kelpB.rotation {
  expression "-0.045 * sin(local_t * 0.42 + 0.7)";
  start 0s;
  duration 30s;
};
animate farBed.kelpC.rotation {
  expression "0.05 * sin(local_t * 0.42 + 1.4)";
  start 0s;
  duration 30s;
};
animate farBed.kelpD.rotation {
  expression "-0.045 * sin(local_t * 0.42 + 2.1)";
  start 0s;
  duration 30s;
};
animate midBed.frondL.rotation {
  expression "0.05 * sin(local_t * 0.42 + 2.8)";
  start 0s;
  duration 30s;
};
animate midBed.frondR.rotation {
  expression "-0.045 * sin(local_t * 0.42 + 3.5)";
  start 0s;
  duration 30s;
};
animate midBed.gapL.rotation {
  expression "0.05 * sin(local_t * 0.42 + 4.2)";
  start 0s;
  duration 30s;
};
animate midBed.gapTall.rotation {
  expression "-0.045 * sin(local_t * 0.42 + 4.9)";
  start 0s;
  duration 30s;
};
animate maskFrond.rotation {
  expression "0.05 * sin(local_t * 0.42 + 5.6)";
  start 0s;
  duration 30s;
};
animate foreBed.cornerL.rotation {
  expression "-0.045 * sin(local_t * 0.42 + 6.3)";
  start 0s;
  duration 30s;
};
animate foreBed.cornerR.rotation {
  expression "0.05 * sin(local_t * 0.42 + 7)";
  start 0s;
  duration 30s;
};

keyframes farBed.position.x {
  start 0s;
  duration 30s;
  0% 0;
  16.666667% 30;
  33.333333% 140 ease easeInOut;
  100% 280;
};

keyframes midBed.position.x {
  start 0s;
  duration 30s;
  0% 0;
  16.666667% 8;
  33.333333% 36;
  100% 70;
};

keyframes foreBed.position.x {
  start 0s;
  duration 30s;
  0% 0;
  16.666667% -16 ease easeInOut;
  33.333333% -120;
  100% -200;
};

keyframes maskFrond.position.x {
  start 0s;
  duration 30s;
  0% 1041.8;
  16.666667% 1031.8;
  33.333333% 961.8;
  100% 911.8;
};


animate caustA.position.x { expression "420 + sin(local_t * 0.23) * 70"; start 0s; duration 30s; };
animate caustB.position.x { expression "1680 + sin(local_t * 0.17 + 1.2) * 90"; start 0s; duration 30s; };
// First shaft sweeps the opening and the dust brightens inside it.
keyframes shaftBack.position.x {
  start 0s;
  duration 30s;
  0% 360;
  8% 520 ease easeInOut;
  16.666667% 700;
  100% 980;
};

keyframes shaftBack.opacity {
  start 0s;
  duration 30s;
  0% 0.25;
  5.333333% 0.7 ease easeInOut;
  14% 0.55;
  26.666667% 0.2;
  100% 0.12;
};

keyframes dust.opacity {
  start 0s;
  duration 30s;
  0% 0.35;
  7.333333% 1 ease easeInOut;
  15.333333% 0.85;
  23.333333% 0.4;
  100% 0.3;
};

// Second shaft crosses the bell. Particles behind the dome stay visible through it.
keyframes shaftCross.position.x {
  start 0s;
  duration 30s;
  0% 1180;
  33.333333% 1220;
  41.333333% 1519.259 ease easeInOut;
  50% 1780;
  100% 1860;
};

keyframes shaftCross.opacity {
  start 0s;
  duration 30s;
  0% 0;
  32% 0.15;
  37.333333% 0.72 ease easeInOut;
  45% 0.4;
  53.333333% 0.08;
  100% 0;
};

// Last shaft slides across the open bell.
keyframes shaftLast.position.x {
  start 0s;
  duration 30s;
  0% 2740;
  90.666667% 2780;
  93.333333% 2970 ease easeInOut;
  98% 3160;
  100% 3200;
};

keyframes shaftLast.opacity {
  start 0s;
  duration 30s;
  0% 0;
  91% 0;
  93.333333% 0.78 ease easeInOut;
  96.666667% 0.2;
  100% 0;
};


animate farBubbles.b0.position.y {
  expression "640 - (local_t * 34 % 920)";
  start 0s;
  duration 30s;
};animate farBubbles.b1.position.y {
  expression "600 - (local_t * 46 % 920)";
  start 0s;
  duration 30s;
};animate farBubbles.b2.position.y {
  expression "560 - (local_t * 28 % 920)";
  start 0s;
  duration 30s;
};animate farBubbles.b3.position.y {
  expression "520 - (local_t * 40 % 920)";
  start 0s;
  duration 30s;
};animate farBubbles.b4.position.y {
  expression "480 - (local_t * 52 % 920)";
  start 0s;
  duration 30s;
};

// One larger bubble crosses in front of the trailing tentacles.
keyframes heroBubble.position.x {
  start 0s;
  duration 30s;
  0% 660;
  18% 732;
  24.666667% 1085.55 ease easeInOut;
  32% 1270;
  100% 1380;
};

keyframes heroBubble.position.y {
  start 0s;
  duration 30s;
  0% 680;
  18% 624;
  24.666667% 426.755 ease easeOut;
  32% 338;
  100% 248;
};

animate nearBubbles.bigA.position.y {
  expression "646.286 - local_t * 3";
  start 0s;
  duration 30s;
};animate nearBubbles.bigB.position.y {
  expression "596.286 - local_t * 4.333333333333333";
  start 0s;
  duration 30s;
};
// Final cluster of small bubbles, behind the jellyfish.
keyframes rise.opacity {
  start 0s;
  duration 30s;
  0% 0;
  87.333333% 0;
  91.333333% 0.85;
  100% 0.7;
};

animate rise.b0.position.y {
  expression "666.286 - local_t * 16";
  start 0s;
  duration 30s;
};animate rise.b1.position.y {
  expression "652.286 - local_t * 19";
  start 0s;
  duration 30s;
};animate rise.b2.position.y {
  expression "638.286 - local_t * 22";
  start 0s;
  duration 30s;
};animate rise.b3.position.y {
  expression "624.286 - local_t * 25";
  start 0s;
  duration 30s;
};animate rise.b4.position.y {
  expression "610.286 - local_t * 28";
  start 0s;
  duration 30s;
};animate rise.b5.position.y {
  expression "596.286 - local_t * 31";
  start 0s;
  duration 30s;
};

animate nearMotes.position.x { expression "sin(local_t * 0.8) * 24"; start 0s; duration 30s; };
animate dust.mote0.position.y {
  expression "280 + sin(local_t * 0.35 + 0) * 16 - local_t * 4";
  start 0s;
  duration 30s;
};animate dust.mote1.position.y {
  expression "350 + sin(local_t * 0.39 + 1) * 16 - local_t * 5";
  start 0s;
  duration 30s;
};animate dust.mote2.position.y {
  expression "420 + sin(local_t * 0.43 + 2) * 16 - local_t * 6";
  start 0s;
  duration 30s;
};animate dust.mote3.position.y {
  expression "490 + sin(local_t * 0.47 + 3) * 16 - local_t * 4";
  start 0s;
  duration 30s;
};animate dust.mote4.position.y {
  expression "280 + sin(local_t * 0.51 + 4) * 16 - local_t * 5";
  start 0s;
  duration 30s;
};animate dust.mote5.position.y {
  expression "350 + sin(local_t * 0.55 + 5) * 16 - local_t * 6";
  start 0s;
  duration 30s;
};animate dust.mote6.position.y {
  expression "420 + sin(local_t * 0.59 + 6) * 16 - local_t * 4";
  start 0s;
  duration 30s;
};animate dust.mote7.position.y {
  expression "490 + sin(local_t * 0.63 + 7) * 16 - local_t * 5";
  start 0s;
  duration 30s;
};animate dust.mote8.position.y {
  expression "280 + sin(local_t * 0.67 + 8) * 16 - local_t * 6";
  start 0s;
  duration 30s;
};animate dust.mote9.position.y {
  expression "350 + sin(local_t * 0.71 + 9) * 16 - local_t * 4";
  start 0s;
  duration 30s;
};
animate nearMotes.mote0.position.x {
  expression "2200 - local_t * 10";
  start 0s;
  duration 30s;
};animate nearMotes.mote1.position.x {
  expression "2270 - local_t * 12";
  start 0s;
  duration 30s;
};animate nearMotes.mote2.position.x {
  expression "2340 - local_t * 14";
  start 0s;
  duration 30s;
};animate nearMotes.mote3.position.x {
  expression "2410 - local_t * 16";
  start 0s;
  duration 30s;
};animate nearMotes.mote4.position.x {
  expression "2480 - local_t * 18";
  start 0s;
  duration 30s;
};animate nearMotes.mote5.position.x {
  expression "2550 - local_t * 20";
  start 0s;
  duration 30s;
};animate nearMotes.mote6.position.x {
  expression "2620 - local_t * 22";
  start 0s;
  duration 30s;
};animate nearMotes.mote7.position.x {
  expression "2690 - local_t * 24";
  start 0s;
  duration 30s;
};
// Fade to deep teal.
keyframes fade.opacity {
  start 0s;
  duration 30s;
  0% 0;
  96.666667% 0 ease easeIn;
  100% 1;
};

complete;
