# P022 Generate UX polish — run ad3256cb-9f13-4287-8954-bf34c11c3aa4

- **Issue:** [P022 #165](https://github.com/danielyekini/generative-virtual-runtime/issues/165)
- **Also filed:** [P023 #166](https://github.com/danielyekini/generative-virtual-runtime/issues/166) loading screens; [P024 #167](https://github.com/danielyekini/generative-virtual-runtime/issues/167) model-serving optimisation
- **Branch:** `product/162-generate-ux-polish`

## Outcome

Human Generate findings (3 Nov 2026):

- Composer Approach/Model/Send sit inside prompt shell with padding
- Story pack scrollbar no longer covers chips
- Detail opens while generating; streams into open detail
- Output/Director is a View dropdown
- Resizable detail; extremes close panes; X from expanded returns to transcript
- Copy full chat transcript
- Header Generate uses two-sparkle AI icon

## Gates

`npm run verify` + `npm run smoke:studio`
