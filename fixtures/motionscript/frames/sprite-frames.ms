// E045 test frame: resources.imageSampling + resources.spriteFrames.
// walker-atlas.png is a 4 x 2 grid of 8 x 8 texel cells. Each cell has a coloured
// marker one step further round the cell. Authors name the grid and a frame
// index; the renderer derives each cell's source rectangle from the decoded image.
scene "sprite-frames" {
  version "0.2";
  viewport (480, 270);
  background #0b1020;
  duration 4s;
};

timing walk { period 800ms; };

// Left: smooth sampling blurs the scaled texels.
image Smooth { href "images/walker-atlas.png"; size (96, 96); sampling smooth; frames (4, 2); position (40, 60); };
// Middle: pixelated sampling keeps hard texel edges at any scale.
image Crisp { href "images/walker-atlas.png"; size (96, 96); sampling pixelated; frames (4, 2); position (192, 60); };
// Right: a still frame (index 5 = column 1, row 1), pixelated.
image Still { href "images/walker-atlas.png"; size (96, 96); sampling pixelated; frames (4, 2); frame 5; position (344, 60); };

// Eight frames per 800ms loop: the floored frame value steps 0..7.
animate Smooth.frame { from 0; to 8; duration 800ms; timing walk; };
animate Crisp.frame { from 0; to 8; duration 800ms; timing walk; };

text Caption { content "smooth · pixelated · still frame 5"; fontSize 14; fill #cbd5e1; position (240, 210); align center; };

seal 4s;
complete;
