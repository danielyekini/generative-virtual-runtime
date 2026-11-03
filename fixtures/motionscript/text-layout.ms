scene "Text layout" {
  version "0.2";
  viewport (640, 360);
  background #0b1220;
  duration 2s;
  requires "text.layoutMetrics";
};

// Narrow glyphs. The hit box follows the advance table, not 0.6em per character.
text Narrow {
  position (180, 180);
  content "III";
  fontSize 64;
  align center;
  baseline middle;
  fill #38bdf8;
};

text Wide {
  position (460, 180);
  content "WWW";
  fontSize 64;
  align center;
  baseline middle;
  fill #f8fafc;
};
complete;
