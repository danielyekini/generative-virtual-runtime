# P002 verification count correction

The immutable summary's “30 IR fixtures” is a transcription error. The measured
`fixtures/ir/manifest.json` contains **21 cases**, all passing. All other recorded
results stand: 309 tests in 45 files, 33 operations tests, full typechecks/build,
reference freshness and 94/94 browser smoke checks. This corrects the report,
not implementation or measured acceptance.
