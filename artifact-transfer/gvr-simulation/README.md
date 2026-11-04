# GVR conversation simulator

Paste AGENT-PROMPT.md into an external agent with this folder and a GVR repository checkout available. Then send ordinary user prompts. Say `conversation closed` when finished. The agent coordinates director generation, implementation, verification and final packaging without asking you to shuttle artifacts between stages.

The director snapshot is the built-in gvr-director-sequence skill exported on 4 November 2026. It is frozen here for reproducibility, not installed or modified globally. The implementer prompt is the user-supplied authoring experiment template. Its embedded packaging instructions apply to the implementation stage; the coordinator additionally packages the conversation.

The production repository director parser is a separate contract from experimental director 0.4. GVR transcript 0.1 stores director JSON as a string. Passing transcript validation does not mean the host implements the experimental handoff or that programs meet their intended behaviour.

Use `templates/session.json` to initialise a session. See SESSION-PROTOCOL.md and tools/package_session.py. Runtime artifacts belong in your scratch session folder, not the repository. Do not open issues, edit engine code, push, publish or create official story records during simulation.

Output on closure: one ZIP containing transcript.json, exact prompt snapshots, user/director turns, programs, implementation proposals, evidence manifests and final review. For conversation-only turns there is no MS program or implementation proposal. Artifacts with failed verification remain labelled failed.

This kit is a workflow and packaging helper, not a running renderer, compiler integration or multi-agent service. The coordinating agent uses repository tools to perform those stages.
