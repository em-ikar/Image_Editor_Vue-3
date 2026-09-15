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

## Core model: original → derived

```
original (File + object URL, immutable)
   │  crop (optional, re-done from original every time)
   ▼
croppedUrl (derived bitmap, replaceable, nullable)
   │  adjustments + filter (numbers, never baked into a bitmap in the store)
   ▼
preview  = <img :src="workingUrl" :style="{ filter: cssFilter }">
export   = canvas.drawImage(workingUrl) with ctx.filter = cssFilter
```

- `workingUrl = croppedUrl ?? originalUrl`
- Never write pixels back into the original. Never overwrite `originalUrl`
  except when a new file is loaded.
- Re-cropping always starts from the **original**, not from the previous
  crop, so crops don't compound and quality doesn't degrade.

## Store shape

One store: `src/stores/editor.ts`, setup store, `useEditorStore`.
Full reference implementation: `references/store-template.md`.

State (all serializable — no DOM elements, no cropper elements, no canvases):
- `original: { name: string; type: string; url: string; width: number; height: number } | null`
- `croppedUrl: string | null`
- `adjustments: { brightness: number; contrast: number; saturation: number }` — percents, default `100`
- `filter: FilterId` — `'none' | 'grayscale' | 'sepia'` (extend the union to add more)
- `mode: 'crop' | 'adjust'`
- `showOriginal: boolean` — compare toggle, does NOT reset edits

Getters:
- `workingUrl`, `hasImage`, `hasEdits`
- `cssFilter` — built by the single pure function `buildCssFilter()`

Actions:
- `loadFile(file)`, `applyCrop(blob)`, `clearCrop()`
- `setAdjustment(key, value)`, `setFilter(id)`
- `resetAdjustments()`, `resetAll()` (crop + adjustments + filter), `toggleOriginal()`
- `dispose()` — revoke all object URLs

## Rules that matter

- **One filter builder, used twice.** `buildCssFilter()` in
  `src/services/imageFilters.ts` produces the CSS filter string. Preview uses
  it in `style.filter`, export uses the same string in `ctx.filter`. This is
  what makes the download match the preview. Never duplicate the formula.
- **Live preview = CSS filter on `<img>`**, not canvas redraws on every slider
  tick. It's GPU-accelerated and needs no throttling.
- **View original**: when `showOriginal` is true, preview shows `originalUrl`
  with no filter. Edits stay in the store and come back when toggled off.
- **Object URL lifecycle**: every `URL.createObjectURL` has a matching
  `revokeObjectURL` — when replacing `croppedUrl`, loading a new file, and in
  `dispose()`.
- **Export lives in a service**, `src/services/exportImage.ts`, not in the store:
  it needs DOM (`Image`, `canvas`). The store action only passes data to it.
  Export at the working image's natural size.
- **Cropper boundary**: the crop component (see `cropperjs` skill) loads
  `originalUrl`, and on "Apply" calls `store.applyCrop(blob)` with the
  natural-size `$toCanvas` result. The store never touches cropper elements.
- **Sliders with Vuetify**: bind with a computed getter/setter or
  `storeToRefs`, e.g. `<v-slider v-model="brightness" :min="0" :max="200" :step="1" />`.
  Don't destructure the store directly.
- File validation happens in `loadFile`: reject non-`image/*` types.

## Known caveat

`CanvasRenderingContext2D.filter` has historically been missing in Safari.
If export must work there, add a pixel-loop fallback in `exportImage.ts`
(apply brightness/contrast/saturation/filter on `getImageData`) behind a
feature check. Check current support before deciding.

## Done checklist

- [ ] Original never mutated; reset returns exactly the uploaded image
- [ ] Sliders update preview instantly, no canvas work per tick
- [ ] Downloaded file matches preview (same `buildCssFilter` output)
- [ ] Re-crop starts from original
- [ ] View original toggles without losing edits
- [ ] All object URLs revoked; no DOM/cropper objects in the store
- [ ] `npx vue-tsc --noEmit` passes
