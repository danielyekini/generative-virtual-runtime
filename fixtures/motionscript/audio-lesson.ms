// Narration + effects sample for audio.cues (MotionScript 0.11.0, E026).
// Audio files are deterministic synthetic tones from fixtures/audio/generate-samples.ts
// (no speech synthesis: the narration bed stands in for host speech, P009).
scene "audio-lesson" {
  version "0.2";
  viewport (800, 450);
  background #0f172a;
  duration 4s;
};
audio Narration "audio/narration.wav" 2400ms;
audio Click "audio/click.wav" 80ms;
audio Bed "audio/bed.wav" 1s;
circle beat {
  position (200, 225);
  radius 40;
  fill #38bdf8;
};
rectangle bar {
  position (400, 360);
  size (20, 20);
  fill #f97316;
};
animate beat.position.x {
  from 200;
  to 600;
  duration 4s;
  ease easeInOut;
};
animate bar.scale.x {
  from 1;
  to 30;
  start 0ms;
  duration 2400ms;
};
cue Explain narration Narration at 200ms { fadeIn 50ms; fadeOut 100ms; };
cue Music music Bed at 0ms { loops 4; gain 0.6; };
cue Tap1 effects Click at 1s;
cue Tap2 effects Click at 2s;
cue Tap3 effects Click at 3s { gain 1.2; };
complete;
