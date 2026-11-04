# Full-stage background research

Requirement: user wants the complete available stage intentionally painted at all times, with no unintended letterbox/pillarbox bars. This permits negative space. It does not require stretching the artefact, cropping content or using every pixel for detail. “Black” is valid if intentionally chosen by the scene; black margin from host framing is the defect.

## Initial evidence

Read-only inspection at repository baseline cac7d5493cf0025c78bda31fee7f6436c7e955b2: app/playground/src/player/player.css, #canvas-area around line 133, has background: #000; #view is centred with absolute inset and auto margins. This is a plausible source of reported side bars, not a reproduced root-cause finding. Canvas sizing, scene.contain mapping and all renderer clear/composite paths still require tracing. No application change or runtime verification performed in this documentation update.

## First bounded hypothesis

Make full-stage backing a deterministic host/renderer responsibility. Preserve the scene's geometry, aspect ratio, input coordinate mapping and hit regions. Paint unused presentation space with an explicitly resolved background colour. This should not require generated image interpolation, stretching, cropping or program rewriting.

Investigate whether current scene background already supplies a sufficient backing colour. Only add metadata if existing semantics cannot express the distinction between artwork background and presentation-stage backing. Gradients/textures need an explicit policy; do not sample corners heuristically or assume edge pixels can be extended seamlessly.

## Alternatives

1. Theme-matched outer container backing: small host change; test exact colour, transparent scenes and fullscreen transitions.
2. Full-stage canvas backing plus contained artwork viewport: centralizes rendering but must preserve transforms, clearing, capture and input.
3. Responsive scene layout: important for content legibility, independent of backing fill; not a prerequisite for removing bars.
4. Crop/cover or anisotropic stretch: risks lost content and geometric distortion; not an acceptable blanket fix.
5. Generative extrapolation: unnecessary for solid themed backing and risks modifying authored intent; do not pursue without a separate compelling case.

## Tests and decisions needed

Trace host/CSS versus renderer responsibility across Studio, fullscreen, preview, export and comparison. Exercise portrait, ultrawide, resize, DPR changes, loading, failure, scene switching, transparency, animated background and interrupted transitions. Assert no stale previous-scene backing, gaps or unintended bars. Preserve measured hit-test positions and readable scale; do not claim responsiveness from coloured margins.

Use human review to judge continuity and background aesthetics alongside pixel checks. Decide deterministic backing resolution precedence, transparent-scene policy and export semantics. Record before/after captures, source hashes, viewport/DPR and actual repository revision. No default layout or hit-testing semantics should change merely to fill the stage.
