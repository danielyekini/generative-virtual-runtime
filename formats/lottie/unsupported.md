# Lottie gaps

This list is what the adapter does not lower yet. It is not a limit on Scene IR or MotionScript. Add the missing capability in those languages, then lower it. The registry is the support claim.

Every behaviour-affecting feature must land in **exact**, **approximated**, **dropped**, or **unsupported** via `FidelityReport` / import diagnostics. Visible or temporal semantics must not be silently guessed. The source inventory still runs before lowering. A finding is dropped from the unsupported list when the lowerer represents that construct. The printed report groups repeated messages and keeps every source location. `COUNTS` records conversion decisions, not visual fidelity.

## Unsupported (visible or structural)

These produce `IMPORT_UNSUPPORTED` (or block the scene when policy requires):

| Feature | Reason |
| --- | --- |
| Layer masks (`masksProperties`) | No clip path is applied |
| Track mattes (`tt` / `td`) | Detected and withheld, so the layer is not drawn unmasked |
| Effects | Inventoried. Blur and shadow exist on render scopes but Lottie effect parameters are not guessed |
| `ks.sk` / `ks.sa` (skew) | Scene IR transform has no skew |
| `ao` auto-orient | Not representable on the transform |
| Animated fill/stroke colour | No colour tracks |
| Animated path morph | Rejected unless command topology matches, and matching topology is still not sampled |
| Repeaters / merge paths | Not lowered |
| Gradient strokes | Fill gradients lower; stroke gradients do not |
| Elliptical arc shortcuts in paths | Only if path cannot be lowered to supported commands |

When unsupported features appear but a partial scene is still produced, overall fidelity is **partial**.

## Approximated

| Feature | Approximation | Caveat |
| --- | --- | --- |
| Bezier easing whose x controls leave `[0, 1]` | Mapped to `easeInOut` | Monotonic cubics are stored as cubic easing |
| Animated trim and animated corner radius | First value is baked | The operator or radius is not a track |

Approximations always emit `IMPORT_APPROXIMATED` with target node/track context.

## Dropped (metadata only)

| Feature | Policy |
| --- | --- |
| Unknown JSON fields with no rendering effect | Ignored; may appear in metadata notes only |
| Authoring labels / markers / unused `nm` on non-ID paths | Ignored |

**Dropped must not remove visible geometry or motion** that the subset claims to support.

## Failed import (no Scene IR)

| Condition | Outcome |
| --- | --- |
| Invalid JSON | `IMPORT_MALFORMED`, no scene |
| Missing/invalid `fr`, `ip`, `op`, `w`, `h`, `layers` | fatal parse diagnostic |
| Scene IR validation failure after lowering | `IMPORT_INVALID_IR`, scene dropped |

A failed import does not replace a scene already on the canvas. The attempt stays failed, and the status keeps the attempted fixture separate from the displayed scene. With nothing already showing, the canvas stays clear. A failed import does not mutate a prior valid Scene IR.
