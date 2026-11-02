# User requirements and context trace

Adopted requirements below consolidate the project discussion. They govern
installation and future work; examples are scenarios, not claims of current support.

| ID | Requirement | Primary authority/route |
| --- | --- | --- |
| R01 | Prompt/speech -> live native visual + audible + interactive software | Charter; milestones M1-M5 |
| R02 | Progressive execution during generation, early useful motion, recoverable errors | Engine streaming contracts; E001/E002/E006 |
| R03 | Education: curricula, familiar language, objectives, questions, practice/IDE and understanding checks | Product vision; P008/P013 |
| R04 | General expressive outputs: instruments, articulated action, pixel art, varied graphics | Audit/corpus; capability backlog |
| R05 | Existing rich stories are representative workloads; improve practical capacity | E003; constraint decisions |
| R06 | Preserve documented intent of constraints; distinguish admission vs unit/frame/queue control | Decision protocol; no blanket raise/preserve rule |
| R07 | Cloning means in-memory transactional snapshots, not format round trips | PR #11 decision; P004 |
| R08 | Round-trip/side-by-side runs are explicit legacy tools; ordinary native runs avoid unnecessary work | P004; Studio brief |
| R09 | Persistent semantic objects, independent looping behaviours and turn context | E002/E004/E005; roof/pillar scenario |
| R10 | Hover/click/drag/zoom/scroll/keyboard/focus interactions | E007; P010 |
| R11 | 2D physics, selected 3D graphics/physics and useful library integration | E010/E011 |
| R12 | Real audible narration + effects; metadata alone is insufficient | E008; P009 |
| R13 | Track compile/evaluation/render/memory/queue costs and increase demonstrated capacity | Existing telemetry; E003 |
| R14 | Distinguish vision/directions from released capability truth and historical evidence | Authority map; functionality index |
| R15 | Compact model authoring SSOT; deeper developer reference/decision navigation | P006/E006; reference generation contract |
| R16 | GitHub repository-linked Project, issues/subissues and visible statuses | Project setup; workflow |
| R17 | Two coordinated workstreams with separate default code areas, skills and orchestrators | Ownership map; four persona skills |
| R18 | Each workstream has its own run clock and periodic review | Five terminal runs per lane; own ledger |
| R19 | Orchestrator-only cross-stream requests; regular workers see only resulting tasks | Inbox protocol; logical routing, not security isolation |
| R20 | Incoming requests are triaged between periodic reviews | Session-entry intake pass; optional event wake integration |
| R21 | Ordinary invocation needs no technical details from user | Persona startup discovery + config + live Ready queue |
| R22 | High-impact designs compare alternatives, critique and decide with bounded effort | Design protocol; no mandatory reviewer for every PR |
| R23 | Reuse previous evidence unless failed, incomplete or affected by new changes | Verification policy |
| R24 | Agents create and merge their passing PRs, link work items, no compulsory review | Integration protocol; honour actual protections |
| R25 | Studio supports agent tools and human tests via shared services | Product scope; P001/P005 |
| R26 | Fullscreen canvas playback | First product slice P001 |
| R27 | Searchable/filterable program library, upload and paste/editor | First product slice P001 |
| R28 | Separate source/library work from execution/inspection presentation | Studio workflow design |
| R29 | Streaming acts on the currently selected source; settings are execution settings | P002 |
| R30 | Explain fed units/received/accepted/queued/resolved/sealed/playhead | P002 + request X001 |
| R31 | Source progression grey/orange/white with accurate semantic mapping and accessible labels | P002; no false line->frame mapping |
| R32 | Timeline shows playable coverage ahead of playhead; repair empty stream-code pane | P002 |
| R33 | Other formats accepted on import; subtle language selector, tucked-away comparison | P004 |
| R34 | Expose performance/diagnostics where relevant, avoid dumping implementation details into customer flow | P003/P011 |
| R35 | Future live director-script/native-MS generation and prompt experiments | P007/P008 |
| R36 | User-facing speech input, demo stage expansion, later desktop/landing | P009/P011/P012 |
| R37 | Agents propose/queue ideas without loss/duplication; maintain useful next work | Candidate workflow; periodic review |
| R38 | User direction changes have an explicit protocol | Direction-change skill; decision log |
| R39 | Orchestrators can revise delivery scope/sequence within charter | Review protocol; clarify only material user-only decisions |
| R40 | Keep admin small and evidence progressive; no repeated encyclopedia read | Four-layer startup; concise handover |
| R41 | Consolidate old material without deleting historical evidence or breaking links | Migration plan; source/index classification |
| R42 | Legacy fidelity expansion is no longer a strategic gate | Charter; conditional reference checks only |
| R43 | Skills and all session context live in repo/GitHub and can resume after interruption | Repo-local skills; issue handovers; lease/resume |
| R44 | Initial work continues from latest merged capacity milestone | PR #11 evidence; first engine E001 |
| R46 | Every run runs full tests before PR submission; inherited failures get fixed, no weakening/skipping | Git standards; all persona skills |
| R47 | Isolated feature branches, full final integration gates, self-merge and delete own merged branches | Git standards |
| R45 | Product agents can request missing tools (e.g. UX generator) with concrete need | Experiment/tool protocol; independent work continues |

The original analysis/audit and prior run snapshots are source evidence, not
more recent product instructions. Current user corrections in this requirements
file take precedence over contradictory old workflow guidance.
