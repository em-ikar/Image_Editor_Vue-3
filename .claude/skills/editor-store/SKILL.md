---
name: editor-store
description: State architecture of this image editor — the Pinia editor store, non-destructive editing model, brightness/contrast/saturation sliders, filters (grayscale, sepia …), live preview, reset / view original, and export/download. Use this skill whenever the task touches editor state, sliders, filters, preview, reset, compare-with-original, export, or any file in src/stores or src/services, even if the user doesn't mention Pinia.
---

# Editor state (Pinia)

Generic Pinia rules (storeToRefs, createPinia before mount, setup stores
returning all state) come from the `vue-pinia-best-practices` skill.
This skill defines **what** the editor state is and how the features fit.

## Requirements this state must serve

1. Load image via file upload
2. Crop
3. Live sliders with real-time preview: brightness, contrast, saturation
4. Reset / view original — **non-destructive**: original is never modified,
   the preview is derived
5. Export by downloading
6. At least one filter (grayscale, sepia …)

Do not add features outside this list (undo/redo, rotation, layers, URL sync,
persistence) unless the user asks. Scope creep hurts a test task.

## Core model: original → ops → render

```
original (File + object URL + decoded HTMLImageElement, immutable)
   │  edit state: crop rect (natural px) + adjustments (-100..100) + filter id
   ▼
ops: Op[]   ← stateToOps(), the single source of truth (canonical order,
   │          neutral ops omitted; UI scale converted to factors in ONE place)
   ▼
render(source, ops, canvas)   ← src/render/render.ts, own pixel math
   ├─ live preview: source = downscaled base (<= 2048 px), rAF-throttled
   ├─ export:       source = full-resolution original → PNG
   └─ JSON:         serializeEdits() → <name>-edited.ops.json
```

- No CSS `filter` / `ctx.filter` anywhere: colour math lives in
  `src/render/colorOps.ts` (pure, `Uint8ClampedArray`, unit-tested) and is the
  same for preview, export and the future JSON replay. Formulas are in the README.
- Never write pixels back into the original. Re-cropping always starts from the
  original; a crop is only a rectangle in the original's natural pixels.

## Store shape

One store: `src/stores/editor.ts`, setup store, `useEditorStore`.

State:
- `original: { name, type, url, width, height, sha256 } | null` (sha256 of the file bytes, computed on upload)
- `image: HTMLImageElement | null` — decoded original, a `shallowRef` (never proxied)
- `crop: CropRect | null` — natural-pixel integers; `null` = whole image
- `adjustments: { brightness, contrast, saturation }` — UI scale -100..100, default `0`
- `filter: FilterId` — `'none' | 'grayscale' | 'sepia'`
- `mode: 'crop' | 'adjust'`, `showOriginal: boolean` (compare toggle, keeps edits)

Imported operations (kept across image uploads, removed only by `clearOperations()`):
`importedDoc`, `importedFileName`, `importErrors`, `importResult` (warnings after an apply).

Getters: `hasImage`, `ops`, `hasAdjustmentEdits`, `hasEdits` (= `ops.length > 0`),
`importPlan` (`planApply()` of the imported doc against the loaded image, or null).

Actions: `loadFile(file)`, `applyCrop(rect)`, `clearCrop()`, `setAdjustment`,
`setFilter`, `resetAdjustments`, `resetAll`, `toggleOriginal`, `setMode`, `dispose`,
`loadOperationsFile(file)`, `clearOperations()`, `applyOperations()` (replaces the edits
with `importPlan.ops` via `opsToState`; does not change the tab).

`mode` is `'crop' | 'adjust' | 'operations'`. Only crop mode needs an image, so
upload / reset / dispose only leave crop mode (`leaveCropMode`).

## Rules that matter

- **Ops are the source of truth.** Anything that changes how the image looks
  must be expressible as an `Op` (`src/types/operations.ts`). To add an
  adjustment: extend `Op`, `stateToOps`/`opsToState`, `applyColorOps`, the
  README formulas and the tests.
- **One render function** for preview and export. Don't duplicate the maths.
- **Live preview** = `<canvas>` drawn by `usePreviewRender` from a downscaled
  base; bases are rebuilt only when the image or crop changes.
- **View original** draws the uncropped base with no ops. Edits stay in the store.
- **Object URLs**: only `original.url` exists now; revoke it on replace/`dispose()`.
- **Export lives in a service**, `src/services/exportImage.ts`: PNG via `render()`,
  plus the JSON blob; two sequential downloads with a small delay.
- **Import**: `parseEditDocument` (validation, all errors collected) and
  `planApply` (hash check, crop clamp/drop, quantizing) are pure; the UI is
  `OperationsPanel.vue`. Imported ops go through the same store state and the
  same `render()` — never a second render path.
- **Cropper boundary**: `CropperPanel` maps the selection to natural pixels and
  calls `store.applyCrop(rect)`. The store never touches cropper elements.
- **Sliders with Vuetify**: bind with a computed getter/setter; don't destructure the store.
- File validation happens in `loadFile`: reject non-`image/*` types.

## Done checklist

- [ ] Original never mutated; reset returns exactly the uploaded image
- [ ] Sliders update the canvas preview live (one render per animation frame)
- [ ] Exported PNG matches the preview; the JSON replays to the same pixels
- [ ] Re-crop starts from original; crop stored in natural pixels
- [ ] View original toggles without losing edits
- [ ] `original.url` revoked; no DOM/cropper objects in the store (the decoded image is a `shallowRef`)
- [ ] `npm run type-check` and `npm run test` pass
