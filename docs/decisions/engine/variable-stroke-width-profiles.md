# Variable stroke width profiles versus stop (E049)

Decision: 3 November 2026.
[Issue #218](https://github.com/danielyekini/generative-virtual-runtime/issues/218).
Decision record. **Stop** — no MotionScript / Scene IR version bump, no
registry capability, no language width-profile construct.

Parent: [path-progress-geometry-authoring.md](path-progress-geometry-authoring.md)
(E015). Dash paint already landed as E038 (`paint.strokeDash`).

## Requirement

Decide whether variable stroke width along arc length (normals, joins, cusps)
is justified as a versioned native capability, or **stop** and keep uniform
`stroke.width` (`paint.animatedSolid`) plus host recipes. Acceptance requires
an explicit call on streaming, ownership, seek, renderer cost and
authoring/generation impact. A justified stop is complete. No Lottie
width-profile campaign (charter).

## Current facts

| Layer | Behaviour today |
| --- | --- |
| `paint.animatedSolid` | Animates uniform `stroke.width` (> 0) as a scalar track. |
| Canvas renderer | One `lineWidth` per path draw; no native variable-width stroke. |
| Path metrics (E015) | Arc-length point/tangent helpers exist; width profiles were deferred. |
| Corpus / Studio | No Ready story or Studio fixture blocked on ribbons/cusps. |

## Alternatives

1. **Status quo — uniform `stroke.width` + host recipes** (chosen). Authors
   animate one width. Hosts that need a ribbon fill an outline polygon or emit
   parallel offset polylines outside the language. Matches shipped paint and
   renderer. No new ownership or seal rules.

2. **Versioned width-profile capability** (samples along arc length → offset
   outline or mesh). **Rejected now.** Canvas cannot stroke variable width;
   the runtime would own a fill outline or triangle strip derived from normals.
   Joins and cusps need explicit policy (mitre/bevel/round at high curvature).
   Seek must rebuild the outline from sealed geometry + profile samples.
   Streaming would add exclusive ownership of the profile channel and seal
   rules for late writers. Authoring a profile as arc-length keys pushes
   calculator work onto humans/models (violates the authoring gate). No
   corpus story failed without it.

3. **Animate width via many short path segments with stepped widths.**
   **Rejected as a language feature.** Generators can already emit that as
   ordinary geometry; baking it into syntax invents brittle micro-syntax and
   does not fix joins.

4. **Lottie / SVG variable-stroke import as the driver.** **Rejected**
   (charter). Legacy gaps do not authorise native backlog.

## Chosen scope

- **Stop.** Keep uniform `stroke.width` under `paint.animatedSolid`.
- Do not add MotionScript/Scene IR syntax, registry rows or Studio frames for
  width profiles in this milestone.
- Host/schema recipes (offset polyline, filled ribbon from path metrics) remain
  available outside the language; they are not a support claim.

## Authoring assessment

1. **Simplicity.** One width number stays understandable. Profiles force
   arc-length tables and join math the system would have to derive — and we
   lack a cheap renderer path that derives them honestly.
2. **Generation.** Models already vary `stroke.width` tracks. Teaching a
   profile syntax without a story need increases error rate.
3. **Streaming.** Uniform width already follows paint-channel ownership. A
   profile channel would be a new exclusive writer with outline rebuild cost
   on every seek.
4. **Expressiveness.** Ribbons that matter for teaching can be filled outlines
   authored as paths; that reuses geometry rather than inventing stroke
   semantics the canvas does not have.

## Critical pass

- Do not pretend `lineWidth` animation is a width profile.
- Do not widen dash (E038) or trim into a substitute for variable width.
- Do not start a Lottie parity campaign for tapered strokes.

## Child work

None commissioned. Revisit only with a named corpus/Studio story that cannot
be met by a filled outline or host ribbon, plus a bounded renderer design for
joins/cusps and seek cost.

## Revisit

- A teaching or spatial story needs a tapered stroke that filled outlines
  cannot express without exploding path count.
- A future renderer gains a cheap, testable variable-width path (not only
  Canvas 2D `lineWidth`).
