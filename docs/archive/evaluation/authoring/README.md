# Authoring corpus

[Sample registry](manifests/samples.json) starts empty, schema revision 1.0. Actual authoring runs add corpus programs and frozen manifests under `manifests/corpora/<corpus-id>.json`; installation adds no verified samples or results. This registry is separate from the accepted fidelity corpus under `fixtures/corpus/`.

Use the [authoring workflow](../../docs/workflows/authoring-loop.md), [readiness specification](../../docs/authoring/evaluation-spec.md) and [program revision/storage rules](../../docs/authoring/sample-registry-spec.md). Register only evidence-qualified imported/native inputs. Reserve lineage revision numbers before writing immutable program directories, and maintain separate latest-recorded, verified-faithful and preferred-verified-authored pointers. Exploratory work cannot certify readiness.
