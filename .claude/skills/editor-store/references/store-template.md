# Store reference

The CSS-filter based template that used to live here is obsolete. The source
of truth is the code itself:

- `src/stores/editor.ts` — the store (state, `ops` getter, actions)
- `src/services/editDocument.ts` — `stateToOps`, `opsToState`, `serializeEdits`
- `src/render/colorOps.ts`, `src/render/render.ts` — pixel math and `render()`
- `src/composables/usePreviewRender.ts` — live preview
- `src/services/exportImage.ts` — PNG + JSON export
