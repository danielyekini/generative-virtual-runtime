// FROM PIXELS TO PREDICTION
// 30 seconds. A handwritten 7, its 28 × 28 intensities, 784 inputs, two hidden layers, ten outputs.
// Charcoal schematic: grey connections, cyan positive, orange negative, white labels.
// Brightness is activation: a cyan disc over each node whose opacity is the value.
// 0:00 grid and three inspected pixels. 0:05 values enter the inputs. 0:09 one neuron computes.
// 0:15 both hidden layers activate. 0:20 scores, softmax, probabilities. 0:25 the forward pass retraced.
// Hidden activations other than the computed neuron, the weights and the scores are illustrative.
// Sound cues are drawn as pulses; MotionScript has no audio.
scene "from-pixels-to-prediction" {
  version "0.2";
  viewport (1280, 720);
  background #15181c;
  duration 30s;
  requires "easing.hold";
  requires "geometry.roundedRect";
  requires "geometry.trimPath";
  requires "geometry.animatedTrim";
  requires "text.basic";
};
camera main {
  position (120, 324);
  zoom 2.8;
  rotation 0deg;
};
group img {
  zIndex 2;
  rectangle frame { position (21, 225); size (198, 198); fill #0e1013; stroke #343a41 width 0.8; };
  path ink { move (61.2, 293.2); cubic (64, 284.8) (73.8, 283.4) (73.8, 283.4); cubic (99, 277.8) (137.5, 275) (171.8, 278.5); cubic (156.4, 310) (131.2, 349.2) (113, 395.4); stroke #f2f4f6 width 16.1 cap round join round; };
  group cells {
    position (22, 226);
    path b1l0 { move (56, 42); line (63, 42); line (63, 49); line (56, 49); close; move (154, 42); line (161, 42); line (161, 49); line (154, 49); close; move (35, 49); line (42, 49); line (42, 56); line (35, 56); close; fill #4d4d4d; opacity 0; };
    path b1l1 { move (63, 42); line (70, 42); line (70, 49); line (63, 49); close; move (70, 42); line (77, 42); line (77, 49); line (70, 49); close; move (154, 49); line (161, 49); line (161, 56); line (154, 56); close; fill #848484; opacity 0; };
    path b1l2 { move (77, 42); line (84, 42); line (84, 49); line (77, 49); close; move (84, 42); line (91, 42); line (91, 49); line (84, 49); close; move (91, 42); line (98, 42); line (98, 49); line (91, 49); close; move (133, 42); line (140, 42); line (140, 49); line (133, 49); close; move (140, 42); line (147, 42); line (147, 49); line (140, 49); close; move (147, 42); line (154, 42); line (154, 49); line (147, 49); close; move (42, 49); line (49, 49); line (49, 56); line (42, 56); close; fill #bbbbbb; opacity 0; };
    path b1l3 { move (98, 42); line (105, 42); line (105, 49); line (98, 49); close; move (105, 42); line (112, 42); line (112, 49); line (105, 49); close; move (112, 42); line (119, 42); line (119, 49); line (112, 49); close; move (119, 42); line (126, 42); line (126, 49); line (119, 49); close; move (126, 42); line (133, 42); line (133, 49); line (126, 49); close; move (49, 49); line (56, 49); line (56, 56); line (49, 56); close; move (56, 49); line (63, 49); line (63, 56); line (56, 56); close; move (63, 49); line (70, 49); line (70, 56); line (63, 56); close; move (70, 49); line (77, 49); line (77, 56); line (70, 56); close; move (77, 49); line (84, 49); line (84, 56); line (77, 56); close; move (84, 49); line (91, 49); line (91, 56); line (84, 56); close; move (91, 49); line (98, 49); line (98, 56); line (91, 56); close; move (98, 49); line (105, 49); line (105, 56); line (98, 56); close; move (105, 49); line (112, 49); line (112, 56); line (105, 56); close; move (112, 49); line (119, 49); line (119, 56); line (112, 56); close; move (119, 49); line (126, 49); line (126, 56); line (119, 56); close; move (126, 49); line (133, 49); line (133, 56); line (126, 56); close; move (133, 49); line (140, 49); line (140, 56); line (133, 56); close; move (140, 49); line (147, 49); line (147, 56); line (140, 56); close; move (147, 49); line (154, 49); line (154, 56); line (147, 56); close; fill #f2f2f2; opacity 0; };
    path b2l0 { move (28, 56); line (35, 56); line (35, 63); line (28, 63); close; move (154, 56); line (161, 56); line (161, 63); line (154, 63); close; move (56, 63); line (63, 63); line (63, 70); line (56, 70); close; move (28, 70); line (35, 70); line (35, 77); line (28, 77); close; move (147, 70); line (154, 70); line (154, 77); line (147, 77); close; move (119, 77); line (126, 77); line (126, 84); line (119, 84); close; fill #4d4d4d; opacity 0; };
    path b2l1 { move (91, 56); line (98, 56); line (98, 63); line (91, 63); close; move (98, 56); line (105, 56); line (105, 63); line (98, 63); close; move (105, 56); line (112, 56); line (112, 63); line (105, 63); close; move (112, 56); line (119, 56); line (119, 63); line (112, 63); close; move (119, 56); line (126, 56); line (126, 63); line (119, 63); close; move (126, 56); line (133, 56); line (133, 63); line (126, 63); close; move (133, 56); line (140, 56); line (140, 63); line (133, 63); close; move (28, 63); line (35, 63); line (35, 70); line (28, 70); close; move (49, 63); line (56, 63); line (56, 70); line (49, 70); close; move (42, 70); line (49, 70); line (49, 77); line (42, 77); close; move (126, 70); line (133, 70); line (133, 77); line (126, 77); close; fill #848484; opacity 0; };
    path b2l2 { move (77, 56); line (84, 56); line (84, 63); line (77, 63); close; move (84, 56); line (91, 56); line (91, 63); line (84, 63); close; move (147, 63); line (154, 63); line (154, 70); line (147, 70); close; move (35, 70); line (42, 70); line (42, 77); line (35, 77); close; move (140, 77); line (147, 77); line (147, 84); line (140, 84); close; fill #bbbbbb; opacity 0; };
    path b2l3 { move (35, 56); line (42, 56); line (42, 63); line (35, 63); close; move (42, 56); line (49, 56); line (49, 63); line (42, 63); close; move (49, 56); line (56, 56); line (56, 63); line (49, 63); close; move (56, 56); line (63, 56); line (63, 63); line (56, 63); close; move (63, 56); line (70, 56); line (70, 63); line (63, 63); close; move (70, 56); line (77, 56); line (77, 63); line (70, 63); close; move (140, 56); line (147, 56); line (147, 63); line (140, 63); close; move (147, 56); line (154, 56); line (154, 63); line (147, 63); close; move (35, 63); line (42, 63); line (42, 70); line (35, 70); close; move (42, 63); line (49, 63); line (49, 70); line (42, 70); close; move (133, 63); line (140, 63); line (140, 70); line (133, 70); close; move (140, 63); line (147, 63); line (147, 70); line (140, 70); close; move (133, 70); line (140, 70); line (140, 77); line (133, 77); close; move (140, 70); line (147, 70); line (147, 77); line (140, 77); close; move (126, 77); line (133, 77); line (133, 84); line (126, 84); close; move (133, 77); line (140, 77); line (140, 84); line (133, 84); close; fill #f2f2f2; opacity 0; };
    path b3l0 { move (140, 84); line (147, 84); line (147, 91); line (140, 91); close; move (112, 91); line (119, 91); line (119, 98); line (112, 98); close; move (105, 105); line (112, 105); line (112, 112); line (105, 112); close; fill #4d4d4d; opacity 0; };
    path b3l1 { move (133, 91); line (140, 91); line (140, 98); line (133, 98); close; move (126, 105); line (133, 105); line (133, 112); line (126, 112); close; fill #848484; opacity 0; };
    path b3l2 { move (119, 84); line (126, 84); line (126, 91); line (119, 91); close; move (112, 98); line (119, 98); line (119, 105); line (112, 105); close; fill #bbbbbb; opacity 0; };
    path b3l3 { move (126, 84); line (133, 84); line (133, 91); line (126, 91); close; move (133, 84); line (140, 84); line (140, 91); line (133, 91); close; move (119, 91); line (126, 91); line (126, 98); line (119, 98); close; move (126, 91); line (133, 91); line (133, 98); line (126, 98); close; move (119, 98); line (126, 98); line (126, 105); line (119, 105); close; move (126, 98); line (133, 98); line (133, 105); line (126, 105); close; move (112, 105); line (119, 105); line (119, 112); line (112, 112); close; move (119, 105); line (126, 105); line (126, 112); line (119, 112); close; fill #f2f2f2; opacity 0; };
    path b4l0 { move (98, 119); line (105, 119); line (105, 126); line (98, 126); close; move (91, 133); line (98, 133); line (98, 140); line (91, 140); close; fill #4d4d4d; opacity 0; };
    path b4l1 { move (119, 119); line (126, 119); line (126, 126); line (119, 126); close; move (112, 133); line (119, 133); line (119, 140); line (112, 140); close; fill #848484; opacity 0; };
    path b4l2 { move (105, 112); line (112, 112); line (112, 119); line (105, 119); close; move (98, 126); line (105, 126); line (105, 133); line (98, 133); close; fill #bbbbbb; opacity 0; };
    path b4l3 { move (112, 112); line (119, 112); line (119, 119); line (112, 119); close; move (119, 112); line (126, 112); line (126, 119); line (119, 119); close; move (105, 119); line (112, 119); line (112, 126); line (105, 126); close; move (112, 119); line (119, 119); line (119, 126); line (112, 126); close; move (105, 126); line (112, 126); line (112, 133); line (105, 133); close; move (112, 126); line (119, 126); line (119, 133); line (112, 133); close; move (98, 133); line (105, 133); line (105, 140); line (98, 140); close; move (105, 133); line (112, 133); line (112, 140); line (105, 140); close; fill #f2f2f2; opacity 0; };
    path b5l0 { move (84, 147); line (91, 147); line (91, 154); line (84, 154); close; fill #4d4d4d; opacity 0; };
    path b5l1 { move (105, 147); line (112, 147); line (112, 154); line (105, 154); close; move (84, 154); line (91, 154); line (91, 161); line (84, 161); close; move (98, 161); line (105, 161); line (105, 168); line (98, 168); close; fill #848484; opacity 0; };
    path b5l2 { move (91, 140); line (98, 140); line (98, 147); line (91, 147); close; fill #bbbbbb; opacity 0; };
    path b5l3 { move (98, 140); line (105, 140); line (105, 147); line (98, 147); close; move (105, 140); line (112, 140); line (112, 147); line (105, 147); close; move (91, 147); line (98, 147); line (98, 154); line (91, 154); close; move (98, 147); line (105, 147); line (105, 154); line (98, 154); close; move (91, 154); line (98, 154); line (98, 161); line (91, 161); close; move (98, 154); line (105, 154); line (105, 161); line (98, 161); close; move (84, 161); line (91, 161); line (91, 168); line (84, 168); close; move (91, 161); line (98, 161); line (98, 168); line (91, 168); close; fill #f2f2f2; opacity 0; };
    path b6l0 { move (77, 168); line (84, 168); line (84, 175); line (77, 175); close; move (98, 168); line (105, 168); line (105, 175); line (98, 175); close; move (84, 175); line (91, 175); line (91, 182); line (84, 182); close; move (91, 175); line (98, 175); line (98, 182); line (91, 182); close; fill #4d4d4d; opacity 0; };
    path b6l3 { move (84, 168); line (91, 168); line (91, 175); line (84, 175); close; move (91, 168); line (98, 168); line (98, 175); line (91, 175); close; fill #f2f2f2; opacity 0; };
  };
  group gridH {
    position (22, 226);
    path r0 { move (0, 0); line (196, 0); move (0, 7); line (196, 7); move (0, 14); line (196, 14); move (0, 21); line (196, 21); stroke #343a41 width 0.35; opacity 0; };
    path r1 { move (0, 28); line (196, 28); move (0, 35); line (196, 35); move (0, 42); line (196, 42); move (0, 49); line (196, 49); stroke #343a41 width 0.35; opacity 0; };
    path r2 { move (0, 56); line (196, 56); move (0, 63); line (196, 63); move (0, 70); line (196, 70); move (0, 77); line (196, 77); stroke #343a41 width 0.35; opacity 0; };
    path r3 { move (0, 84); line (196, 84); move (0, 91); line (196, 91); move (0, 98); line (196, 98); move (0, 105); line (196, 105); stroke #343a41 width 0.35; opacity 0; };
    path r4 { move (0, 112); line (196, 112); move (0, 119); line (196, 119); move (0, 126); line (196, 126); move (0, 133); line (196, 133); stroke #343a41 width 0.35; opacity 0; };
    path r5 { move (0, 140); line (196, 140); move (0, 147); line (196, 147); move (0, 154); line (196, 154); move (0, 161); line (196, 161); stroke #343a41 width 0.35; opacity 0; };
    path r6 { move (0, 168); line (196, 168); move (0, 175); line (196, 175); move (0, 182); line (196, 182); move (0, 189); line (196, 189); move (0, 196); line (196, 196); stroke #343a41 width 0.35; opacity 0; };
  };
  group gridV {
    position (22, 226);
    scale (1, 0);
    path lines { move (0, 0); line (0, 196); move (7, 0); line (7, 196); move (14, 0); line (14, 196); move (21, 0); line (21, 196); move (28, 0); line (28, 196); move (35, 0); line (35, 196); move (42, 0); line (42, 196); move (49, 0); line (49, 196); move (56, 0); line (56, 196); move (63, 0); line (63, 196); move (70, 0); line (70, 196); move (77, 0); line (77, 196); move (84, 0); line (84, 196); move (91, 0); line (91, 196); move (98, 0); line (98, 196); move (105, 0); line (105, 196); move (112, 0); line (112, 196); move (119, 0); line (119, 196); move (126, 0); line (126, 196); move (133, 0); line (133, 196); move (140, 0); line (140, 196); move (147, 0); line (147, 196); move (154, 0); line (154, 196); move (161, 0); line (161, 196); move (168, 0); line (168, 196); move (175, 0); line (175, 196); move (182, 0); line (182, 196); move (189, 0); line (189, 196); move (196, 0); line (196, 196); stroke #343a41 width 0.35; };
  };
  group scan {
    position (22, 226);
    opacity 0;
    rectangle haze { position (0, -7); size (196, 14); fill #3ad8ff; opacity 0.14; };
    rectangle bar { position (0, -0.7); size (196, 1.4); fill #3ad8ff; };
  };
  text label { position (120, 212); content "28 × 28 pixels"; fontFamily "sans"; fontSize 10; fontWeight 600; align center; baseline middle; fill #8b949e; opacity 0; };
  group pk0 {
    position (116.5, 278.5);
    zIndex 10;
    rectangle mark { position (-3.5, -3.5); size (7, 7); stroke #3ad8ff width 0.7; opacity 0; };
    group zoom {
      opacity 0;
      rectangle sq { position (-3.5, -3.5); size (7, 7); fill #f2f2f2; stroke #3ad8ff width 0.35; };
    };
    group tag {
      position (32, 0);
      opacity 0;
      rectangle plate { position (-17, -8); size (34, 16); cornerRadius 3; fill #15181c; stroke #3ad8ff width 0.5; };
      text val { position (0, 0.5); content "1.00"; fontSize 10; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
    };
  };
  group pk1 {
    position (116.5, 369.5);
    zIndex 11;
    rectangle mark { position (-3.5, -3.5); size (7, 7); stroke #3ad8ff width 0.7; opacity 0; };
    group zoom {
      opacity 0;
      rectangle sq { position (-3.5, -3.5); size (7, 7); fill #9c9c9c; stroke #3ad8ff width 0.35; };
    };
    group tag {
      position (32, 0);
      opacity 0;
      rectangle plate { position (-17, -8); size (34, 16); cornerRadius 3; fill #15181c; stroke #3ad8ff width 0.5; };
      text val { position (0, 0.5); content "0.61"; fontSize 10; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
    };
  };
  group pk2 {
    position (67.5, 320.5);
    zIndex 12;
    rectangle mark { position (-3.5, -3.5); size (7, 7); stroke #3ad8ff width 0.7; opacity 0; };
    group zoom {
      opacity 0;
      rectangle sq { position (-3.5, -3.5); size (7, 7); fill #161616; stroke #3ad8ff width 0.35; };
    };
    group tag {
      position (-32, 0);
      opacity 0;
      rectangle plate { position (-17, -8); size (34, 16); cornerRadius 3; fill #15181c; stroke #3ad8ff width 0.5; };
      text val { position (0, 0.5); content "0.00"; fontSize 10; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
    };
  };
};
group wires {
  zIndex 3;
  opacity 0;
  path a { move (340, 144); line (540, 164); move (340, 144); line (540, 204); move (340, 144); line (540, 244); move (340, 144); line (540, 284); move (340, 144); line (540, 364); move (340, 144); line (540, 404); move (340, 144); line (540, 444); move (340, 144); line (540, 484); move (340, 168); line (540, 164); move (340, 168); line (540, 204); move (340, 168); line (540, 244); move (340, 168); line (540, 284); move (340, 168); line (540, 364); move (340, 168); line (540, 404); move (340, 168); line (540, 444); move (340, 168); line (540, 484); move (340, 192); line (540, 164); move (340, 192); line (540, 204); move (340, 192); line (540, 244); move (340, 192); line (540, 284); move (340, 192); line (540, 364); move (340, 192); line (540, 404); move (340, 192); line (540, 444); move (340, 192); line (540, 484); move (340, 216); line (540, 164); move (340, 216); line (540, 204); move (340, 216); line (540, 244); move (340, 216); line (540, 284); move (340, 216); line (540, 364); move (340, 216); line (540, 404); move (340, 216); line (540, 444); move (340, 216); line (540, 484); move (340, 240); line (540, 164); move (340, 240); line (540, 204); move (340, 240); line (540, 244); move (340, 240); line (540, 284); move (340, 240); line (540, 364); move (340, 240); line (540, 404); move (340, 240); line (540, 444); move (340, 240); line (540, 484); move (340, 264); line (540, 164); move (340, 264); line (540, 204); move (340, 264); line (540, 244); move (340, 264); line (540, 284); move (340, 264); line (540, 364); move (340, 264); line (540, 404); move (340, 264); line (540, 444); move (340, 264); line (540, 484); move (340, 288); line (540, 164); move (340, 288); line (540, 204); move (340, 288); line (540, 244); move (340, 288); line (540, 284); move (340, 288); line (540, 364); move (340, 288); line (540, 404); move (340, 288); line (540, 444); move (340, 288); line (540, 484); move (340, 360); line (540, 164); move (340, 360); line (540, 204); move (340, 360); line (540, 244); move (340, 360); line (540, 284); move (340, 360); line (540, 364); move (340, 360); line (540, 404); move (340, 360); line (540, 444); move (340, 360); line (540, 484); move (340, 384); line (540, 164); move (340, 384); line (540, 204); move (340, 384); line (540, 244); move (340, 384); line (540, 284); move (340, 384); line (540, 364); move (340, 384); line (540, 404); move (340, 384); line (540, 444); move (340, 384); line (540, 484); move (340, 408); line (540, 164); move (340, 408); line (540, 204); move (340, 408); line (540, 244); move (340, 408); line (540, 284); move (340, 408); line (540, 364); move (340, 408); line (540, 404); move (340, 408); line (540, 444); move (340, 408); line (540, 484); move (340, 432); line (540, 164); move (340, 432); line (540, 204); move (340, 432); line (540, 244); move (340, 432); line (540, 284); move (340, 432); line (540, 364); move (340, 432); line (540, 404); move (340, 432); line (540, 444); move (340, 432); line (540, 484); move (340, 456); line (540, 164); move (340, 456); line (540, 204); move (340, 456); line (540, 244); move (340, 456); line (540, 284); move (340, 456); line (540, 364); move (340, 456); line (540, 404); move (340, 456); line (540, 444); move (340, 456); line (540, 484); move (340, 480); line (540, 164); move (340, 480); line (540, 204); move (340, 480); line (540, 244); move (340, 480); line (540, 284); move (340, 480); line (540, 364); move (340, 480); line (540, 404); move (340, 480); line (540, 444); move (340, 480); line (540, 484); move (340, 504); line (540, 164); move (340, 504); line (540, 204); move (340, 504); line (540, 244); move (340, 504); line (540, 284); move (340, 504); line (540, 364); move (340, 504); line (540, 404); move (340, 504); line (540, 444); move (340, 504); line (540, 484); stroke #3d444c width 0.5; opacity 0.8; };
  path b { move (540, 164); line (740, 164); move (540, 164); line (740, 204); move (540, 164); line (740, 244); move (540, 164); line (740, 284); move (540, 164); line (740, 364); move (540, 164); line (740, 404); move (540, 164); line (740, 444); move (540, 164); line (740, 484); move (540, 204); line (740, 164); move (540, 204); line (740, 204); move (540, 204); line (740, 244); move (540, 204); line (740, 284); move (540, 204); line (740, 364); move (540, 204); line (740, 404); move (540, 204); line (740, 444); move (540, 204); line (740, 484); move (540, 244); line (740, 164); move (540, 244); line (740, 204); move (540, 244); line (740, 244); move (540, 244); line (740, 284); move (540, 244); line (740, 364); move (540, 244); line (740, 404); move (540, 244); line (740, 444); move (540, 244); line (740, 484); move (540, 284); line (740, 164); move (540, 284); line (740, 204); move (540, 284); line (740, 244); move (540, 284); line (740, 284); move (540, 284); line (740, 364); move (540, 284); line (740, 404); move (540, 284); line (740, 444); move (540, 284); line (740, 484); move (540, 364); line (740, 164); move (540, 364); line (740, 204); move (540, 364); line (740, 244); move (540, 364); line (740, 284); move (540, 364); line (740, 364); move (540, 364); line (740, 404); move (540, 364); line (740, 444); move (540, 364); line (740, 484); move (540, 404); line (740, 164); move (540, 404); line (740, 204); move (540, 404); line (740, 244); move (540, 404); line (740, 284); move (540, 404); line (740, 364); move (540, 404); line (740, 404); move (540, 404); line (740, 444); move (540, 404); line (740, 484); move (540, 444); line (740, 164); move (540, 444); line (740, 204); move (540, 444); line (740, 244); move (540, 444); line (740, 284); move (540, 444); line (740, 364); move (540, 444); line (740, 404); move (540, 444); line (740, 444); move (540, 444); line (740, 484); move (540, 484); line (740, 164); move (540, 484); line (740, 204); move (540, 484); line (740, 244); move (540, 484); line (740, 284); move (540, 484); line (740, 364); move (540, 484); line (740, 404); move (540, 484); line (740, 444); move (540, 484); line (740, 484); stroke #3d444c width 0.5; opacity 0.8; };
  path c { move (740, 164); line (920, 162); move (740, 164); line (920, 198); move (740, 164); line (920, 234); move (740, 164); line (920, 270); move (740, 164); line (920, 306); move (740, 164); line (920, 342); move (740, 164); line (920, 378); move (740, 164); line (920, 414); move (740, 164); line (920, 450); move (740, 164); line (920, 486); move (740, 204); line (920, 162); move (740, 204); line (920, 198); move (740, 204); line (920, 234); move (740, 204); line (920, 270); move (740, 204); line (920, 306); move (740, 204); line (920, 342); move (740, 204); line (920, 378); move (740, 204); line (920, 414); move (740, 204); line (920, 450); move (740, 204); line (920, 486); move (740, 244); line (920, 162); move (740, 244); line (920, 198); move (740, 244); line (920, 234); move (740, 244); line (920, 270); move (740, 244); line (920, 306); move (740, 244); line (920, 342); move (740, 244); line (920, 378); move (740, 244); line (920, 414); move (740, 244); line (920, 450); move (740, 244); line (920, 486); move (740, 284); line (920, 162); move (740, 284); line (920, 198); move (740, 284); line (920, 234); move (740, 284); line (920, 270); move (740, 284); line (920, 306); move (740, 284); line (920, 342); move (740, 284); line (920, 378); move (740, 284); line (920, 414); move (740, 284); line (920, 450); move (740, 284); line (920, 486); move (740, 364); line (920, 162); move (740, 364); line (920, 198); move (740, 364); line (920, 234); move (740, 364); line (920, 270); move (740, 364); line (920, 306); move (740, 364); line (920, 342); move (740, 364); line (920, 378); move (740, 364); line (920, 414); move (740, 364); line (920, 450); move (740, 364); line (920, 486); move (740, 404); line (920, 162); move (740, 404); line (920, 198); move (740, 404); line (920, 234); move (740, 404); line (920, 270); move (740, 404); line (920, 306); move (740, 404); line (920, 342); move (740, 404); line (920, 378); move (740, 404); line (920, 414); move (740, 404); line (920, 450); move (740, 404); line (920, 486); move (740, 444); line (920, 162); move (740, 444); line (920, 198); move (740, 444); line (920, 234); move (740, 444); line (920, 270); move (740, 444); line (920, 306); move (740, 444); line (920, 342); move (740, 444); line (920, 378); move (740, 444); line (920, 414); move (740, 444); line (920, 450); move (740, 444); line (920, 486); move (740, 484); line (920, 162); move (740, 484); line (920, 198); move (740, 484); line (920, 234); move (740, 484); line (920, 270); move (740, 484); line (920, 306); move (740, 484); line (920, 342); move (740, 484); line (920, 378); move (740, 484); line (920, 414); move (740, 484); line (920, 450); move (740, 484); line (920, 486); stroke #3d444c width 0.5; opacity 0.8; };
  path aPos { move (340, 144); line (540, 204); move (340, 144); line (540, 284); move (340, 144); line (540, 404); move (340, 168); line (540, 204); move (340, 168); line (540, 244); move (340, 168); line (540, 484); move (340, 192); line (540, 164); move (340, 192); line (540, 284); move (340, 192); line (540, 484); move (340, 216); line (540, 164); move (340, 216); line (540, 284); move (340, 240); line (540, 244); move (340, 240); line (540, 404); move (340, 264); line (540, 284); move (340, 264); line (540, 444); move (340, 264); line (540, 484); move (340, 288); line (540, 204); move (340, 288); line (540, 404); move (340, 360); line (540, 364); move (340, 360); line (540, 404); move (340, 384); line (540, 164); move (340, 384); line (540, 204); move (340, 384); line (540, 364); move (340, 384); line (540, 404); move (340, 408); line (540, 164); move (340, 408); line (540, 204); move (340, 408); line (540, 284); move (340, 408); line (540, 444); move (340, 408); line (540, 484); move (340, 432); line (540, 284); move (340, 432); line (540, 364); move (340, 432); line (540, 484); move (340, 456); line (540, 364); move (340, 456); line (540, 444); move (340, 456); line (540, 484); move (340, 480); line (540, 484); move (340, 504); line (540, 164); move (340, 504); line (540, 204); move (340, 504); line (540, 284); move (340, 504); line (540, 444); move (340, 504); line (540, 484); stroke #3ad8ff width 0.8; opacity 0; };
  path aNeg { move (340, 144); line (540, 164); move (340, 144); line (540, 364); move (340, 144); line (540, 444); move (340, 144); line (540, 484); move (340, 168); line (540, 164); move (340, 192); line (540, 364); move (340, 192); line (540, 444); move (340, 216); line (540, 204); move (340, 216); line (540, 244); move (340, 216); line (540, 364); move (340, 216); line (540, 484); move (340, 240); line (540, 164); move (340, 240); line (540, 284); move (340, 240); line (540, 444); move (340, 264); line (540, 164); move (340, 264); line (540, 204); move (340, 264); line (540, 364); move (340, 264); line (540, 404); move (340, 288); line (540, 284); move (340, 288); line (540, 364); move (340, 360); line (540, 164); move (340, 360); line (540, 244); move (340, 360); line (540, 284); move (340, 360); line (540, 444); move (340, 384); line (540, 244); move (340, 408); line (540, 244); move (340, 408); line (540, 364); move (340, 408); line (540, 404); move (340, 432); line (540, 164); move (340, 432); line (540, 204); move (340, 432); line (540, 244); move (340, 432); line (540, 404); move (340, 456); line (540, 204); move (340, 456); line (540, 244); move (340, 456); line (540, 284); move (340, 456); line (540, 404); move (340, 480); line (540, 204); move (340, 480); line (540, 284); move (340, 480); line (540, 364); move (340, 504); line (540, 244); move (340, 504); line (540, 404); stroke #ff8a3d width 0.8; opacity 0; };
  path bPos { move (540, 164); line (740, 364); move (540, 164); line (740, 404); move (540, 164); line (740, 484); move (540, 204); line (740, 244); move (540, 204); line (740, 484); move (540, 244); line (740, 244); move (540, 244); line (740, 404); move (540, 244); line (740, 444); move (540, 284); line (740, 404); move (540, 284); line (740, 444); move (540, 284); line (740, 484); move (540, 364); line (740, 164); move (540, 364); line (740, 284); move (540, 364); line (740, 444); move (540, 404); line (740, 204); move (540, 404); line (740, 244); move (540, 404); line (740, 284); move (540, 404); line (740, 364); move (540, 444); line (740, 444); move (540, 484); line (740, 204); move (540, 484); line (740, 404); stroke #3ad8ff width 0.8; opacity 0; };
  path bNeg { move (540, 164); line (740, 164); move (540, 164); line (740, 204); move (540, 164); line (740, 244); move (540, 164); line (740, 284); move (540, 164); line (740, 444); move (540, 204); line (740, 164); move (540, 204); line (740, 204); move (540, 204); line (740, 284); move (540, 204); line (740, 364); move (540, 204); line (740, 404); move (540, 244); line (740, 364); move (540, 244); line (740, 484); move (540, 284); line (740, 164); move (540, 284); line (740, 204); move (540, 284); line (740, 284); move (540, 284); line (740, 364); move (540, 364); line (740, 204); move (540, 364); line (740, 244); move (540, 364); line (740, 364); move (540, 364); line (740, 404); move (540, 364); line (740, 484); move (540, 404); line (740, 164); move (540, 404); line (740, 404); move (540, 444); line (740, 244); move (540, 444); line (740, 404); move (540, 444); line (740, 484); move (540, 484); line (740, 164); move (540, 484); line (740, 364); move (540, 484); line (740, 444); move (540, 484); line (740, 484); stroke #ff8a3d width 0.8; opacity 0; };
  path cPos { move (740, 164); line (920, 234); move (740, 164); line (920, 378); move (740, 204); line (920, 162); move (740, 204); line (920, 198); move (740, 204); line (920, 306); move (740, 204); line (920, 378); move (740, 244); line (920, 198); move (740, 244); line (920, 378); move (740, 244); line (920, 450); move (740, 284); line (920, 162); move (740, 284); line (920, 234); move (740, 284); line (920, 378); move (740, 284); line (920, 450); move (740, 364); line (920, 162); move (740, 364); line (920, 198); move (740, 364); line (920, 234); move (740, 364); line (920, 306); move (740, 364); line (920, 414); move (740, 404); line (920, 162); move (740, 404); line (920, 342); move (740, 404); line (920, 378); move (740, 404); line (920, 486); move (740, 444); line (920, 306); move (740, 444); line (920, 342); move (740, 444); line (920, 378); move (740, 444); line (920, 414); move (740, 444); line (920, 486); move (740, 484); line (920, 234); move (740, 484); line (920, 270); move (740, 484); line (920, 306); move (740, 484); line (920, 378); move (740, 484); line (920, 450); move (740, 484); line (920, 486); stroke #3ad8ff width 0.9; opacity 0; };
  path cNeg { move (740, 164); line (920, 162); move (740, 164); line (920, 270); move (740, 164); line (920, 306); move (740, 164); line (920, 342); move (740, 164); line (920, 450); move (740, 164); line (920, 486); move (740, 204); line (920, 234); move (740, 204); line (920, 270); move (740, 204); line (920, 450); move (740, 204); line (920, 486); move (740, 244); line (920, 234); move (740, 244); line (920, 270); move (740, 244); line (920, 342); move (740, 244); line (920, 486); move (740, 284); line (920, 198); move (740, 284); line (920, 270); move (740, 284); line (920, 306); move (740, 284); line (920, 414); move (740, 364); line (920, 270); move (740, 364); line (920, 342); move (740, 364); line (920, 378); move (740, 364); line (920, 450); move (740, 364); line (920, 486); move (740, 404); line (920, 198); move (740, 404); line (920, 306); move (740, 404); line (920, 414); move (740, 404); line (920, 450); move (740, 444); line (920, 198); move (740, 444); line (920, 234); move (740, 444); line (920, 450); move (740, 484); line (920, 342); stroke #ff8a3d width 0.9; opacity 0; };
  path fan { move (340, 144); line (540, 284); move (340, 168); line (540, 284); move (340, 192); line (540, 284); move (340, 216); line (540, 284); move (340, 240); line (540, 284); move (340, 264); line (540, 284); move (340, 288); line (540, 284); move (340, 360); line (540, 284); move (340, 384); line (540, 284); move (340, 408); line (540, 284); move (340, 432); line (540, 284); move (340, 456); line (540, 284); move (340, 480); line (540, 284); move (340, 504); line (540, 284); stroke #f2f4f6 width 0.9; opacity 0; };
};
group guides {
  zIndex 4;
  path g2 { move (116.5, 278.5); line (331, 192); stroke #3ad8ff width 0.9 cap round; opacity 0; };
  path g9 { move (116.5, 369.5); line (331, 408); stroke #3ad8ff width 0.9 cap round; opacity 0; };
  path g5 { move (67.5, 320.5); line (331, 264); stroke #3ad8ff width 0.9 cap round; opacity 0; };
  path g1 { move (88.5, 278.5); line (331, 168); stroke #3ad8ff width 0.9 cap round; opacity 0; };
  path g6 { move (144.5, 327.5); line (331, 288); stroke #3ad8ff width 0.9 cap round; opacity 0; };
  path g11 { move (109.5, 390.5); line (331, 456); stroke #3ad8ff width 0.9 cap round; opacity 0; };
};
group inp {
  zIndex 6;
  opacity 0;
  text title { position (340, 116); content "784 inputs"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
  text more { position (340, 324); content "⋮"; fontFamily "sans"; fontSize 20; fontWeight 600; align center; baseline middle; fill #8b949e; };
  group brace {
    opacity 0;
    rectangle plate { position (354, 312); size (104, 24); cornerRadius 4; fill #15181c; opacity 0.92; };
    path mark { move (352, 140); line (358, 140); line (358, 508); line (352, 508); move (358, 324); line (363, 324); stroke #f2f4f6 width 1.1 join round; };
    text words { position (366, 324.5); content "One input per pixel"; fontFamily "sans"; fontSize 10; fontWeight 600; baseline middle; fill #f2f4f6; align left; };
  };
  group n0 {
    position (340, 144);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n1 {
    position (340, 168);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n2 {
    position (340, 192);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n3 {
    position (340, 216);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n4 {
    position (340, 240);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n5 {
    position (340, 264);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n6 {
    position (340, 288);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n7 {
    position (340, 360);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n8 {
    position (340, 384);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n9 {
    position (340, 408);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n10 {
    position (340, 432);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n11 {
    position (340, 456);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n12 {
    position (340, 480);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n13 {
    position (340, 504);
    circle base { radius 7; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 7; fill #3ad8ff; opacity 0; };
    circle tick { radius 10; stroke #3ad8ff width 1; opacity 0; };
    
  };
};
group h1 {
  zIndex 6;
  opacity 0;
  text title { position (540, 116); content "Hidden layer 1"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
  text sub { position (540, 132); content "learned representation"; fontFamily "sans"; fontSize 9; fontWeight 500; align center; baseline middle; fill #8b949e; };
  text more { position (540, 324); content "⋮"; fontFamily "sans"; fontSize 20; fontWeight 600; align center; baseline middle; fill #8b949e; };
  rectangle beat { position (518, 146); size (44, 356); cornerRadius 22; stroke #3ad8ff width 1.2; opacity 0; };
  group n0 {
    position (540, 164);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n1 {
    position (540, 204);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n2 {
    position (540, 244);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n3 {
    position (540, 284);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    circle sel { radius 15; stroke #f2f4f6 width 1.4; opacity 0; };
  };
  group n4 {
    position (540, 364);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n5 {
    position (540, 404);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n6 {
    position (540, 444);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n7 {
    position (540, 484);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
};
group h2 {
  zIndex 6;
  opacity 0;
  text title { position (740, 116); content "Hidden layer 2"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
  text sub { position (740, 132); content "learned representation"; fontFamily "sans"; fontSize 9; fontWeight 500; align center; baseline middle; fill #8b949e; };
  text more { position (740, 324); content "⋮"; fontFamily "sans"; fontSize 20; fontWeight 600; align center; baseline middle; fill #8b949e; };
  rectangle beat { position (718, 146); size (44, 356); cornerRadius 22; stroke #3ad8ff width 1.2; opacity 0; };
  group n0 {
    position (740, 164);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n1 {
    position (740, 204);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n2 {
    position (740, 244);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n3 {
    position (740, 284);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n4 {
    position (740, 364);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n5 {
    position (740, 404);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n6 {
    position (740, 444);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
  group n7 {
    position (740, 484);
    circle base { radius 11; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 11; fill #3ad8ff; opacity 0; };
    circle tick { radius 14; stroke #3ad8ff width 1; opacity 0; };
    
  };
};
group out {
  zIndex 6;
  opacity 0;
  text title { position (920, 116); content "Outputs 0–9"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
  text scores { position (962, 132); content "scores"; fontFamily "sans"; fontSize 9; fontWeight 500; align center; baseline middle; fill #8b949e; opacity 0; };
  text probs { position (1115, 132); content "probability"; fontFamily "sans"; fontSize 9; fontWeight 500; align center; baseline middle; fill #8b949e; opacity 0; };
  group smax {
    opacity 0;
    rectangle box { position (995, 148); size (32, 352); cornerRadius 6; fill #1d2227; stroke #5b636d width 1; };
    rectangle glow { position (993, 146); size (36, 356); cornerRadius 8; stroke #3ad8ff width 1.6; opacity 0; };
    text word { position (1011, 324); content "Softmax"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; rotation 270deg; };
  };
  text others { position (1040, 514); content "0, 2, 3, 4, 5, 6, 8 combined: 3%"; fontFamily "sans"; fontSize 10; fontWeight 500; baseline middle; fill #8b949e; align left; opacity 0; };
  group d0 {
    position (920, 162);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "0"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−1.60"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (1.5, 12); fill #8b949e; scale (0, 1); };
    text pct { position (127.5, 0.5); content "<1%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d1 {
    position (920, 198);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "1"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−0.02"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (4.515, 12); fill #8b949e; scale (0, 1); };
    text pct { position (130.51, 0.5); content "3%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d2 {
    position (920, 234);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "2"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−2.30"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (1.5, 12); fill #8b949e; scale (0, 1); };
    text pct { position (127.5, 0.5); content "<1%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d3 {
    position (920, 270);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "3"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−1.85"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (1.5, 12); fill #8b949e; scale (0, 1); };
    text pct { position (127.5, 0.5); content "<1%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d4 {
    position (920, 306);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "4"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−2.05"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (1.5, 12); fill #8b949e; scale (0, 1); };
    text pct { position (127.5, 0.5); content "<1%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d5 {
    position (920, 342);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "5"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−2.20"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (1.5, 12); fill #8b949e; scale (0, 1); };
    text pct { position (127.5, 0.5); content "<1%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d6 {
    position (920, 378);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "6"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−1.70"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (1.5, 12); fill #8b949e; scale (0, 1); };
    text pct { position (127.5, 0.5); content "<1%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d7 {
    position (920, 414);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    circle win { radius 17; stroke #3ad8ff width 2.2; opacity 0; };
    text digit { position (0, 0.5); content "7"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "3.40"; fontSize 11; fontWeight 500; baseline middle; fill #3ad8ff; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (138.011, 12); fill #3ad8ff; scale (0, 1); };
    text pct { position (264.01, 0.5); content "92%"; fontSize 11; fontWeight 500; baseline middle; fill #3ad8ff; fontFamily "monospace"; align left; opacity 0; };
  };
  group d8 {
    position (920, 450);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "8"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−2.40"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (1.5, 12); fill #8b949e; scale (0, 1); };
    text pct { position (127.5, 0.5); content "<1%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
  group d9 {
    position (920, 486);
    circle base { radius 13; fill #1b1f24; stroke #5b636d width 1; };
    circle glow { radius 13; fill #3ad8ff; opacity 0; };
    circle neg { radius 13; fill #ff8a3d; opacity 0; };
    
    text digit { position (0, 0.5); content "9"; fontFamily "sans"; fontSize 12; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
    text score { position (25, 0.5); content "−0.43"; fontSize 11; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
    rectangle bar { position (120, -6); size (2.996, 12); fill #8b949e; scale (0, 1); };
    text pct { position (129, 0.5); content "2%"; fontSize 11; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  };
};
group calc {
  zIndex 8;
  rectangle panel { position (553, 176); size (262, 176); cornerRadius 8; fill #15181c; stroke #343a41 width 0.8; opacity 0; };
  path c0 { move (347, 192); line (529, 284); stroke #3ad8ff width 1.8 cap round; opacity 0; };
  path p0 { move (347, 192); line (529, 284); stroke #f2f4f6 width 3 cap round; };
  group m0 {
    position (440, 221.64);
    opacity 0;
    rectangle plate { position (-74, -7); size (108, 14); cornerRadius 3; fill #15181c; opacity 0.9; };
    text eq { position (0, 0.5); content "1.00 × 0.62 ="; fontSize 9; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align right; };
  };
  text r0 { position (442, 222.14); content "+0.62"; fontSize 9; fontWeight 500; baseline middle; fill #3ad8ff; fontFamily "monospace"; align left; opacity 0; };
  path c1 { move (347, 240); line (529, 284); stroke #ff8a3d width 1.8 cap round; opacity 0; };
  path p1 { move (347, 240); line (529, 284); stroke #f2f4f6 width 3 cap round; };
  group m1 {
    position (440, 249.48);
    opacity 0;
    rectangle plate { position (-74, -7); size (108, 14); cornerRadius 3; fill #15181c; opacity 0.9; };
    text eq { position (0, 0.5); content "1.00 × −0.41 ="; fontSize 9; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align right; };
  };
  text r1 { position (442, 249.98); content "−0.41"; fontSize 9; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align left; opacity 0; };
  path c2 { move (347, 408); line (529, 284); stroke #3ad8ff width 1.8 cap round; opacity 0; };
  path p2 { move (347, 408); line (529, 284); stroke #f2f4f6 width 3 cap round; };
  group m2 {
    position (440, 346.92);
    opacity 0;
    rectangle plate { position (-74, -7); size (108, 14); cornerRadius 3; fill #15181c; opacity 0.9; };
    text eq { position (0, 0.5); content "0.61 × 0.35 ="; fontSize 9; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align right; };
  };
  text r2 { position (442, 347.42); content "+0.21"; fontSize 9; fontWeight 500; baseline middle; fill #3ad8ff; fontFamily "monospace"; align left; opacity 0; };
  group more {
    position (432, 306);
    opacity 0;
    rectangle plate { position (-34, -7); size (68, 26); cornerRadius 3; fill #15181c; opacity 0.9; };
    text dots { position (0, 0); content "⋯ 781 more"; fontFamily "sans"; fontSize 9; fontWeight 500; align center; baseline middle; fill #8b949e; };
  };
  text moreSum { position (432, 318); content "+0.41"; fontSize 9; fontWeight 500; baseline middle; fill #3ad8ff; fontFamily "monospace"; align center; opacity 0; };
  text sigma { position (540, 284.5); content "Σ"; fontFamily "sans"; fontSize 14; fontWeight 700; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text bias { position (585, 330); content "b = −0.18"; fontSize 9; fontWeight 500; baseline middle; fill #ff8a3d; fontFamily "monospace"; align center; opacity 0; };
  text zval { position (558, 284.5); content "z = 0.65"; fontSize 10; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align left; opacity 0; };
  group arrow {
    opacity 0;
    line shaft { from (614, 284); to (642, 284); stroke #f2f4f6 width 1.2; };
    polygon tip { points ((646, 284), (639, 280.5), (639, 287.5)); fill #f2f4f6; };
  };
  text f1 { position (684, 194); content "z = Σᵢ wᵢ xᵢ + b"; fontFamily "sans"; fontSize 12; fontWeight 600; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text f2 { position (684, 212); content "a = max(0, z)"; fontFamily "sans"; fontSize 12; fontWeight 600; align center; baseline middle; fill #f2f4f6; opacity 0; };
  group graph {
    position (650, 230);
    opacity 0;
    rectangle box { position (0, 0); size (150, 110); cornerRadius 6; fill #1d2227; stroke #343a41 width 0.8; };
    text name { position (8, 12); content "ReLU"; fontFamily "sans"; fontSize 9; fontWeight 600; baseline middle; fill #8b949e; align left; };
    path axes { move (8, 80); line (142, 80); move (55, 104); line (55, 14); stroke #5b636d width 0.8; };
    text zaxis { position (140, 90); content "z"; fontFamily "sans"; fontSize 8; fontWeight 500; align center; baseline middle; fill #8b949e; };
    path relu { move (10, 80); line (55, 80); line (125, 10); stroke #3ad8ff width 1.8 join round; };
    circle dot { position (55, 80); radius 3.6; fill #f2f4f6; opacity 0; };
    text aval { position (14, 30); content "a = 0.65"; fontSize 9; fontWeight 500; baseline middle; fill #3ad8ff; fontFamily "monospace"; align left; opacity 0; };
  };
  circle boom { position (540, 284); radius 11; stroke #3ad8ff width 1.4; opacity 0; };
};
group chips {
  zIndex 11;
  group v2 {
    position (116.5, 278.5);
    opacity 0;
    rectangle plate { position (-13, -6.5); size (26, 13); cornerRadius 3; fill #0f2a33; stroke #3ad8ff width 0.6; };
    text val { position (0, 0.5); content "1.00"; fontSize 8; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
  };
  group v9 {
    position (116.5, 369.5);
    opacity 0;
    rectangle plate { position (-13, -6.5); size (26, 13); cornerRadius 3; fill #0f2a33; stroke #3ad8ff width 0.6; };
    text val { position (0, 0.5); content "0.61"; fontSize 8; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
  };
  group v5 {
    position (67.5, 320.5);
    opacity 0;
    rectangle plate { position (-13, -6.5); size (26, 13); cornerRadius 3; fill #0f2a33; stroke #3ad8ff width 0.6; };
    text val { position (0, 0.5); content "0.00"; fontSize 8; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
  };
  group v1 {
    position (88.5, 278.5);
    opacity 0;
    rectangle plate { position (-13, -6.5); size (26, 13); cornerRadius 3; fill #0f2a33; stroke #3ad8ff width 0.6; };
    text val { position (0, 0.5); content "1.00"; fontSize 8; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
  };
  group v6 {
    position (144.5, 327.5);
    opacity 0;
    rectangle plate { position (-13, -6.5); size (26, 13); cornerRadius 3; fill #0f2a33; stroke #3ad8ff width 0.6; };
    text val { position (0, 0.5); content "1.00"; fontSize 8; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
  };
  group v11 {
    position (109.5, 390.5);
    opacity 0;
    rectangle plate { position (-13, -6.5); size (26, 13); cornerRadius 3; fill #0f2a33; stroke #3ad8ff width 0.6; };
    text val { position (0, 0.5); content "0.88"; fontSize 8; fontWeight 500; baseline middle; fill #f2f4f6; fontFamily "monospace"; align center; };
  };
};
path trail { move (116.5, 278.5); line (340, 192); line (540, 284); line (740, 364); line (920, 414); line (1178.01, 414); stroke #3ad8ff width 2.4 cap round join round; opacity 0; zIndex 9; };
group hl {
  position (116.5, 278.5);
  opacity 0;
  zIndex 12;
  circle halo { radius 11; fill #3ad8ff; opacity 0.3; };
  circle core { radius 4.5; fill #f2f4f6; };
};
group stages {
  zIndex 10;
  text s0 { position (120, 548); content "Pixels"; fontFamily "sans"; fontSize 12; fontWeight 650; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text s1 { position (640, 548); content "Weighted sums + activations"; fontFamily "sans"; fontSize 12; fontWeight 650; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text s2 { position (945, 548); content "Scores"; fontFamily "sans"; fontSize 12; fontWeight 650; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text s3 { position (1115, 548); content "Probabilities"; fontFamily "sans"; fontSize 12; fontWeight 650; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text a0 { position (380, 548); content "→"; fontFamily "sans"; fontSize 18; fontWeight 600; align center; baseline middle; fill #8b949e; opacity 0; };
  text a1 { position (792.5, 548); content "→"; fontFamily "sans"; fontSize 18; fontWeight 600; align center; baseline middle; fill #8b949e; opacity 0; };
  text a2 { position (1030, 548); content "→"; fontFamily "sans"; fontSize 18; fontWeight 600; align center; baseline middle; fill #8b949e; opacity 0; };
};
group pred {
  position (1290, 414);
  opacity 0;
  zIndex 10;
  rectangle badge { position (-62, -15); size (124, 30); cornerRadius 6; fill #0f2a33; stroke #3ad8ff width 1.5; };
  text words { position (0, 0.5); content "Prediction: 7"; fontFamily "sans"; fontSize 15; fontWeight 700; align center; baseline middle; fill #f2f4f6; };
  rectangle ping { position (-62, -15); size (124, 30); cornerRadius 6; stroke #3ad8ff width 2; opacity 0; };
};
group header {
  space screen;
  zIndex 60;
  text title { position (24, 28); content "From Pixels to Prediction"; fontFamily "sans"; fontSize 15; fontWeight 650; baseline middle; fill #8b949e; align left; };
};
group captions {
  space screen;
  zIndex 60;
  rectangle plate { position (240, 656); size (800, 46); cornerRadius 8; fill #0b0d10; opacity 0; };
  text cap1 { position (640, 679); content "Learned combinations of pixel patterns"; fontFamily "sans"; fontSize 19; fontWeight 600; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text cap2 { position (640, 679); content "Combine evidence across layers"; fontFamily "sans"; fontSize 19; fontWeight 600; align center; baseline middle; fill #f2f4f6; opacity 0; };
  text cap3 { position (640, 679); content "Weights were learned during training; this is inference."; fontFamily "sans"; fontSize 16; fontWeight 500; align center; baseline middle; fill #f2f4f6; opacity 0; };
};
operators guides.g2 { trim 0, 0, 0; };
operators guides.g9 { trim 0, 0, 0; };
operators guides.g5 { trim 0, 0, 0; };
operators guides.g1 { trim 0, 0, 0; };
operators guides.g6 { trim 0, 0, 0; };
operators guides.g11 { trim 0, 0, 0; };
operators calc.p0 { trim 0, 0, 0; };
operators calc.p1 { trim 0, 0, 0; };
operators calc.p2 { trim 0, 0, 0; };
operators trail { trim 0, 0, 0; };
keyframes img.scan.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  0.5% 0 ease easeOut;
  0.8333% 1 ease hold;
  3.8333% 1 ease easeOut;
  4.3333% 0 ease hold;
  100% 0;
};
keyframes img.scan.position.y {
  start 0s;
  duration 30s;
  0% 226 ease hold;
  0.6667% 226 ease linear;
  4% 422 ease hold;
  100% 422;
};
keyframes img.gridV.scale {
  start 0s;
  duration 30s;
  0% (1, 0) ease hold;
  0.6667% (1, 0) ease linear;
  4% (1, 1) ease hold;
  100% (1, 1);
};
keyframes img.gridH.r0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  0.6367% 0 ease easeOut;
  1.17% 1 ease hold;
  100% 1;
};
keyframes img.gridH.r1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.1133% 0 ease easeOut;
  1.6467% 1 ease hold;
  100% 1;
};
keyframes img.cells.b1l0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.2133% 0 ease easeOut;
  1.88% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b1l1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.2133% 0 ease easeOut;
  1.88% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b1l2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.2133% 0 ease easeOut;
  1.88% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b1l3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.2133% 0 ease easeOut;
  1.88% 0.94 ease hold;
  100% 0.94;
};
keyframes img.gridH.r2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.59% 0 ease easeOut;
  2.1233% 1 ease hold;
  100% 1;
};
keyframes img.cells.b2l0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.69% 0 ease easeOut;
  2.3567% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b2l1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.69% 0 ease easeOut;
  2.3567% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b2l2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.69% 0 ease easeOut;
  2.3567% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b2l3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  1.69% 0 ease easeOut;
  2.3567% 0.94 ease hold;
  100% 0.94;
};
keyframes img.gridH.r3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.0667% 0 ease easeOut;
  2.6% 1 ease hold;
  100% 1;
};
keyframes img.cells.b3l0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.1667% 0 ease easeOut;
  2.8333% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b3l1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.1667% 0 ease easeOut;
  2.8333% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b3l2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.1667% 0 ease easeOut;
  2.8333% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b3l3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.1667% 0 ease easeOut;
  2.8333% 0.94 ease hold;
  100% 0.94;
};
keyframes img.gridH.r4.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.5433% 0 ease easeOut;
  3.0767% 1 ease hold;
  100% 1;
};
keyframes img.cells.b4l0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.6433% 0 ease easeOut;
  3.31% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b4l1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.6433% 0 ease easeOut;
  3.31% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b4l2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.6433% 0 ease easeOut;
  3.31% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b4l3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  2.6433% 0 ease easeOut;
  3.31% 0.94 ease hold;
  100% 0.94;
};
keyframes img.gridH.r5.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.02% 0 ease easeOut;
  3.5533% 1 ease hold;
  100% 1;
};
keyframes img.cells.b5l0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.12% 0 ease easeOut;
  3.7867% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b5l1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.12% 0 ease easeOut;
  3.7867% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b5l2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.12% 0 ease easeOut;
  3.7867% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b5l3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.12% 0 ease easeOut;
  3.7867% 0.94 ease hold;
  100% 0.94;
};
keyframes img.gridH.r6.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.4967% 0 ease easeOut;
  4.03% 1 ease hold;
  100% 1;
};
keyframes img.cells.b6l0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.5967% 0 ease easeOut;
  4.2633% 0.94 ease hold;
  100% 0.94;
};
keyframes img.cells.b6l3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.5967% 0 ease easeOut;
  4.2633% 0.94 ease hold;
  100% 0.94;
};
keyframes img.ink.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  1% 1 ease easeInOut;
  4% 0.3 ease hold;
  100% 0.3;
};
keyframes img.label.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3% 0 ease easeOut;
  4% 1 ease hold;
  100% 1;
};
keyframes img.pk0.mark.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.3333% 0 ease easeOut;
  3.6667% 1 ease hold;
  26.6667% 1 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes img.pk0.zoom.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.3333% 0 ease easeOut;
  3.5333% 1 ease hold;
  5.3333% 1 ease easeOut;
  5.5333% 0 ease hold;
  100% 0;
};
keyframes img.pk0.zoom.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  3.3333% (1, 1) ease easeOut;
  3.9333% (5.5, 5.5) ease hold;
  4.9333% (5.5, 5.5) ease easeIn;
  5.5333% (1, 1) ease hold;
  100% (1, 1);
};
keyframes img.pk0.tag.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  3.6667% 0 ease easeOut;
  4% 1 ease hold;
  5% 1 ease easeOut;
  5.4% 0 ease hold;
  100% 0;
};
keyframes img.pk1.mark.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  5.5667% 0 ease easeOut;
  5.9% 1 ease hold;
  26.6667% 1 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes img.pk1.zoom.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  5.5667% 0 ease easeOut;
  5.7667% 1 ease hold;
  7.5667% 1 ease easeOut;
  7.7667% 0 ease hold;
  100% 0;
};
keyframes img.pk1.zoom.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  5.5667% (1, 1) ease easeOut;
  6.1667% (5.5, 5.5) ease hold;
  7.1667% (5.5, 5.5) ease easeIn;
  7.7667% (1, 1) ease hold;
  100% (1, 1);
};
keyframes img.pk1.tag.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  5.9% 0 ease easeOut;
  6.2333% 1 ease hold;
  7.2333% 1 ease easeOut;
  7.6333% 0 ease hold;
  100% 0;
};
keyframes img.pk2.mark.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  7.7667% 0 ease easeOut;
  8.1% 1 ease hold;
  26.6667% 1 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes img.pk2.zoom.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  7.7667% 0 ease easeOut;
  7.9667% 1 ease hold;
  9.7667% 1 ease easeOut;
  9.9667% 0 ease hold;
  100% 0;
};
keyframes img.pk2.zoom.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  7.7667% (1, 1) ease easeOut;
  8.3667% (5.5, 5.5) ease hold;
  9.3667% (5.5, 5.5) ease easeIn;
  9.9667% (1, 1) ease hold;
  100% (1, 1);
};
keyframes img.pk2.tag.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  8.1% 0 ease easeOut;
  8.4333% 1 ease hold;
  9.4333% 1 ease easeOut;
  9.8333% 0 ease hold;
  100% 0;
};
keyframes wires.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  11.3333% 0 ease easeInOut;
  14.6667% 1 ease hold;
  100% 1;
};
keyframes inp.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  11.6667% 0 ease easeInOut;
  15% 1 ease hold;
  100% 1;
};
keyframes h1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  12.3333% 0 ease easeInOut;
  16% 1 ease hold;
  100% 1;
};
keyframes h2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  13% 0 ease easeInOut;
  16% 1 ease hold;
  100% 1;
};
keyframes out.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  13.6667% 0 ease easeInOut;
  16% 1 ease hold;
  100% 1;
};
keyframes guides.g2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  14.3333% 0 ease easeOut;
  14.5% 0.85 ease hold;
  26.6667% 0.85 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes guides.g2.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  14.3333% 0 ease easeInOut;
  16% 1 ease hold;
  100% 1;
};
keyframes guides.g9.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  14.6667% 0 ease easeOut;
  14.8333% 0.85 ease hold;
  26.6667% 0.85 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes guides.g9.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  14.6667% 0 ease easeInOut;
  16.3333% 1 ease hold;
  100% 1;
};
keyframes guides.g5.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  15% 0 ease easeOut;
  15.1667% 0.85 ease hold;
  26.6667% 0.85 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes guides.g5.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  15% 0 ease easeInOut;
  16.6667% 1 ease hold;
  100% 1;
};
keyframes guides.g1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.1667% 0 ease easeOut;
  18.3333% 0.85 ease hold;
  26.6667% 0.85 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes guides.g1.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.1667% 0 ease easeInOut;
  19.8333% 1 ease hold;
  100% 1;
};
keyframes guides.g6.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  19% 0 ease easeOut;
  19.1667% 0.85 ease hold;
  26.6667% 0.85 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes guides.g6.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  19% 0 ease easeInOut;
  20.6667% 1 ease hold;
  100% 1;
};
keyframes guides.g11.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  19.8333% 0 ease easeOut;
  20% 0.85 ease hold;
  26.6667% 0.85 ease easeOut;
  28.6667% 0 ease hold;
  100% 0;
};
keyframes guides.g11.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  19.8333% 0 ease easeInOut;
  21.5% 1 ease hold;
  100% 1;
};
keyframes inp.n0.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  17.1667% 0 ease easeOut;
  18% 0 ease hold;
  56.6667% 0 ease easeInOut;
  59.3333% 0 ease hold;
  100% 0;
};
keyframes inp.n0.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  17.1667% 0 ease easeOut;
  17.3667% 0.9 ease easeIn;
  18.1667% 0 ease hold;
  100% 0;
};
keyframes inp.n1.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  21.1667% 0 ease easeOut;
  22% 1 ease hold;
  56.6667% 1 ease easeInOut;
  59.3333% 0.45 ease hold;
  100% 0.45;
};
keyframes inp.n1.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  21.1667% 0 ease easeOut;
  21.3667% 0.9 ease easeIn;
  22.1667% 0 ease hold;
  100% 0;
};
keyframes inp.n2.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.6667% 0 ease easeOut;
  19.5% 1 ease hold;
  56.6667% 1 ease easeInOut;
  59.3333% 0.45 ease hold;
  100% 0.45;
};
keyframes inp.n2.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.6667% 0 ease easeOut;
  18.8667% 0.9 ease easeIn;
  19.6667% 0 ease hold;
  32.6667% 0 ease easeOut;
  32.8667% 0.9 ease easeIn;
  33.6667% 0 ease hold;
  100% 0;
};
keyframes inp.n3.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.4667% 0 ease easeOut;
  19.3% 0.49 ease hold;
  56.6667% 0.49 ease easeInOut;
  59.3333% 0.2205 ease hold;
  100% 0.2205;
};
keyframes inp.n3.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.4667% 0 ease easeOut;
  18.6667% 0.9 ease easeIn;
  19.4667% 0 ease hold;
  100% 0;
};
keyframes inp.n4.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.9% 0 ease easeOut;
  19.7333% 1 ease hold;
  56.6667% 1 ease easeInOut;
  59.3333% 0.45 ease hold;
  100% 0.45;
};
keyframes inp.n4.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.9% 0 ease easeOut;
  19.1% 0.9 ease easeIn;
  19.9% 0 ease hold;
  34% 0 ease easeOut;
  34.2% 0.9 ease easeIn;
  35% 0 ease hold;
  100% 0;
};
keyframes inp.n5.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.3333% 0 ease easeOut;
  21.1667% 0 ease hold;
  56.6667% 0 ease easeInOut;
  59.3333% 0 ease hold;
  100% 0;
};
keyframes inp.n5.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.3333% 0 ease easeOut;
  20.5333% 0.9 ease easeIn;
  21.3333% 0 ease hold;
  100% 0;
};
keyframes inp.n6.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22% 0 ease easeOut;
  22.8333% 1 ease hold;
  56.6667% 1 ease easeInOut;
  59.3333% 0.45 ease hold;
  100% 0.45;
};
keyframes inp.n6.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22% 0 ease easeOut;
  22.2% 0.9 ease easeIn;
  23% 0 ease hold;
  100% 0;
};
keyframes inp.n7.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.2% 0 ease easeOut;
  21.0333% 1 ease hold;
  56.6667% 1 ease easeInOut;
  59.3333% 0.45 ease hold;
  100% 0.45;
};
keyframes inp.n7.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.2% 0 ease easeOut;
  20.4% 0.9 ease easeIn;
  21.2% 0 ease hold;
  100% 0;
};
keyframes inp.n8.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.6333% 0 ease easeOut;
  21.4667% 1 ease hold;
  56.6667% 1 ease easeInOut;
  59.3333% 0.45 ease hold;
  100% 0.45;
};
keyframes inp.n8.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.6333% 0 ease easeOut;
  20.8333% 0.9 ease easeIn;
  21.6333% 0 ease hold;
  100% 0;
};
keyframes inp.n9.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  19.5% 0 ease easeOut;
  20.3333% 0.61 ease hold;
  56.6667% 0.61 ease easeInOut;
  59.3333% 0.2745 ease hold;
  100% 0.2745;
};
keyframes inp.n9.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  19.5% 0 ease easeOut;
  19.7% 0.9 ease easeIn;
  20.5% 0 ease hold;
  35.3333% 0 ease easeOut;
  35.5333% 0.9 ease easeIn;
  36.3333% 0 ease hold;
  100% 0;
};
keyframes inp.n10.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  21.5% 0 ease easeOut;
  22.3333% 0 ease hold;
  56.6667% 0 ease easeInOut;
  59.3333% 0 ease hold;
  100% 0;
};
keyframes inp.n10.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  21.5% 0 ease easeOut;
  21.7% 0.9 ease easeIn;
  22.5% 0 ease hold;
  100% 0;
};
keyframes inp.n11.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22.8333% 0 ease easeOut;
  23.6667% 0.88 ease hold;
  56.6667% 0.88 ease easeInOut;
  59.3333% 0.396 ease hold;
  100% 0.396;
};
keyframes inp.n11.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22.8333% 0 ease easeOut;
  23.0333% 0.9 ease easeIn;
  23.8333% 0 ease hold;
  100% 0;
};
keyframes inp.n12.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22.3667% 0 ease easeOut;
  23.2% 0.21 ease hold;
  56.6667% 0.21 ease easeInOut;
  59.3333% 0.0945 ease hold;
  100% 0.0945;
};
keyframes inp.n12.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22.3667% 0 ease easeOut;
  22.5667% 0.9 ease easeIn;
  23.3667% 0 ease hold;
  100% 0;
};
keyframes inp.n13.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22.8% 0 ease easeOut;
  23.6333% 0 ease hold;
  56.6667% 0 ease easeInOut;
  59.3333% 0 ease hold;
  100% 0;
};
keyframes inp.n13.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  22.8% 0 ease easeOut;
  23% 0.9 ease easeIn;
  23.8% 0 ease hold;
  100% 0;
};
keyframes chips.v2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  16.6667% 0 ease easeOut;
  16.9333% 1 ease hold;
  18.5% 1 ease easeOut;
  18.8333% 0 ease hold;
  100% 0;
};
keyframes chips.v2.position.x {
  start 0s;
  duration 30s;
  0% 116.5 ease hold;
  16.6667% 116.5 ease easeInOut;
  18.6667% 323 ease hold;
  100% 323;
};
keyframes chips.v2.position.y {
  start 0s;
  duration 30s;
  0% 278.5 ease hold;
  16.6667% 278.5 ease easeInOut;
  18.6667% 192 ease hold;
  100% 192;
};
keyframes chips.v9.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  17.5% 0 ease easeOut;
  17.7667% 1 ease hold;
  19.3333% 1 ease easeOut;
  19.6667% 0 ease hold;
  100% 0;
};
keyframes chips.v9.position.x {
  start 0s;
  duration 30s;
  0% 116.5 ease hold;
  17.5% 116.5 ease easeInOut;
  19.5% 323 ease hold;
  100% 323;
};
keyframes chips.v9.position.y {
  start 0s;
  duration 30s;
  0% 369.5 ease hold;
  17.5% 369.5 ease easeInOut;
  19.5% 408 ease hold;
  100% 408;
};
keyframes chips.v5.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  18.3333% 0 ease easeOut;
  18.6% 1 ease hold;
  20.1667% 1 ease easeOut;
  20.5% 0 ease hold;
  100% 0;
};
keyframes chips.v5.position.x {
  start 0s;
  duration 30s;
  0% 67.5 ease hold;
  18.3333% 67.5 ease easeInOut;
  20.3333% 323 ease hold;
  100% 323;
};
keyframes chips.v5.position.y {
  start 0s;
  duration 30s;
  0% 320.5 ease hold;
  18.3333% 320.5 ease easeInOut;
  20.3333% 264 ease hold;
  100% 264;
};
keyframes chips.v1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  19.1667% 0 ease easeOut;
  19.4333% 1 ease hold;
  21% 1 ease easeOut;
  21.3333% 0 ease hold;
  100% 0;
};
keyframes chips.v1.position.x {
  start 0s;
  duration 30s;
  0% 88.5 ease hold;
  19.1667% 88.5 ease easeInOut;
  21.1667% 323 ease hold;
  100% 323;
};
keyframes chips.v1.position.y {
  start 0s;
  duration 30s;
  0% 278.5 ease hold;
  19.1667% 278.5 ease easeInOut;
  21.1667% 168 ease hold;
  100% 168;
};
keyframes chips.v6.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20% 0 ease easeOut;
  20.2667% 1 ease hold;
  21.8333% 1 ease easeOut;
  22.1667% 0 ease hold;
  100% 0;
};
keyframes chips.v6.position.x {
  start 0s;
  duration 30s;
  0% 144.5 ease hold;
  20% 144.5 ease easeInOut;
  22% 323 ease hold;
  100% 323;
};
keyframes chips.v6.position.y {
  start 0s;
  duration 30s;
  0% 327.5 ease hold;
  20% 327.5 ease easeInOut;
  22% 288 ease hold;
  100% 288;
};
keyframes chips.v11.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20.8333% 0 ease easeOut;
  21.1% 1 ease hold;
  22.6667% 1 ease easeOut;
  23% 0 ease hold;
  100% 0;
};
keyframes chips.v11.position.x {
  start 0s;
  duration 30s;
  0% 109.5 ease hold;
  20.8333% 109.5 ease easeInOut;
  22.8333% 323 ease hold;
  100% 323;
};
keyframes chips.v11.position.y {
  start 0s;
  duration 30s;
  0% 390.5 ease hold;
  20.8333% 390.5 ease easeInOut;
  22.8333% 456 ease hold;
  100% 456;
};
keyframes inp.brace.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  20% 0 ease easeOut;
  21.3333% 1 ease hold;
  28% 1 ease easeOut;
  29.6667% 0 ease hold;
  100% 0;
};
keyframes wires.fan.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  28% 0 ease easeOut;
  29.6667% 0.9 ease hold;
  31% 0.9 ease easeOut;
  32.6667% 0.12 ease hold;
  49.3333% 0.12 ease easeOut;
  51% 0 ease hold;
  100% 0;
};
keyframes h1.n3.sel.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  28.3333% 0 ease easeOut;
  29.6667% 1 ease hold;
  50.6667% 1 ease easeOut;
  52% 0 ease hold;
  100% 0;
};
keyframes wires.a.opacity {
  start 0s;
  duration 30s;
  0% 0.8 ease hold;
  30.6667% 0.8 ease easeOut;
  32.3333% 0.3 ease hold;
  49.3333% 0.3 ease easeOut;
  52% 0.8 ease hold;
  100% 0.8;
};
keyframes wires.b.opacity {
  start 0s;
  duration 30s;
  0% 0.8 ease hold;
  30.6667% 0.8 ease easeOut;
  32.3333% 0.3 ease hold;
  49.3333% 0.3 ease easeOut;
  52% 0.8 ease hold;
  100% 0.8;
};
keyframes calc.panel.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  31% 0 ease easeOut;
  32.6667% 0.96 ease hold;
  49.6667% 0.96 ease easeOut;
  51.3333% 0 ease hold;
  100% 0;
};
keyframes calc.c0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  31% 0 ease easeOut;
  32.6667% 1 ease hold;
  49.6667% 1 ease easeOut;
  51.3333% 0 ease hold;
  100% 0;
};
keyframes calc.p0.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  32.6667% 0 ease linear;
  34.1667% 1 ease hold;
  100% 1;
};
keyframes calc.p0.trim.start {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  33.0667% 0 ease linear;
  34.5667% 1 ease hold;
  100% 1;
};
keyframes calc.m0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  32.6667% 0 ease easeOut;
  33.3333% 1 ease hold;
  40.6667% 1 ease easeOut;
  42% 0 ease hold;
  100% 0;
};
keyframes calc.r0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  33.6667% 0 ease easeOut;
  34.1667% 1 ease hold;
  38.6667% 1 ease easeOut;
  39.3333% 0 ease hold;
  100% 0;
};
keyframes calc.r0.position.x {
  start 0s;
  duration 30s;
  0% 442 ease hold;
  36.6667% 442 ease easeIn;
  39.3333% 532 ease hold;
  100% 532;
};
keyframes calc.r0.position.y {
  start 0s;
  duration 30s;
  0% 222.14 ease hold;
  36.6667% 222.14 ease easeIn;
  39.3333% 284 ease hold;
  100% 284;
};
keyframes calc.c1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  31% 0 ease easeOut;
  32.6667% 1 ease hold;
  49.6667% 1 ease easeOut;
  51.3333% 0 ease hold;
  100% 0;
};
keyframes calc.p1.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  34% 0 ease linear;
  35.5% 1 ease hold;
  100% 1;
};
keyframes calc.p1.trim.start {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  34.4% 0 ease linear;
  35.9% 1 ease hold;
  100% 1;
};
keyframes calc.m1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  34% 0 ease easeOut;
  34.6667% 1 ease hold;
  40.6667% 1 ease easeOut;
  42% 0 ease hold;
  100% 0;
};
keyframes calc.r1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  35% 0 ease easeOut;
  35.5% 1 ease hold;
  38.6667% 1 ease easeOut;
  39.3333% 0 ease hold;
  100% 0;
};
keyframes calc.r1.position.x {
  start 0s;
  duration 30s;
  0% 442 ease hold;
  36.8333% 442 ease easeIn;
  39.3333% 532 ease hold;
  100% 532;
};
keyframes calc.r1.position.y {
  start 0s;
  duration 30s;
  0% 249.98 ease hold;
  36.8333% 249.98 ease easeIn;
  39.3333% 284 ease hold;
  100% 284;
};
keyframes calc.c2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  31% 0 ease easeOut;
  32.6667% 1 ease hold;
  49.6667% 1 ease easeOut;
  51.3333% 0 ease hold;
  100% 0;
};
keyframes calc.p2.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  35.3333% 0 ease linear;
  36.8333% 1 ease hold;
  100% 1;
};
keyframes calc.p2.trim.start {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  35.7333% 0 ease linear;
  37.2333% 1 ease hold;
  100% 1;
};
keyframes calc.m2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  35.3333% 0 ease easeOut;
  36% 1 ease hold;
  40.6667% 1 ease easeOut;
  42% 0 ease hold;
  100% 0;
};
keyframes calc.r2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  36.3333% 0 ease easeOut;
  36.8333% 1 ease hold;
  38.6667% 1 ease easeOut;
  39.3333% 0 ease hold;
  100% 0;
};
keyframes calc.r2.position.x {
  start 0s;
  duration 30s;
  0% 442 ease hold;
  37% 442 ease easeIn;
  39.3333% 532 ease hold;
  100% 532;
};
keyframes calc.r2.position.y {
  start 0s;
  duration 30s;
  0% 347.42 ease hold;
  37% 347.42 ease easeIn;
  39.3333% 284 ease hold;
  100% 284;
};
keyframes calc.more.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  33.3333% 0 ease easeOut;
  34.3333% 1 ease hold;
  49.6667% 1 ease easeOut;
  51% 0 ease hold;
  100% 0;
};
keyframes calc.moreSum.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  36.3333% 0 ease easeOut;
  37% 1 ease hold;
  38.6667% 1 ease easeOut;
  39.3333% 0 ease hold;
  100% 0;
};
keyframes calc.moreSum.position.x {
  start 0s;
  duration 30s;
  0% 432 ease hold;
  37.1667% 432 ease easeIn;
  39.3333% 532 ease hold;
  100% 532;
};
keyframes calc.moreSum.position.y {
  start 0s;
  duration 30s;
  0% 318 ease hold;
  37.1667% 318 ease easeIn;
  39.3333% 284 ease hold;
  100% 284;
};
keyframes calc.sigma.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  36% 0 ease easeOut;
  36.6667% 1 ease hold;
  46.3333% 1 ease easeOut;
  47.3333% 0 ease hold;
  100% 0;
};
keyframes calc.bias.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  38.6667% 0 ease easeOut;
  39.3333% 1 ease hold;
  40.8333% 1 ease easeOut;
  41.3333% 0 ease hold;
  100% 0;
};
keyframes calc.bias.position.x {
  start 0s;
  duration 30s;
  0% 585 ease hold;
  39.3333% 585 ease easeIn;
  41.3333% 544 ease hold;
  100% 544;
};
keyframes calc.bias.position.y {
  start 0s;
  duration 30s;
  0% 330 ease hold;
  39.3333% 330 ease easeIn;
  41.3333% 288 ease hold;
  100% 288;
};
keyframes calc.f1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  37.3333% 0 ease easeOut;
  38.6667% 1 ease hold;
  49.6667% 1 ease easeOut;
  51% 0 ease hold;
  100% 0;
};
keyframes calc.zval.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  41.6667% 0 ease easeOut;
  42.6667% 1 ease hold;
  49.6667% 1 ease easeOut;
  51% 0 ease hold;
  100% 0;
};
keyframes calc.arrow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  43% 0 ease easeOut;
  43.6667% 1 ease hold;
  49.6667% 1 ease easeOut;
  51% 0 ease hold;
  100% 0;
};
keyframes calc.graph.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  43% 0 ease easeOut;
  44% 1 ease hold;
  49.6667% 1 ease easeOut;
  51% 0 ease hold;
  100% 0;
};
keyframes calc.f2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  43.6667% 0 ease easeOut;
  45% 1 ease hold;
  49.6667% 1 ease easeOut;
  51% 0 ease hold;
  100% 0;
};
keyframes calc.graph.dot.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  44% 0 ease easeOut;
  44.3333% 1 ease hold;
  100% 1;
};
keyframes calc.graph.dot.position.x {
  start 0s;
  duration 30s;
  0% 55 ease hold;
  44.3333% 55 ease easeInOut;
  46.1667% 84.2492 ease hold;
  100% 84.2492;
};
keyframes calc.graph.dot.position.y {
  start 0s;
  duration 30s;
  0% 80 ease hold;
  44.3333% 80 ease easeInOut;
  46.1667% 50.7508 ease hold;
  100% 50.7508;
};
keyframes calc.graph.aval.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  46% 0 ease easeOut;
  46.6667% 1 ease hold;
  100% 1;
};
keyframes calc.boom.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  46.6667% 0 ease easeOut;
  46.8333% 0.9 ease hold;
  46.83333% 0.9 ease easeOut;
  49.3333% 0 ease hold;
  100% 0;
};
keyframes calc.boom.scale {
  start 0s;
  duration 30s;
  0% (1, 1) ease hold;
  46.6667% (1, 1) ease easeOut;
  49.3333% (3.2, 3.2) ease hold;
  100% (3.2, 3.2);
};
keyframes h1.n0.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  51.3333% 0 ease easeOut;
  53% 0.1 ease hold;
  56.6667% 0.1 ease easeInOut;
  59.3333% 0.045 ease hold;
  100% 0.045;
};
keyframes h1.n0.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  51.3333% 0 ease easeOut;
  51.5333% 0.7 ease easeIn;
  52.5% 0 ease hold;
  100% 0;
};
keyframes h1.n1.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  51.9333% 0 ease easeOut;
  53.6% 0 ease hold;
  56.6667% 0 ease easeInOut;
  59.3333% 0 ease hold;
  100% 0;
};
keyframes h1.n1.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  51.9333% 0 ease easeOut;
  52.1333% 0.7 ease easeIn;
  53.1% 0 ease hold;
  100% 0;
};
keyframes h1.n2.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  52.5333% 0 ease easeOut;
  54.2% 0.58 ease hold;
  56.6667% 0.58 ease easeInOut;
  59.3333% 0.261 ease hold;
  100% 0.261;
};
keyframes h1.n2.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  52.5333% 0 ease easeOut;
  52.7333% 0.7 ease easeIn;
  53.7% 0 ease hold;
  100% 0;
};
keyframes h1.n3.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  46.3333% 0 ease easeOut;
  48% 0.65 ease hold;
  56.6667% 0.65 ease easeInOut;
  59.3333% 0.2925 ease hold;
  100% 0.2925;
};
keyframes h1.n4.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  53.7333% 0 ease easeOut;
  55.4% 0.34 ease hold;
  56.6667% 0.34 ease easeInOut;
  59.3333% 0.153 ease hold;
  100% 0.153;
};
keyframes h1.n4.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  53.7333% 0 ease easeOut;
  53.9333% 0.7 ease easeIn;
  54.9% 0 ease hold;
  100% 0;
};
keyframes h1.n5.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  54.3333% 0 ease easeOut;
  56% 0 ease hold;
  56.6667% 0 ease easeInOut;
  59.3333% 0 ease hold;
  100% 0;
};
keyframes h1.n5.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  54.3333% 0 ease easeOut;
  54.5333% 0.7 ease easeIn;
  55.5% 0 ease hold;
  100% 0;
};
keyframes h1.n6.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  54.9333% 0 ease easeOut;
  56.6% 0.78 ease hold;
  56.6667% 0.78 ease easeInOut;
  59.3333% 0.351 ease hold;
  100% 0.351;
};
keyframes h1.n6.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  54.9333% 0 ease easeOut;
  55.1333% 0.7 ease easeIn;
  56.1% 0 ease hold;
  100% 0;
};
keyframes h1.n7.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  55.5333% 0 ease easeOut;
  56.6667% 0.21 ease easeInOut;
  57.2% 0.21 ease hold;
  59.3333% 0.0945 ease hold;
  100% 0.0945;
};
keyframes h1.n7.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  55.5333% 0 ease easeOut;
  55.7333% 0.7 ease easeIn;
  56.7% 0 ease hold;
  100% 0;
};
keyframes h2.n0.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  58% 0 ease easeOut;
  59.6667% 0.05 ease hold;
  100% 0.05;
};
keyframes h2.n0.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  58% 0 ease easeOut;
  58.2% 0.7 ease easeIn;
  59.1667% 0 ease hold;
  100% 0;
};
keyframes h2.n1.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  58.5667% 0 ease easeOut;
  60.2333% 0.71 ease hold;
  100% 0.71;
};
keyframes h2.n1.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  58.5667% 0 ease easeOut;
  58.7667% 0.7 ease easeIn;
  59.7333% 0 ease hold;
  100% 0;
};
keyframes h2.n2.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  59.1333% 0 ease easeOut;
  60.8% 0.3 ease hold;
  100% 0.3;
};
keyframes h2.n2.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  59.1333% 0 ease easeOut;
  59.3333% 0.7 ease easeIn;
  60.3% 0 ease hold;
  100% 0;
};
keyframes h2.n3.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  59.7% 0 ease easeOut;
  61.3667% 0 ease hold;
  100% 0;
};
keyframes h2.n3.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  59.7% 0 ease easeOut;
  59.9% 0.7 ease easeIn;
  60.8667% 0 ease hold;
  100% 0;
};
keyframes h2.n4.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  60.2667% 0 ease easeOut;
  61.9333% 0.88 ease hold;
  100% 0.88;
};
keyframes h2.n4.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  60.2667% 0 ease easeOut;
  60.4667% 0.7 ease easeIn;
  61.4333% 0 ease hold;
  100% 0;
};
keyframes h2.n5.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  60.8333% 0 ease easeOut;
  62.5% 0.12 ease hold;
  100% 0.12;
};
keyframes h2.n5.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  60.8333% 0 ease easeOut;
  61.0333% 0.7 ease easeIn;
  62% 0 ease hold;
  100% 0;
};
keyframes h2.n6.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  61.4% 0 ease easeOut;
  63.0667% 0.47 ease hold;
  100% 0.47;
};
keyframes h2.n6.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  61.4% 0 ease easeOut;
  61.6% 0.7 ease easeIn;
  62.5667% 0 ease hold;
  100% 0;
};
keyframes h2.n7.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  61.9667% 0 ease easeOut;
  63.6333% 0 ease hold;
  100% 0;
};
keyframes h2.n7.tick.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  61.9667% 0 ease easeOut;
  62.1667% 0.7 ease easeIn;
  63.1333% 0 ease hold;
  100% 0;
};
keyframes wires.aPos.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  50.6667% 0 ease easeOut;
  51.6667% 0.75 ease hold;
  55.3333% 0.75 ease easeOut;
  57.3333% 0.18 ease hold;
  100% 0.18;
};
keyframes wires.aNeg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  50.6667% 0 ease easeOut;
  51.6667% 0.75 ease hold;
  55.3333% 0.75 ease easeOut;
  57.3333% 0.18 ease hold;
  100% 0.18;
};
keyframes wires.bPos.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  56.6667% 0 ease easeOut;
  57.6667% 0.8 ease hold;
  62% 0.8 ease easeOut;
  64% 0.2 ease hold;
  100% 0.2;
};
keyframes wires.bNeg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  56.6667% 0 ease easeOut;
  57.6667% 0.8 ease hold;
  62% 0.8 ease easeOut;
  64% 0.2 ease hold;
  100% 0.2;
};
keyframes h1.beat.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  54.6667% 0 ease easeOut;
  54.8667% 0.7 ease easeIn;
  56.6667% 0 ease hold;
  100% 0;
};
keyframes h2.beat.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  61.6667% 0 ease easeOut;
  61.8667% 0.7 ease easeIn;
  63.6667% 0 ease hold;
  100% 0;
};
keyframes wires.cPos.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  64.3333% 0 ease easeOut;
  66% 0.85 ease hold;
  73.3333% 0.85 ease easeOut;
  75.3333% 0.22 ease hold;
  100% 0.22;
};
keyframes wires.cNeg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  64.3333% 0 ease easeOut;
  66% 0.85 ease hold;
  73.3333% 0.85 ease easeOut;
  75.3333% 0.22 ease hold;
  100% 0.22;
};
keyframes out.scores.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67% 0 ease easeOut;
  68% 1 ease hold;
  73.3333% 1 ease easeOut;
  74.6667% 0 ease hold;
  100% 0;
};
keyframes out.d0.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67.3333% 0 ease easeOut;
  68.1667% 1 ease hold;
  73.3333% 1 ease easeOut;
  74.6667% 0 ease hold;
  100% 0;
};
keyframes out.d0.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  73.3333% 25 ease easeIn;
  74.6667% 62 ease hold;
  100% 62;
};
keyframes out.d0.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67.3333% 0 ease easeOut;
  68.3333% 0.48 ease hold;
  100% 0.48;
};
keyframes out.d0.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  74.6667% (0, 1) ease easeOut;
  77.3333% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d0.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d1.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67.8667% 0 ease easeOut;
  68.7% 1 ease hold;
  73.4333% 1 ease easeOut;
  74.7667% 0 ease hold;
  100% 0;
};
keyframes out.d1.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  73.4333% 25 ease easeIn;
  74.7667% 62 ease hold;
  100% 62;
};
keyframes out.d1.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  67.8667% 0 ease easeOut;
  68.8667% 0.006 ease hold;
  100% 0.006;
};
keyframes out.d1.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  74.8333% (0, 1) ease easeOut;
  77.5% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d1.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d2.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  68.4% 0 ease easeOut;
  69.2333% 1 ease hold;
  73.5333% 1 ease easeOut;
  74.8667% 0 ease hold;
  100% 0;
};
keyframes out.d2.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  73.5333% 25 ease easeIn;
  74.8667% 62 ease hold;
  100% 62;
};
keyframes out.d2.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  68.4% 0 ease easeOut;
  69.4% 0.69 ease hold;
  100% 0.69;
};
keyframes out.d2.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  75% (0, 1) ease easeOut;
  77.6667% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d2.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d3.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  68.9333% 0 ease easeOut;
  69.7667% 1 ease hold;
  73.6333% 1 ease easeOut;
  74.9667% 0 ease hold;
  100% 0;
};
keyframes out.d3.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  73.6333% 25 ease easeIn;
  74.9667% 62 ease hold;
  100% 62;
};
keyframes out.d3.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  68.9333% 0 ease easeOut;
  69.9333% 0.555 ease hold;
  100% 0.555;
};
keyframes out.d3.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  75.1667% (0, 1) ease easeOut;
  77.8333% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d3.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d4.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  69.4667% 0 ease easeOut;
  70.3% 1 ease hold;
  73.7333% 1 ease easeOut;
  75.0667% 0 ease hold;
  100% 0;
};
keyframes out.d4.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  73.7333% 25 ease easeIn;
  75.0667% 62 ease hold;
  100% 62;
};
keyframes out.d4.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  69.4667% 0 ease easeOut;
  70.4667% 0.615 ease hold;
  100% 0.615;
};
keyframes out.d4.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  75.3333% (0, 1) ease easeOut;
  78% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d4.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d5.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70% 0 ease easeOut;
  70.8333% 1 ease hold;
  73.8333% 1 ease easeOut;
  75.1667% 0 ease hold;
  100% 0;
};
keyframes out.d5.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  73.8333% 25 ease easeIn;
  75.1667% 62 ease hold;
  100% 62;
};
keyframes out.d5.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70% 0 ease easeOut;
  71% 0.66 ease hold;
  100% 0.66;
};
keyframes out.d5.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  75.5% (0, 1) ease easeOut;
  78.1667% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d5.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d6.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70.5333% 0 ease easeOut;
  71.3667% 1 ease hold;
  73.9333% 1 ease easeOut;
  75.2667% 0 ease hold;
  100% 0;
};
keyframes out.d6.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  73.9333% 25 ease easeIn;
  75.2667% 62 ease hold;
  100% 62;
};
keyframes out.d6.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  70.5333% 0 ease easeOut;
  71.5333% 0.51 ease hold;
  100% 0.51;
};
keyframes out.d6.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  75.6667% (0, 1) ease easeOut;
  78.3333% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d6.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d7.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  71.0667% 0 ease easeOut;
  71.9% 1 ease hold;
  74.0333% 1 ease easeOut;
  75.3667% 0 ease hold;
  100% 0;
};
keyframes out.d7.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  74.0333% 25 ease easeIn;
  75.3667% 62 ease hold;
  100% 62;
};
keyframes out.d7.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  71.0667% 0 ease easeOut;
  72.0667% 1 ease hold;
  100% 1;
};
keyframes out.d7.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  75.3333% (0, 1) ease easeOut;
  80% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d7.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  78.6667% 0 ease easeOut;
  79.6667% 1 ease hold;
  100% 1;
};
keyframes out.d8.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  71.6% 0 ease easeOut;
  72.4333% 1 ease hold;
  74.1333% 1 ease easeOut;
  75.4667% 0 ease hold;
  100% 0;
};
keyframes out.d8.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  74.1333% 25 ease easeIn;
  75.4667% 62 ease hold;
  100% 62;
};
keyframes out.d8.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  71.6% 0 ease easeOut;
  72.6% 0.72 ease hold;
  100% 0.72;
};
keyframes out.d8.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  76% (0, 1) ease easeOut;
  78.6667% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d8.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.d9.score.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  72.1333% 0 ease easeOut;
  72.9667% 1 ease hold;
  74.2333% 1 ease easeOut;
  75.5667% 0 ease hold;
  100% 0;
};
keyframes out.d9.score.position.x {
  start 0s;
  duration 30s;
  0% 25 ease hold;
  74.2333% 25 ease easeIn;
  75.5667% 62 ease hold;
  100% 62;
};
keyframes out.d9.neg.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  72.1333% 0 ease easeOut;
  73.1333% 0.129 ease hold;
  100% 0.129;
};
keyframes out.d9.bar.scale {
  start 0s;
  duration 30s;
  0% (0, 1) ease hold;
  76.1667% (0, 1) ease easeOut;
  78.8333% (1, 1) ease hold;
  100% (1, 1);
};
keyframes out.d9.pct.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  77.3333% 0 ease easeOut;
  78.3333% 1 ease hold;
  100% 1;
};
keyframes out.smax.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  68.6667% 0 ease easeOut;
  70.6667% 1 ease hold;
  100% 1;
};
keyframes out.smax.glow.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  72% 0 ease easeIn;
  75% 1 ease easeOut;
  78% 0.15 ease hold;
  100% 0.15;
};
keyframes out.probs.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  74.6667% 0 ease easeOut;
  76% 1 ease hold;
  100% 1;
};
keyframes out.others.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  78.6667% 0 ease easeOut;
  80% 1 ease hold;
  100% 1;
};
keyframes out.d7.win.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  81.3333% 0 ease easeOut;
  82.6667% 1 ease hold;
  100% 1;
};
keyframes out.d0.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d2.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d3.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d4.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d5.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d6.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d8.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d1.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes out.d9.opacity {
  start 0s;
  duration 30s;
  0% 1 ease hold;
  81.3333% 1 ease easeOut;
  83.3333% 0.6 ease hold;
  100% 0.6;
};
keyframes pred.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  85.3333% 0 ease easeOut;
  86.6667% 1 ease hold;
  100% 1;
};
keyframes pred.ping.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  86.6667% 0 ease easeOut;
  86.8667% 0.9 ease easeIn;
  88.6667% 0 ease hold;
  100% 0;
};
keyframes trail.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  86.5% 0 ease easeOut;
  86.6667% 0.9 ease hold;
  94.3333% 0.9 ease easeOut;
  96.3333% 0.55 ease hold;
  100% 0.55;
};
keyframes trail.trim.end {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  86.6667% 0 ease linear;
  93.3333% 1 ease hold;
  100% 1;
};
keyframes hl.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  86.1667% 0 ease easeOut;
  86.6667% 1 ease hold;
  94.3333% 1 ease easeOut;
  96% 0 ease hold;
  100% 0;
};
keyframes hl.position.x {
  start 0s;
  duration 30s;
  0% 116.5 ease hold;
  86.6667% 116.5 ease linear;
  88.0933% 340 ease linear;
  89.4033% 540 ease linear;
  90.6867% 740 ease linear;
  91.7967% 920 ease linear;
  93.3333% 1178.0107 ease hold;
  100% 1178.0107;
};
keyframes hl.position.y {
  start 0s;
  duration 30s;
  0% 278.5 ease hold;
  86.6667% 278.5 ease linear;
  88.0933% 192 ease linear;
  89.4033% 284 ease linear;
  90.6867% 364 ease linear;
  91.7967% 414 ease linear;
  93.3333% 414 ease hold;
  100% 414;
};
keyframes stages.s0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  86.3333% 0 ease easeOut;
  87.1667% 1 ease hold;
  100% 1;
};
keyframes stages.s1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  87.76% 0 ease easeOut;
  88.5933% 1 ease hold;
  100% 1;
};
keyframes stages.a0.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  87.4267% 0 ease easeOut;
  88.0933% 1 ease hold;
  100% 1;
};
keyframes stages.s2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  91.4633% 0 ease easeOut;
  92.2967% 1 ease hold;
  100% 1;
};
keyframes stages.a1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  91.13% 0 ease easeOut;
  91.7967% 1 ease hold;
  100% 1;
};
keyframes stages.s3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  93% 0 ease easeOut;
  93.8333% 1 ease hold;
  100% 1;
};
keyframes stages.a2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  92.6667% 0 ease easeOut;
  93.3333% 1 ease hold;
  100% 1;
};
keyframes captions.plate.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  50.6667% 0 ease easeOut;
  51.6667% 0.86 ease hold;
  66.6667% 0.86 ease easeOut;
  67.6667% 0 ease hold;
  84% 0 ease easeOut;
  85% 0.86 ease hold;
  100% 0.86;
};
keyframes captions.cap1.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  51.3333% 0 ease easeOut;
  52.1667% 1 ease hold;
  58.6667% 1 ease easeOut;
  59.3333% 0 ease hold;
  100% 0;
};
keyframes captions.cap2.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  59.8333% 0 ease easeOut;
  60.6667% 1 ease hold;
  66.3333% 1 ease easeOut;
  67% 0 ease hold;
  100% 0;
};
keyframes captions.cap3.opacity {
  start 0s;
  duration 30s;
  0% 0 ease hold;
  84.6667% 0 ease easeOut;
  85.5% 1 ease hold;
  100% 1;
};
keyframes camera(main).position.x {
  start 0s;
  duration 30s;
  0% 120 ease hold;
  10% 120 ease easeInOut;
  16.6667% 380 ease easeInOut;
  30% 360 ease easeInOut;
  33.3333% 611 ease hold;
  48.6667% 611 ease easeInOut;
  52.6667% 640 ease linear;
  66% 700 ease easeInOut;
  69.3333% 1040 ease hold;
  83.3333% 1040 ease easeInOut;
  86.6667% 687 ease hold;
  100% 687;
};
keyframes camera(main).position.y {
  start 0s;
  duration 30s;
  0% 324 ease hold;
  10% 324 ease easeInOut;
  16.6667% 324 ease easeInOut;
  30% 324 ease easeInOut;
  33.3333% 312 ease hold;
  48.6667% 312 ease easeInOut;
  52.6667% 324 ease linear;
  66% 324 ease easeInOut;
  69.3333% 324 ease hold;
  83.3333% 324 ease easeInOut;
  86.6667% 330 ease hold;
  100% 330;
};
keyframes camera(main).zoom {
  start 0s;
  duration 30s;
  0% 2.8 ease hold;
  10% 2.8 ease easeInOut;
  16.6667% 1.5 ease easeInOut;
  30% 1.42 ease easeInOut;
  33.3333% 2.1 ease hold;
  48.6667% 2.1 ease easeInOut;
  52.6667% 1.45 ease linear;
  66% 1.45 ease easeInOut;
  69.3333% 1.5 ease hold;
  83.3333% 1.5 ease easeInOut;
  86.6667% 0.94 ease hold;
  100% 0.94;
};
complete;
