# P029 Transcripts library and playback

Run: `50c335bf-f608-43c1-954a-57b420916a14`. Issue: [#186](https://github.com/danielyekini/generative-virtual-runtime/issues/186).

Generate sessions now persist as a versioned GVR transcript (`0.1`) under the
Library **Transcripts** collection, in addition to the last MotionScript saved
in My programs. Uploading a transcript JSON imports it; opening the card enters
Generate and plays each recorded program, highlighting the user bubble and the
model bubble for the turn on the canvas. The contract stays in Studio
(`app/playground/src/player/gvr-transcript.ts`); no shared schema package and
no Engine inbox request.

Verification (exit 0):
- `npm run verify`: 105 Vitest files / 677 tests, typechecks, Studio build, IR
  manifest, 33 operations tests, capability reference `ms-0.26.0_sir-0.25.0`.
- `npm run smoke:studio`: 149/149, including transcript upload, Generate
  playback with the rendering pair highlighted, and advance to the second scene.

Not done here: speech/mic (P009), Director-default changes, or the P020 human
animation-quality judgment.
