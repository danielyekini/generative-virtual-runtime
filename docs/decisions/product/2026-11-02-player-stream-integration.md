# P002 integration with input.bindings and audio.cues

Scope: P002 #43 integration after main advanced through native input/audio 0.11.0 and spatial prototype E010. Preserve the accepted Player workflows; no new UX, syntax, wire semantics or audio schedule policy.

An instant-only AnimationRuntime snapshot would discard streaming entity projection and frontier exclusion. Instead, StreamingRuntime accepts the existing optional SampleOverlay callback, applied after projection/sampling at the bounded time and before resolved-frame construction, as AnimationRuntime already does. A conformance test checks an input toggle, preservation of authored values without overlay, and clamping the overlay time to the seal. The registry links this test; no language release bump is appropriate for this host API plumbing.

Player input/audio services start at the first accepted seal (or complete), when base definitions/resources are frozen. Later cues append with the engine's syncSceneAudioCues helper; sessions are not recreated per transport chunk. Audio uses Stream's playback rate and treats waiting_for_content as paused, so voices cannot run beyond the held visual horizon. Required-resource holds, seek/replay, pause and offline export retain the existing AudioSession/WebAudioBackend paths. Stream restart clears prior input and audio; page teardown disposes both. Ordinary instant Run still uses its original path.

Verification adds real Chromium pointer input and decoded first/late audio cue playback on Stream, pause and WAV export, alongside the prior 94 Studio checks and full repository gate. Revisit at future runtime media/interaction contract changes rather than duplicating engine semantics in Product.
