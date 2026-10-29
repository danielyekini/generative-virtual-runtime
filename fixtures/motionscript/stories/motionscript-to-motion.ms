// FROM MOTIONSCRIPT TO MOTION
// 30 seconds. MotionScript → Compiler → Scene IR → Runtime → Renderer, one white circle.
// Cyan is code, violet is scene data, amber is timing, white is rendered output.
// 0:00 three instruction cards. 0:05 the compiler inspects and packs Scene IR.
// 0:10 Objects, Animation tracks and Camera. 0:15 the runtime evaluates 0s → 2s, then scrubs to 1s.
// 0:21 the renderer draws the midpoint, then playback finishes the move. 0:26 the whole pipeline.
// Narration is a caption. Sound cues are drawn as pulses; MotionScript has no audio.
scene "motionscript-to-motion" {
  version "0.2";
  viewport (1280, 720);
  background #0a0e14;
  duration 30s;
  requires "easing.hold";
  requires "geometry.roundedRect";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "text.basic";
};
camera main {
  position (320, 260);
  zoom 2;
  rotation 0deg;
};
group links {
  zIndex 2;
  line w0 { from (548, 260); to (642, 260); stroke #4a596c width 3 cap round; };
  polygon a0 { points ((638, 251), (652, 260), (638, 269)); fill #4a596c; };
  line h0 { from (548, 260); to (642, 260); stroke #3de0ff width 5 cap round; opacity 0; };
  line w1 { from (1108, 260); to (1202, 260); stroke #4a596c width 3 cap round; };
  polygon a1 { points ((1198, 251), (1212, 260), (1198, 269)); fill #4a596c; };
  line h1 { from (1108, 260); to (1202, 260); stroke #3de0ff width 5 cap round; opacity 0; };
  line w2 { from (1668, 260); to (1762, 260); stroke #4a596c width 3 cap round; };
  polygon a2 { points ((1758, 251), (1772, 260), (1758, 269)); fill #4a596c; };
  line h2 { from (1668, 260); to (1762, 260); stroke #3de0ff width 5 cap round; opacity 0; };
  line w3 { from (2228, 260); to (2322, 260); stroke #4a596c width 3 cap round; };
  polygon a3 { points ((2318, 251), (2332, 260), (2318, 269)); fill #4a596c; };
  line h3 { from (2228, 260); to (2322, 260); stroke #3de0ff width 5 cap round; opacity 0; };
};
group sMS {
  position (320, 260);
  zIndex 4;
  rectangle body { position (-220, -130); size (440, 260); cornerRadius 12; fill #111821; stroke #2b3747 width 1.6; };
  rectangle glow { position (-223, -133); size (446, 266); cornerRadius 14; stroke #3de0ff width 4; opacity 0; };
  rectangle glow2 { position (-223, -133); size (446, 266); cornerRadius 14; stroke #3de0ff width 6; opacity 0; };
  rectangle accent { position (-28, -130); size (56, 4); cornerRadius 2; fill #3de0ff; };
  text title { position (0, -100); content "MotionScript"; fontFamily "sans"; fontSize 26; fontWeight 700; align center; baseline middle; fill #e8eef5; };
  group tag {
    position (0, -66);
    opacity 0;
    rectangle pill { position (-128, -13); size (256, 26); cornerRadius 13; stroke #3de0ff width 1.2; opacity 0.7; };
    text words { position (0, 0); content "animation authoring language"; fontFamily "sans"; fontSize 14; fontWeight 600; align center; baseline middle; fill #3de0ff; };
  };
  group cards {
    position (0, 30);
    group c0 {
      position (0, -50);
      opacity 0;
      rectangle card { position (-185, -20); size (370, 40); cornerRadius 6; fill #0d2430; stroke #3de0ff width 1.4; };
      text num { position (-172, 0); content "1"; fontSize 13; fontWeight 500; baseline middle; fill #8a99ad; fontFamily "monospace"; align left; };
      text words { position (-150, 0); content "Create a circle"; fontSize 18; fontWeight 500; baseline middle; fill #3de0ff; fontFamily "monospace"; align left; };
    };
    group c1 {
      position (0, 2);
      opacity 0;
      rectangle card { position (-185, -20); size (370, 40); cornerRadius 6; fill #0d2430; stroke #3de0ff width 1.4; };
      text num { position (-172, 0); content "2"; fontSize 13; fontWeight 500; baseline middle; fill #8a99ad; fontFamily "monospace"; align left; };
      text words { position (-150, 0); content "Move right over two seconds"; fontSize 18; fontWeight 500; baseline middle; fill #3de0ff; fontFamily "monospace"; align left; };
    };
    group c2 {
      position (0, 54);
      opacity 0;
      rectangle card { position (-185, -20); size (370, 40); cornerRadius 6; fill #0d2430; stroke #3de0ff width 1.4; };
      text num { position (-172, 0); content "3"; fontSize 13; fontWeight 500; baseline middle; fill #8a99ad; fontFamily "monospace"; align left; };
      text words { position (-150, 0); content "Ease in and out"; fontSize 18; fontWeight 500; baseline middle; fill #3de0ff; fontFamily "monospace"; align left; };
    };
  };
};
group sComp {
  position (880, 260);
  zIndex 4;
  rectangle body { position (-220, -130); size (440, 260); cornerRadius 12; fill #111821; stroke #2b3747 width 1.6; };
  rectangle glow { position (-223, -133); size (446, 266); cornerRadius 14; stroke #e8eef5 width 4; opacity 0; };
  rectangle glow2 { position (-223, -133); size (446, 266); cornerRadius 14; stroke #e8eef5 width 6; opacity 0; };
  rectangle accent { position (-28, -130); size (56, 4); cornerRadius 2; fill #e8eef5; };
  text title { position (0, -100); content "Compiler"; fontFamily "sans"; fontSize 26; fontWeight 700; align center; baseline middle; fill #e8eef5; };
  text sub { position (0, -70); content "parse · check · lower"; fontFamily "sans"; fontSize 14; fontWeight 600; align center; baseline middle; fill #8a99ad; };
  group rows {
    position (0, 0);
    group r0 {
      position (0, -30);
      opacity 0;
      rectangle row { position (-190, -17); size (380, 34); cornerRadius 5; fill #0d1a22; stroke #2b3747 width 1.2; };
      text code { position (-176, 0); content "circle ball { radius 40 }"; fontSize 15; fontWeight 500; baseline middle; fill #3de0ff; fontFamily "monospace"; align left; };
    };
    group r1 {
      position (0, 15);
      opacity 0;
      rectangle row { position (-190, -17); size (380, 34); cornerRadius 5; fill #0d1a22; stroke #2b3747 width 1.2; };
      text code { position (-176, 0); content "move ball.x 0s → 2s"; fontSize 15; fontWeight 500; baseline middle; fill #3de0ff; fontFamily "monospace"; align left; };
    };
    group r2 {
      position (0, 60);
      opacity 0;
      rectangle row { position (-190, -17); size (380, 34); cornerRadius 5; fill #0d1a22; stroke #2b3747 width 1.2; };
      text code { position (-176, 0); content "ease easeInOut"; fontSize 15; fontWeight 500; baseline middle; fill #3de0ff; fontFamily "monospace"; align left; };
    };
    text t0 { position (180, -30); content "structure ✓"; fontFamily "sans"; fontSize 13; fontWeight 650; baseline middle; fill #d4ccff; align right; opacity 0; };
    text t1 { position (180, 15); content "reference ✓"; fontFamily "sans"; fontSize 13; fontWeight 650; baseline middle; fill #d4ccff; align right; opacity 0; };
    text t2 { position (180, 60); content "animation ✓"; fontFamily "sans"; fontSize 13; fontWeight 650; baseline middle; fill #d4ccff; align right; opacity 0; };
  };
  group scan {
    position (0, -30);
    opacity 0;
    rectangle frame { position (-194, -20); size (388, 40); cornerRadius 6; fill #3de0ff; stroke #3de0ff width 2; opacity 0.12; };
    rectangle edge { position (-194, -20); size (388, 40); cornerRadius 6; stroke #3de0ff width 2; };
    line beam { from (0, -18); to (0, 18); stroke #ffffff width 2.4 cap round; position (-190, 0); };
  };
};
group sIR {
  position (1440, 260);
  zIndex 4;
  rectangle body { position (-220, -130); size (440, 260); cornerRadius 12; fill #111821; stroke #2b3747 width 1.6; };
  rectangle glow { position (-223, -133); size (446, 266); cornerRadius 14; stroke #d4ccff width 4; opacity 0; };
  rectangle glow2 { position (-223, -133); size (446, 266); cornerRadius 14; stroke #d4ccff width 6; opacity 0; };
  rectangle accent { position (-28, -130); size (56, 4); cornerRadius 2; fill #d4ccff; };
  text title { position (0, -100); content "Scene IR"; fontFamily "sans"; fontSize 26; fontWeight 700; align center; baseline middle; fill #e8eef5; };
  path bracket { move (-195, -48); line (-195, -60); line (195, -60); line (195, -48); move (0, -60); line (0, -70); stroke #8d7dff width 2.2 cap round; opacity 0; };
  group cards {
    line j0 { from (-83, 45); to (-62, 45); stroke #8d7dff width 1.6; opacity 0; };
    line j1 { from (62, 45); to (83, 45); stroke #8d7dff width 1.6; opacity 0; };
    group k0 {
      position (-145, 45);
      opacity 0;
      rectangle card { position (-62, -70); size (124, 140); cornerRadius 8; fill #1c1736; stroke #8d7dff width 1.6; };
      rectangle ring { position (-65, -73); size (130, 146); cornerRadius 10; stroke #d4ccff width 2.4; opacity 0; };
      text label { position (0, -50); content "Objects"; fontFamily "sans"; fontSize 15; fontWeight 700; align center; baseline middle; fill #d4ccff; };
      circle ball { position (0, 2); radius 20; fill #ffffff; };
      text name { position (0, 45); content "circle · ball"; fontFamily "sans"; fontSize 12; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    };
    group k1 {
      position (0, 45);
      opacity 0;
      rectangle card { position (-62, -70); size (124, 140); cornerRadius 8; fill #1c1736; stroke #8d7dff width 1.6; };
      rectangle ring { position (-65, -73); size (130, 146); cornerRadius 10; stroke #d4ccff width 2.4; opacity 0; };
      text label { position (0, -54); content "Animation"; fontFamily "sans"; fontSize 14; fontWeight 700; align center; baseline middle; fill #d4ccff; };
      text label2 { position (0, -37); content "tracks"; fontFamily "sans"; fontSize 14; fontWeight 700; align center; baseline middle; fill #d4ccff; };
      line axis { from (-48, 14); to (48, 14); stroke #8a99ad width 1.4; };
      polygon k0 { points ((-40, 8), (-34, 14), (-40, 20), (-46, 14)); fill #f5b042; };
      polygon k1 { points ((40, 8), (46, 14), (40, 20), (34, 14)); fill #f5b042; };
      line lane { from (-40, -6); to (40, -6); stroke #2b3747 width 1; };
      circle dot { position (-40, -6); radius 7; fill #ffffff; };
      text prop { position (0, 45); content "position.x"; fontFamily "sans"; fontSize 12; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    };
    group k2 {
      position (145, 45);
      opacity 0;
      rectangle card { position (-62, -70); size (124, 140); cornerRadius 8; fill #1c1736; stroke #8d7dff width 1.6; };
      rectangle ring { position (-65, -73); size (130, 146); cornerRadius 10; stroke #d4ccff width 2.4; opacity 0; };
      text label { position (0, -50); content "Camera"; fontFamily "sans"; fontSize 15; fontWeight 700; align center; baseline middle; fill #d4ccff; };
      rectangle box { position (-26, -12); size (36, 28); cornerRadius 4; stroke #d4ccff width 2; };
      polygon lens { points ((10, 2), (26, -10), (26, 14)); stroke #d4ccff width 2; };
      text zoom { position (0, 45); content "centre · zoom 1"; fontFamily "sans"; fontSize 12; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    };
  };
};
group sRun {
  position (2000, 260);
  zIndex 4;
  rectangle body { position (-220, -130); size (440, 260); cornerRadius 12; fill #111821; stroke #2b3747 width 1.6; };
  rectangle glow { position (-223, -133); size (446, 266); cornerRadius 14; stroke #f5b042 width 4; opacity 0; };
  rectangle glow2 { position (-223, -133); size (446, 266); cornerRadius 14; stroke #f5b042 width 6; opacity 0; };
  rectangle accent { position (-28, -130); size (56, 4); cornerRadius 2; fill #f5b042; };
  text title { position (0, -100); content "Runtime"; fontFamily "sans"; fontSize 26; fontWeight 700; align center; baseline middle; fill #e8eef5; };
  circle clock { position (176, -100); radius 6; fill #f5b042; opacity 0.25; };
  group graph {
    rectangle box { position (-195, -65); size (160, 120); cornerRadius 6; fill #0b1016; stroke #2b3747 width 1.2; };
    path curve { move (-185, 45); line (-180, 44.74); line (-175, 43.98); line (-170, 42.7); line (-165, 40.92); line (-160, 38.62); line (-155, 35.82); line (-150, 32.5); line (-145, 28.67); line (-140, 24.34); line (-135, 19.49); line (-130, 14.13); line (-125, 8.27); line (-120, 1.89); line (-115, -5); line (-110, -11.89); line (-105, -18.27); line (-100, -24.13); line (-95, -29.49); line (-90, -34.34); line (-85, -38.67); line (-80, -42.5); line (-75, -45.82); line (-70, -48.62); line (-65, -50.92); line (-60, -52.7); line (-55, -53.98); line (-50, -54.74); line (-45, -55); stroke #f5b042 width 2.2 cap round join round; opacity 0.8; };
    text caption { position (-115, 70); content "ease in-out"; fontFamily "sans"; fontSize 14; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    circle marker { position (-185, 45); radius 6.5; fill #f5b042; stroke #ffffff width 1.6; };
  };
  group guide {
    text caption { position (95, -42); content "evaluated ball.x"; fontFamily "sans"; fontSize 14; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    line rail { from (5, -5); to (185, -5); stroke #8a99ad width 2; };
    line g0 { from (5, -12); to (5, 2); stroke #8a99ad width 1.4; };
    text l0 { position (5, 21); content "Start"; fontFamily "sans"; fontSize 16; fontWeight 650; align center; baseline middle; fill #e8eef5; opacity 0; };
    line g1 { from (95, -12); to (95, 2); stroke #8a99ad width 1.4; };
    text l1 { position (95, 21); content "Between"; fontFamily "sans"; fontSize 16; fontWeight 650; align center; baseline middle; fill #e8eef5; opacity 0; };
    line g2 { from (185, -12); to (185, 2); stroke #8a99ad width 1.4; };
    text l2 { position (185, 21); content "Finish"; fontFamily "sans"; fontSize 16; fontWeight 650; align center; baseline middle; fill #e8eef5; opacity 0; };
    circle ring { position (5, -5); radius 11; stroke #ffffff width 2.4; };
    circle core { position (5, -5); radius 4; fill #f5b042; };
  };
  group clockline {
    opacity 0;
    line axis { from (-190, 95); to (190, 95); stroke #8a99ad width 1.6; };
    line tick0 { from (-190, 90); to (-190, 100); stroke #8a99ad width 1.4; };
    text sec0 { position (-176, 112); content "0s"; fontFamily "sans"; fontSize 14; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    line tick1 { from (0, 90); to (0, 100); stroke #8a99ad width 1.4; };
    text sec1 { position (0, 112); content "1s"; fontFamily "sans"; fontSize 14; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    line tick2 { from (190, 90); to (190, 100); stroke #8a99ad width 1.4; };
    text sec2 { position (176, 112); content "2s"; fontFamily "sans"; fontSize 14; fontWeight 600; align center; baseline middle; fill #8a99ad; };
    group playhead {
      position (-190, 95);
      line stem { from (0, -13); to (0, 11); stroke #f5b042 width 3 cap round; };
      polygon tip { points ((-6, -19), (6, -19), (0, -11)); fill #f5b042; };
    };
  };
};
group sRen {
  position (2560, 260);
  zIndex 4;
  rectangle body { position (-220, -130); size (440, 260); cornerRadius 12; fill #111821; stroke #2b3747 width 1.6; };
  rectangle glow { position (-223, -133); size (446, 266); cornerRadius 14; stroke #ffffff width 4; opacity 0; };
  rectangle glow2 { position (-223, -133); size (446, 266); cornerRadius 14; stroke #ffffff width 6; opacity 0; };
  rectangle accent { position (-28, -130); size (56, 4); cornerRadius 2; fill #ffffff; };
  text title { position (0, -100); content "Renderer"; fontFamily "sans"; fontSize 26; fontWeight 700; align center; baseline middle; fill #e8eef5; };
  group frame {
    rectangle box { position (-170, -60); size (340, 150); cornerRadius 8; fill #0b1016; stroke #2b3747 width 1.2; };
    text recv { position (-150, -30); content "receive state"; fontSize 15; fontWeight 500; baseline middle; fill #8a99ad; fontFamily "monospace"; align left; };
    text state { position (-150, 2); content "t = 1s   ball.x = mid"; fontSize 15; fontWeight 500; baseline middle; fill #f5b042; fontFamily "monospace"; align left; opacity 0; };
    text draw { position (-150, 34); content "draw circle → canvas"; fontSize 15; fontWeight 500; baseline middle; fill #ffffff; fontFamily "monospace"; align left; opacity 0; };
    text live { position (-150, 66); content "playing · new state each frame"; fontSize 13; fontWeight 500; baseline middle; fill #8a99ad; fontFamily "monospace"; align left; opacity 0; };
  };
};
group canvas {
  position (2280, 590);
  zIndex 6;
  rectangle sheet { position (-500, -125); size (1000, 250); cornerRadius 10; fill #05080c; stroke #2b3747 width 1.6; };
  text label { position (-480, -101); content "Preview canvas"; fontFamily "sans"; fontSize 18; fontWeight 650; baseline middle; fill #8a99ad; align left; };
  line floor { from (-380, 67); to (380, 67); stroke #18212c width 2; };
  circle ball { position (0, 15); radius 40; fill #ffffff; opacity 0; };
};
line drawLink { from (2560, 396); to (2560, 457); stroke #ffffff width 2.4 cap round; opacity 0; zIndex 5; };
path extend { move (1480, 319); line (1640, 319); line (1750, 355); line (1810, 355); stroke #f5b042 width 3 cap round join round; opacity 0; zIndex 8; };
group doc {
  position (320, 290);
  opacity 0;
  zIndex 30;
  rectangle sheet { position (-34, -44); size (68, 88); cornerRadius 5; fill #0d2430; stroke #3de0ff width 2.2; };
  line l0 { from (-20, -22); to (18, -22); stroke #3de0ff width 3 cap round; };
  line l1 { from (-20, -6); to (22, -6); stroke #3de0ff width 3 cap round; };
  line l2 { from (-20, 10); to (8, 10); stroke #3de0ff width 3 cap round; };
  text ext { position (-20, 28); content ".ms"; fontSize 13; fontWeight 500; baseline middle; fill #3de0ff; fontFamily "monospace"; align left; };
};
group pkg {
  position (880, 290);
  opacity 0;
  zIndex 30;
  rectangle box { position (-110, -60); size (220, 120); cornerRadius 10; fill #1c1736; stroke #8d7dff width 2.4; };
  rectangle bar0 { position (-80, 14); size (44, 22); cornerRadius 4; stroke #8d7dff width 1.4; };
  rectangle bar1 { position (-22, 14); size (44, 22); cornerRadius 4; stroke #8d7dff width 1.4; };
  rectangle bar2 { position (36, 14); size (44, 22); cornerRadius 4; stroke #8d7dff width 1.4; };
  text words { position (0, -20); content "Scene IR"; fontFamily "sans"; fontSize 26; fontWeight 700; align center; baseline middle; fill #d4ccff; };
};
circle chime { position (880, 290); radius 80; stroke #d4ccff width 2.4; opacity 0; zIndex 29; };
group state {
  position (2095, 255);
  opacity 0;
  zIndex 32;
  rectangle chip { position (-54, -18); size (108, 36); cornerRadius 7; fill #2a1d08; stroke #f5b042 width 2; };
  text words { position (0, 1); content "t = 1s"; fontFamily "sans"; fontSize 15; fontWeight 700; align center; baseline middle; fill #f5b042; };
};
group tick0 {
  position (2216, 260);
  opacity 0;
  zIndex 31;
  rectangle chip { position (-9, -9); size (18, 18); cornerRadius 4; fill #f5b042; };
};
group tick1 {
  position (2216, 260);
  opacity 0;
  zIndex 31;
  rectangle chip { position (-9, -9); size (18, 18); cornerRadius 4; fill #f5b042; };
};
group tick2 {
  position (2216, 260);
  opacity 0;
  zIndex 31;
  rectangle chip { position (-9, -9); size (18, 18); cornerRadius 4; fill #f5b042; };
};
group tick3 {
  position (2216, 260);
  opacity 0;
  zIndex 31;
  rectangle chip { position (-9, -9); size (18, 18); cornerRadius 4; fill #f5b042; };
};
group tick4 {
  position (2216, 260);
  opacity 0;
  zIndex 31;
  rectangle chip { position (-9, -9); size (18, 18); cornerRadius 4; fill #f5b042; };
};
group tick5 {
  position (2216, 260);
  opacity 0;
  zIndex 31;
  rectangle chip { position (-9, -9); size (18, 18); cornerRadius 4; fill #f5b042; };
};
group hl {
  position (320, 260);
  opacity 0;
  zIndex 40;
  ellipse halo { size (90, 90); fill #3de0ff; opacity 0.25; };
  circle core { radius 16; fill #ffffff; };
};
group wide {
  opacity 0;
  zIndex 10;
  text n0 { position (320, 92); content "MotionScript"; fontFamily "sans"; fontSize 46; fontWeight 700; align center; baseline middle; fill #3de0ff; };
  text n1 { position (880, 92); content "Compiler"; fontFamily "sans"; fontSize 46; fontWeight 700; align center; baseline middle; fill #e8eef5; };
  text n2 { position (1440, 92); content "Scene IR"; fontFamily "sans"; fontSize 46; fontWeight 700; align center; baseline middle; fill #d4ccff; };
  text n3 { position (2000, 92); content "Runtime"; fontFamily "sans"; fontSize 46; fontWeight 700; align center; baseline middle; fill #f5b042; };
  text n4 { position (2560, 92); content "Renderer"; fontFamily "sans"; fontSize 46; fontWeight 700; align center; baseline middle; fill #ffffff; };
};
group gvr {
  opacity 0;
  zIndex 10;
  path bracket { move (100, 790); line (100, 815); line (1440, 815); line (1440, 835); move (1440, 815); line (2780, 815); line (2780, 790); stroke #e8eef5 width 4 cap round join round; };
  text name { position (1440, 885); content "GVR"; fontFamily "sans"; fontSize 72; fontWeight 800; align center; baseline middle; fill #ffffff; };
  text tagline { position (1440, 950); content "the system that turns animation descriptions into visuals"; fontFamily "sans"; fontSize 38; fontWeight 600; align center; baseline middle; fill #8a99ad; };
};
ellipse resolve { position (1440, 885); size (300, 140); stroke #ffffff width 3; opacity 0; zIndex 11; };
group header {
  space screen;
  zIndex 60;
  text title { position (24, 28); content "From MotionScript to Motion"; fontFamily "sans"; fontSize 15; fontWeight 650; baseline middle; fill #8a99ad; align left; };
};
group captions {
  space screen;
  zIndex 60;
  rectangle plate { position (110, 656); size (1060, 46); cornerRadius 8; fill #05080c; opacity 0.86; };
  text cap1 { position (640, 679); content "MotionScript describes the scene, its objects, and how they change over time."; fontFamily "sans"; fontSize 18; fontWeight 550; align center; baseline middle; fill #e8eef5; opacity 0; };
  text cap2 { position (640, 679); content "The compiler checks those instructions and converts them into a structured scene representation."; fontFamily "sans"; fontSize 18; fontWeight 550; align center; baseline middle; fill #e8eef5; opacity 0; };
  text cap3 { position (640, 679); content "Scene IR stores what exists, what animates, and the camera settings in one common format."; fontFamily "sans"; fontSize 18; fontWeight 550; align center; baseline middle; fill #e8eef5; opacity 0; };
  text cap4 { position (640, 679); content "At a chosen time, the runtime evaluates the animation tracks to determine the scene’s current state."; fontFamily "sans"; fontSize 18; fontWeight 550; align center; baseline middle; fill #e8eef5; opacity 0; };
  text cap5 { position (640, 679); content "The renderer draws that state onto the canvas."; fontFamily "sans"; fontSize 18; fontWeight 550; align center; baseline middle; fill #e8eef5; opacity 0; };
  text cap6 { position (640, 679); content "Repeating this as time advances produces the animation."; fontFamily "sans"; fontSize 18; fontWeight 550; align center; baseline middle; fill #e8eef5; opacity 0; };
  text cap7 { position (640, 679); content "MotionScript expresses the animation. GVR compiles, evaluates, and renders it."; fontFamily "sans"; fontSize 18; fontWeight 550; align center; baseline middle; fill #e8eef5; opacity 0; };
};
operators extend { trim 0, 0, 0; };
operators gvr.bracket { trim 0, 0, 0; };
keyframes sMS.tag.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  0.3333% 0 ease easeOut;
  1.6667% 1 ease hold;
  86% 1 ease easeOut;
  87.6667% 0 ease hold;
  100% 0;
};
keyframes sMS.cards.c0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.3333% 0 ease easeOut;
  2.6667% 1 ease hold;
  100% 1;
};
keyframes sMS.cards.c0.position.x {
  start 0s;
  duration 30s;
  0% -40 ease hold;
  1.3333% -40 ease easeOut;
  2.6667% 0 ease hold;
  100% 0;
};
keyframes sMS.cards.c1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.3333% 0 ease easeOut;
  4.6667% 1 ease hold;
  100% 1;
};
keyframes sMS.cards.c1.position.x {
  start 0s;
  duration 30s;
  0% -40 ease hold;
  3.3333% -40 ease easeOut;
  4.6667% 0 ease hold;
  100% 0;
};
keyframes sMS.cards.c2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  5.3333% 0 ease easeOut;
  6.6667% 1 ease hold;
  100% 1;
};
keyframes sMS.cards.c2.position.x {
  start 0s;
  duration 30s;
  0% -40 ease hold;
  5.3333% -40 ease easeOut;
  6.6667% 0 ease hold;
  100% 0;
};
keyframes sMS.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.3333% 0 ease easeOut;
  2.5333% 0.35 ease easeIn;
  3.3333% 0 ease hold;
  4.3333% 0 ease easeOut;
  4.5333% 0.35 ease easeIn;
  5.3333% 0 ease hold;
  6.3333% 0 ease easeOut;
  6.5333% 0.35 ease easeIn;
  7.3333% 0 ease hold;
  100% 0;
};
keyframes sMS.cards.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  13.1667% (1, 1) ease easeIn;
  14.5% (0.18, 0.3) ease hold;
  85.6667% (1, 1) ease hold;
  100% (1, 1);
};
keyframes sMS.cards.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  14% 1 ease easeOut;
  14.6667% 0 ease hold;
  85.6667% 0 ease easeOut;
  87.6667% 1 ease hold;
  100% 1;
};
keyframes doc.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  13.8333% 0 ease easeOut;
  14.5% 1 ease hold;
  17.8333% 1 ease easeOut;
  18.5% 0 ease hold;
  100% 0;
};
keyframes doc.scale {
  start 0s;
  duration 30s;
  0% (0.6, 0.6) ease hold;
  13.8333% (0.6, 0.6) ease easeOut;
  14.6667% (1, 1) ease hold;
  17.6667% (1, 1) ease easeIn;
  18.5% (1.8, 1.4) ease hold;
  100% (1.8, 1.4);
};
keyframes doc.position.x {
  start 0s;
  duration 30s;
  0% 320 ease hold;
  14.6667% 320 ease easeInOut;
  18% 880 ease hold;
  100% 880;
};
keyframes sComp.rows.r0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  17.8333% 0 ease easeOut;
  18.8333% 1 ease hold;
  100% 1;
};
keyframes sComp.rows.t0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.8333% 0 ease easeOut;
  21.5% 1 ease hold;
  28.3333% 1 ease easeOut;
  29.1667% 0 ease hold;
  100% 0;
};
keyframes sComp.rows.r1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.1% 0 ease easeOut;
  19.1% 1 ease hold;
  100% 1;
};
keyframes sComp.rows.t1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  24.1667% 0 ease easeOut;
  24.8333% 1 ease hold;
  28.3333% 1 ease easeOut;
  29.1667% 0 ease hold;
  100% 0;
};
keyframes sComp.rows.r2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.3667% 0 ease easeOut;
  19.3667% 1 ease hold;
  100% 1;
};
keyframes sComp.rows.t2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  27.5% 0 ease easeOut;
  28.1667% 1 ease hold;
  28.3333% 1 ease easeOut;
  29.1667% 0 ease hold;
  100% 0;
};
keyframes sComp.rows.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  28.3333% 1 ease easeOut;
  30.8333% 0 ease hold;
  85.6667% 0 ease easeOut;
  87.6667% 1 ease hold;
  100% 1;
};
keyframes sComp.rows.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  28.3333% (1, 1) ease easeIn;
  30.8333% (0.3, 0.3) ease hold;
  85.6667% (1, 1) ease hold;
  100% (1, 1);
};
keyframes sComp.scan.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18% 0 ease easeOut;
  18.5% 1 ease hold;
  28% 1 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes sComp.scan.position.y {
  start 0s;
  duration 30s;
  0% -30 ease hold;
  21.4% -30 ease easeInOut;
  21.9333% 15 ease hold;
  24.7333% 15 ease easeInOut;
  25.2667% 60 ease hold;
  100% 60;
};
keyframes sComp.scan.beam.position.x {
  start 0s;
  duration 30s;
  0% -190 ease hold;
  18.3333% -190 ease easeInOut;
  21.0667% 190 ease hold;
  21.6667% -190 ease easeInOut;
  24.4% 190 ease hold;
  25% -190 ease easeInOut;
  27.7333% 190 ease hold;
  100% 190;
};
keyframes sComp.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.6667% 0 ease easeOut;
  18.8667% 0.45 ease easeIn;
  20.3333% 0 ease hold;
  22% 0 ease easeOut;
  22.2% 0.45 ease easeIn;
  23.6667% 0 ease hold;
  25.3333% 0 ease easeOut;
  25.5333% 0.45 ease easeIn;
  27% 0 ease hold;
  100% 0;
};
keyframes pkg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  29.1667% 0 ease easeOut;
  31.3333% 1 ease hold;
  34.8333% 1 ease easeOut;
  36.1667% 0 ease hold;
  100% 0;
};
keyframes pkg.scale {
  start 0s;
  duration 30s;
  0% (0.35, 0.35) ease hold;
  29.1667% (0.35, 0.35) ease easeOut;
  31.5% (1, 1) ease hold;
  33.3333% (1, 1) ease easeInOut;
  36% (2, 2.17) ease hold;
  100% (2, 2.17);
};
keyframes pkg.position.x {
  start 0s;
  duration 30s;
  0% 880 ease hold;
  33.3333% 880 ease easeInOut;
  36% 1440 ease hold;
  100% 1440;
};
keyframes pkg.position.y {
  start 0s;
  duration 30s;
  0% 290 ease hold;
  33.3333% 290 ease easeInOut;
  36% 260 ease hold;
  100% 260;
};
keyframes chime.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  31.5% 0 ease easeOut;
  31.6667% 0.9 ease hold;
  31.6668% 0.9 ease easeOut;
  33.6667% 0 ease hold;
  100% 0;
};
keyframes chime.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  31.5% (1, 1) ease easeOut;
  33.6667% (1.7, 1.7) ease hold;
  100% (1.7, 1.7);
};
keyframes sIR.cards.k0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  36% 0 ease easeOut;
  37.3333% 1 ease hold;
  100% 1;
};
keyframes sIR.cards.k0.position.y {
  start 0s;
  duration 30s;
  0% 65 ease hold;
  36% 65 ease easeOut;
  37.3333% 45 ease hold;
  100% 45;
};
keyframes sIR.cards.k0.ring.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  37.2% 0 ease easeOut;
  37.4% 0.9 ease easeIn;
  38.5333% 0 ease hold;
  100% 0;
};
keyframes sIR.cards.k1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  37.6667% 0 ease easeOut;
  39% 1 ease hold;
  100% 1;
};
keyframes sIR.cards.k1.position.y {
  start 0s;
  duration 30s;
  0% 65 ease hold;
  37.6667% 65 ease easeOut;
  39% 45 ease hold;
  100% 45;
};
keyframes sIR.cards.k1.ring.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  38.8667% 0 ease easeOut;
  39.0667% 0.9 ease easeIn;
  40.2% 0 ease hold;
  100% 0;
};
keyframes sIR.cards.k2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  39.3333% 0 ease easeOut;
  40.6667% 1 ease hold;
  100% 1;
};
keyframes sIR.cards.k2.position.y {
  start 0s;
  duration 30s;
  0% 65 ease hold;
  39.3333% 65 ease easeOut;
  40.6667% 45 ease hold;
  100% 45;
};
keyframes sIR.cards.k2.ring.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  40.5333% 0 ease easeOut;
  40.7333% 0.9 ease easeIn;
  41.8667% 0 ease hold;
  100% 0;
};
keyframes sIR.cards.j0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  38.6667% 0 ease easeOut;
  39.3333% 1 ease hold;
  100% 1;
};
keyframes sIR.cards.j1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  40.3333% 0 ease easeOut;
  41% 1 ease hold;
  100% 1;
};
keyframes sIR.bracket.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  40% 0 ease easeOut;
  41.3333% 1 ease hold;
  100% 1;
};
keyframes sIR.cards.k1.dot.position.x {
  start 0s;
  duration 30s;
  0% -40 ease hold;
  41.6667% -40 ease easeInOut;
  47% 40 ease hold;
  100% 40;
};
keyframes extend.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  48.3333% 0 ease easeOut;
  48.6667% 1 ease hold;
  54% 1 ease easeOut;
  56% 0 ease hold;
  100% 0;
};
keyframes extend.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  48.6667% 0 ease easeInOut;
  52.3333% 1 ease hold;
  100% 1;
};
keyframes sRun.clockline.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  51.6667% 0 ease easeOut;
  53% 1 ease hold;
  100% 1;
};
keyframes sRun.clockline.playhead.position.x {
  start 0s;
  duration 30s;
  0% -190 ease hold;
  53.3333% -190 ease linear;
  60% 190 ease hold;
  62.6667% 190 ease linear;
  65.3333% 0 ease hold;
  74.3333% 0 ease linear;
  81% 190 ease hold;
  100% 190;
};
keyframes sRun.graph.marker.position.x {
  start 0s;
  duration 30s;
  0% -185 ease hold;
  53.3333% -185 ease linear;
  60% -45 ease hold;
  62.6667% -45 ease linear;
  65.3333% -115 ease hold;
  74.3333% -115 ease linear;
  81% -45 ease hold;
  100% -45;
};
keyframes sRun.graph.marker.position.y {
  start 0s;
  duration 30s;
  0% 45 ease hold;
  53.3333% 45 ease easeInOut;
  60% -55 ease hold;
  62.6667% -55 ease easeIn;
  65.3333% -5 ease hold;
  74.3333% -5 ease easeOut;
  81% -55 ease hold;
  100% -55;
};
keyframes sRun.guide.ring.position.x {
  start 0s;
  duration 30s;
  0% 5 ease hold;
  53.3333% 5 ease easeInOut;
  60% 185 ease hold;
  62.6667% 185 ease easeIn;
  65.3333% 95 ease hold;
  74.3333% 95 ease easeOut;
  81% 185 ease hold;
  100% 185;
};
keyframes sRun.guide.core.position.x {
  start 0s;
  duration 30s;
  0% 5 ease hold;
  53.3333% 5 ease easeInOut;
  60% 185 ease hold;
  62.6667% 185 ease easeIn;
  65.3333% 95 ease hold;
  74.3333% 95 ease easeOut;
  81% 185 ease hold;
  100% 185;
};
keyframes sRun.guide.l0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  53.3333% 0 ease easeOut;
  54.1667% 1 ease hold;
  100% 1;
};
keyframes sRun.guide.l1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  56.6667% 0 ease easeOut;
  57.5% 1 ease hold;
  100% 1;
};
keyframes sRun.guide.l2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  60% 0 ease easeOut;
  60.8333% 1 ease hold;
  100% 1;
};
keyframes sRun.clock.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  53.3333% 0 ease easeOut;
  53.5333% 1 ease easeIn;
  54.3333% 0 ease hold;
  55% 0 ease easeOut;
  55.2% 1 ease easeIn;
  56% 0 ease hold;
  56.6667% 0 ease easeOut;
  56.8667% 1 ease easeIn;
  57.6667% 0 ease hold;
  58.3333% 0 ease easeOut;
  58.5333% 1 ease easeIn;
  59.3333% 0 ease hold;
  60% 0 ease easeOut;
  60.2% 1 ease easeIn;
  61% 0 ease hold;
  61.6667% 0 ease easeOut;
  61.8667% 1 ease easeIn;
  62.6667% 0 ease hold;
  63.3333% 0 ease easeOut;
  63.5333% 1 ease easeIn;
  64.3333% 0 ease hold;
  65% 0 ease easeOut;
  65.2% 1 ease easeIn;
  66% 0 ease hold;
  66.6667% 0 ease easeOut;
  66.8667% 1 ease easeIn;
  67.6667% 0 ease hold;
  74.3333% 0 ease easeOut;
  74.5333% 1 ease easeIn;
  75.3333% 0 ease hold;
  76% 0 ease easeOut;
  76.2% 1 ease easeIn;
  77% 0 ease hold;
  77.6667% 0 ease easeOut;
  77.8667% 1 ease easeIn;
  78.6667% 0 ease hold;
  79.3333% 0 ease easeOut;
  79.5333% 1 ease easeIn;
  80.3333% 0 ease hold;
  100% 0;
};
keyframes state.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67.3333% 0 ease easeOut;
  68% 1 ease hold;
  69.8333% 1 ease easeOut;
  70.5% 0 ease hold;
  100% 0;
};
keyframes state.scale {
  start 0s;
  duration 30s;
  0% (0.5, 0.5) ease hold;
  67.3333% (0.5, 0.5) ease easeOut;
  68% (1, 1) ease hold;
  100% (1, 1);
};
keyframes state.position.x {
  start 0s;
  duration 30s;
  0% 2095 ease hold;
  67.8333% 2095 ease easeInOut;
  70.1667% 2470 ease hold;
  100% 2470;
};
keyframes state.position.y {
  start 0s;
  duration 30s;
  0% 255 ease hold;
  67.8333% 255 ease easeInOut;
  70.1667% 262 ease hold;
  100% 262;
};
keyframes sRen.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70% 0 ease easeOut;
  70.2% 0.6 ease easeIn;
  71% 0 ease hold;
  75.2% 0 ease easeOut;
  75.4% 0.6 ease easeIn;
  76.2% 0 ease hold;
  76.2667% 0 ease easeOut;
  76.4667% 0.6 ease easeIn;
  77.2667% 0 ease hold;
  77.3333% 0 ease easeOut;
  77.5333% 0.6 ease easeIn;
  78.3333% 0 ease hold;
  78.4% 0 ease easeOut;
  78.6% 0.6 ease easeIn;
  79.4% 0 ease hold;
  79.4667% 0 ease easeOut;
  79.6667% 0.6 ease easeIn;
  80.4667% 0 ease hold;
  80.5333% 0 ease easeOut;
  80.7333% 0.6 ease easeIn;
  81.5333% 0 ease hold;
  100% 0;
};
keyframes sRen.frame.state.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70% 0 ease easeOut;
  70.6667% 1 ease hold;
  74.3333% 1 ease easeOut;
  75% 0 ease hold;
  100% 0;
};
keyframes sRen.frame.draw.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70.5% 0 ease easeOut;
  71.1667% 1 ease hold;
  100% 1;
};
keyframes sRen.frame.live.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  74.3333% 0 ease easeOut;
  75% 1 ease hold;
  81.6667% 1 ease easeOut;
  82.6667% 0 ease hold;
  100% 0;
};
keyframes drawLink.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70.3333% 0 ease easeOut;
  71% 0.9 ease hold;
  100% 0.9;
};
keyframes canvas.ball.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70.6667% 0 ease easeOut;
  71.5% 1 ease hold;
  100% 1;
};
keyframes canvas.ball.scale {
  start 0s;
  duration 30s;
  0% (0.6, 0.6) ease hold;
  70.6667% (0.6, 0.6) ease easeOut;
  71.5% (1, 1) ease hold;
  100% (1, 1);
};
keyframes canvas.ball.position.x {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  74.3333% 0 ease easeOut;
  81% 380 ease hold;
  100% 380;
};
keyframes tick0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  74.3333% 0 ease easeOut;
  74.5% 1 ease hold;
  75.0667% 1 ease easeOut;
  75.3333% 0 ease hold;
  100% 0;
};
keyframes tick0.position.x {
  start 0s;
  duration 30s;
  0% 2216 ease hold;
  74.3333% 2216 ease linear;
  75.3333% 2344 ease hold;
  100% 2344;
};
keyframes tick1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  75.4% 0 ease easeOut;
  75.5667% 1 ease hold;
  76.1333% 1 ease easeOut;
  76.4% 0 ease hold;
  100% 0;
};
keyframes tick1.position.x {
  start 0s;
  duration 30s;
  0% 2216 ease hold;
  75.4% 2216 ease linear;
  76.4% 2344 ease hold;
  100% 2344;
};
keyframes tick2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  76.4667% 0 ease easeOut;
  76.6333% 1 ease hold;
  77.2% 1 ease easeOut;
  77.4667% 0 ease hold;
  100% 0;
};
keyframes tick2.position.x {
  start 0s;
  duration 30s;
  0% 2216 ease hold;
  76.4667% 2216 ease linear;
  77.4667% 2344 ease hold;
  100% 2344;
};
keyframes tick3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.5333% 0 ease easeOut;
  77.7% 1 ease hold;
  78.2667% 1 ease easeOut;
  78.5333% 0 ease hold;
  100% 0;
};
keyframes tick3.position.x {
  start 0s;
  duration 30s;
  0% 2216 ease hold;
  77.5333% 2216 ease linear;
  78.5333% 2344 ease hold;
  100% 2344;
};
keyframes tick4.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  78.6% 0 ease easeOut;
  78.7667% 1 ease hold;
  79.3333% 1 ease easeOut;
  79.6% 0 ease hold;
  100% 0;
};
keyframes tick4.position.x {
  start 0s;
  duration 30s;
  0% 2216 ease hold;
  78.6% 2216 ease linear;
  79.6% 2344 ease hold;
  100% 2344;
};
keyframes tick5.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  79.6667% 0 ease easeOut;
  79.8333% 1 ease hold;
  80.4% 1 ease easeOut;
  80.6667% 0 ease hold;
  100% 0;
};
keyframes tick5.position.x {
  start 0s;
  duration 30s;
  0% 2216 ease hold;
  79.6667% 2216 ease linear;
  80.6667% 2344 ease hold;
  100% 2344;
};
keyframes wide.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  86.3333% 0 ease easeOut;
  88.3333% 1 ease hold;
  100% 1;
};
keyframes sMS.title.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  86% 1 ease easeOut;
  87.6667% 0 ease hold;
  100% 0;
};
keyframes sComp.title.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  86% 1 ease easeOut;
  87.6667% 0 ease hold;
  100% 0;
};
keyframes sIR.title.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  86% 1 ease easeOut;
  87.6667% 0 ease hold;
  100% 0;
};
keyframes sRun.title.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  86% 1 ease easeOut;
  87.6667% 0 ease hold;
  100% 0;
};
keyframes sRen.title.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  86% 1 ease easeOut;
  87.6667% 0 ease hold;
  100% 0;
};
keyframes hl.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  87.8333% 0 ease easeOut;
  88.3333% 1 ease hold;
  95% 1 ease easeOut;
  96% 0 ease hold;
  100% 0;
};
keyframes hl.position.x {
  start 0s;
  duration 30s;
  0% 320 ease hold;
  88.3333% 320 ease linear;
  95% 2560 ease hold;
  100% 2560;
};
keyframes sMS.glow2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  87.8333% 0 ease easeOut;
  88.3333% 1 ease hold;
  89.1667% 1 ease easeOut;
  90.6667% 0 ease hold;
  100% 0;
};
keyframes links.h0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  88.82% 0 ease easeOut;
  89.1533% 1 ease hold;
  89.68% 1 ease easeOut;
  91.0133% 0 ease hold;
  100% 0;
};
keyframes sComp.glow2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  89.5% 0 ease easeOut;
  90% 1 ease hold;
  90.8333% 1 ease easeOut;
  92.3333% 0 ease hold;
  100% 0;
};
keyframes links.h1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  90.4867% 0 ease easeOut;
  90.82% 1 ease hold;
  91.3467% 1 ease easeOut;
  92.68% 0 ease hold;
  100% 0;
};
keyframes sIR.glow2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  91.1667% 0 ease easeOut;
  91.6667% 1 ease hold;
  92.5% 1 ease easeOut;
  94% 0 ease hold;
  100% 0;
};
keyframes links.h2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  92.1533% 0 ease easeOut;
  92.4867% 1 ease hold;
  93.0133% 1 ease easeOut;
  94.3467% 0 ease hold;
  100% 0;
};
keyframes sRun.glow2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  92.8333% 0 ease easeOut;
  93.3333% 1 ease hold;
  94.1667% 1 ease easeOut;
  95.6667% 0 ease hold;
  100% 0;
};
keyframes links.h3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  93.82% 0 ease easeOut;
  94.1533% 1 ease hold;
  94.68% 1 ease easeOut;
  96.0133% 0 ease hold;
  100% 0;
};
keyframes sRen.glow2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  94.5% 0 ease easeOut;
  95% 1 ease hold;
  95.8333% 1 ease easeOut;
  97.3333% 0.35 ease hold;
  100% 0.35;
};
keyframes gvr.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  93.3333% 0 ease easeOut;
  95% 1 ease hold;
  100% 1;
};
keyframes gvr.bracket.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  93% 0 ease easeOut;
  95% 1 ease hold;
  100% 1;
};
keyframes resolve.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  95% 0 ease easeOut;
  95.1667% 0.7 ease hold;
  95.1668% 0.7 ease easeOut;
  98% 0 ease hold;
  100% 0;
};
keyframes resolve.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  95% (1, 1) ease easeOut;
  98% (1.5, 1.5) ease hold;
  100% (1.5, 1.5);
};
keyframes captions.cap1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1% 0 ease easeOut;
  1.8333% 1 ease hold;
  15.5% 1 ease easeOut;
  16.1667% 0 ease hold;
  100% 0;
};
keyframes captions.cap2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  17.1667% 0 ease easeOut;
  18% 1 ease hold;
  32.1667% 1 ease easeOut;
  32.8333% 0 ease hold;
  100% 0;
};
keyframes captions.cap3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  33.8333% 0 ease easeOut;
  34.6667% 1 ease hold;
  48.8333% 1 ease easeOut;
  49.5% 0 ease hold;
  100% 0;
};
keyframes captions.cap4.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  50.5% 0 ease easeOut;
  51.3333% 1 ease hold;
  68.8333% 1 ease easeOut;
  69.5% 0 ease hold;
  100% 0;
};
keyframes captions.cap5.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70.5% 0 ease easeOut;
  71.3333% 1 ease hold;
  77.8333% 1 ease easeOut;
  78.5% 0 ease hold;
  100% 0;
};
keyframes captions.cap6.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  78.8333% 0 ease easeOut;
  79.6667% 1 ease hold;
  85.6667% 1 ease easeOut;
  86.3333% 0 ease hold;
  100% 0;
};
keyframes captions.cap7.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  87.3333% 0 ease easeOut;
  88.1667% 1 ease hold;
  100% 1;
};
keyframes camera(main).position.x {
  start 0s;
  duration 30s;
  0% 320 ease hold;
  14.6667% 320 ease easeInOut;
  18.3333% 880 ease hold;
  33.3333% 880 ease easeInOut;
  36% 1440 ease hold;
  50% 1440 ease easeInOut;
  53.3333% 2280 ease hold;
  68% 2280 ease easeInOut;
  71.3333% 2470 ease hold;
  85.3333% 2470 ease easeInOut;
  88.6667% 1440 ease hold;
  100% 1440;
};
keyframes camera(main).position.y {
  start 0s;
  duration 30s;
  0% 260 ease hold;
  14.6667% 260 ease easeInOut;
  18.3333% 260 ease hold;
  33.3333% 260 ease easeInOut;
  36% 260 ease hold;
  50% 260 ease easeInOut;
  53.3333% 422 ease hold;
  68% 422 ease easeInOut;
  71.3333% 440 ease hold;
  85.3333% 440 ease easeInOut;
  88.6667% 500 ease hold;
  100% 500;
};
keyframes camera(main).zoom {
  start 0s;
  duration 30s;
  0% 2 ease hold;
  14.6667% 2 ease easeInOut;
  18.3333% 2 ease hold;
  33.3333% 2 ease easeInOut;
  36% 2 ease hold;
  50% 2 ease easeInOut;
  53.3333% 0.92 ease hold;
  68% 0.92 ease easeInOut;
  71.3333% 1 ease hold;
  85.3333% 1 ease easeInOut;
  88.6667% 0.45 ease hold;
  100% 0.45;
};
complete;
