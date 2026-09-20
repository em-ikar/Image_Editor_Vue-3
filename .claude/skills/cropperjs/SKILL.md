---
name: cropperjs
description: How to integrate Cropper.js v2 (web components) into this Vue 3 + TypeScript + Pinia app. Use this skill whenever the task touches image cropping, the crop area/selection, aspect ratio, rotate, flip, zoom, reset, exporting or downloading the cropped image, or any file that imports `cropperjs` or renders `<cropper-*>` elements — even if the user just says "the editor" or "the image" and doesn't mention Cropper by name.
---

# Cropper.js v2 in Vue 3

This project uses **Cropper.js 2.x**. Version 2 is a set of web components
(`<cropper-canvas>`, `<cropper-image>`, `<cropper-selection>` …) and its API
has almost nothing in common with v1. Most tutorials, StackOverflow answers
and wrappers (`vue-cropperjs`, `vue-advanced-cropper`) target v1, so code
from memory is likely to be wrong. When in doubt, check the installed types
in `node_modules/cropperjs` instead of guessing.

## Before writing code

1. Check `package.json`: `cropperjs` must be `^2.x`. Never add v1 wrappers.
2. For method signatures, read `references/api-cheatsheet.md`.
3. For a new or rebuilt cropper component, start from
   `references/editor-template.md`.

## Never use (v1 API)

- `new Cropper(imgEl, { aspectRatio, viewMode, ... })` with options object
- `cropper.getCroppedCanvas()`, `cropper.rotate(90)`, `cropper.setAspectRatio()`
- `cropper.destroy()`, `cropper.replace(url)`
- `import 'cropperjs/dist/cropper.css'` — v2 ships CSS-in-JS, there is no CSS file

## Setup rules

- **Register elements once**: `import 'cropperjs'` defines all custom elements.
  Do it in `src/main.ts` (or at the top of the cropper component).
- **Tell Vue these are custom elements**, otherwise Vue warns
  "Failed to resolve component" and treats them as Vue components:
  ```ts
  // vite.config.ts
  vue({
    template: {
      compilerOptions: { isCustomElement: (tag) => tag.startsWith('cropper-') },
    },
  })
  ```
  Keep this alongside `vuetify({ autoImport: true })`, don't replace it.
- **Types**: first try `import type { CropperCanvas, CropperImage, CropperSelection } from 'cropperjs'`.
  If they are not exported there, import from `@cropper/element-canvas`,
  `@cropper/element-image`, `@cropper/element-selection` and add those packages
  to `dependencies` explicitly (don't rely on transitive installs).
- `<cropper-canvas>` needs an explicit CSS height; its default minimum is tiny.

## Vue integration rules

- Use the declarative template (elements in `<template>`) and access them via
  template refs typed as `ref<CropperSelection | null>(null)`.
- Resizing only works if the selection contains `<cropper-handle>` children
  with `*-resize` actions. Moving needs `action="move"` handles. Copy the full
  template from `references/editor-template.md`.
- **Wait for the image**: call `await image.$ready()` before `$center()`,
  reading `naturalWidth`, or adjusting the selection.
- **Changing the image**: put `:key="imageSrc"` on `<cropper-canvas>` so Vue
  remounts the whole cropper cleanly instead of patching `src` in place.
- **Cleanup**: there is no `destroy()`. Elements are removed with the
  component. Only clean up what you created yourself: listeners added with
  `addEventListener` and `URL.createObjectURL` URLs (`URL.revokeObjectURL`).
- Boolean attributes (`movable`, `resizable`, `rotatable`, `scalable`,
  `translatable`) are written bare in templates, like in the official examples.

## State rules (Pinia)

- **Never put cropper elements in Pinia or in `reactive()`**. Pinia wraps
  state in proxies, and DOM elements with internal state break or leak.
  Keep element refs local to the component.
- The editor state model is defined in the `editor-store` skill. For this
  component that means: load `store.original.url` (always the original, never
  the previous crop), and on "Apply" convert the selection to a rectangle in
  the original's natural pixels and call `store.applyCrop(rect)`; no bitmap is
  produced. Nothing else from the cropper goes to the store.
- **Selection → natural pixels**: Cropper v2 has no `getData()`, and
  `image.$getTransform()`'s translation is relative to the image element's own
  layout offset, so it is not enough on its own. Use
  `(selection.getBoundingClientRect() − image.getBoundingClientRect()) / (imageBox.width / original.width)`
  (see `naturalRect()` in `CropperPanel.vue`) and clamp to the image bounds.

## Common operations

| Task | v2 code |
|---|---|
| Rotate 90° | `image.$rotate('90deg')` — numbers are **radians**, not degrees |
| Flip horizontal / vertical | `image.$scale(-1, 1)` / `image.$scale(1, -1)` |
| Zoom image | `image.$zoom(0.1)` / `image.$zoom(-0.1)` |
| Fit image | `image.$center('contain')` |
| Reset image | `image.$resetTransform()` then `image.$center('contain')` |
| Aspect ratio | `selection.aspectRatio = 16 / 9` (free = `NaN`), then `selection.$reset()` or `$change(...)` so it applies |
| Reset selection | `selection.$reset()` |
| Export | `const canvas = await selection.$toCanvas({ width, height })` |
| To file | `canvas.toBlob(cb, 'image/png')` → `URL.createObjectURL(blob)` |

## Export gotcha: output resolution

(This project no longer exports a cropped bitmap: it stores the crop as a
rectangle in natural pixels, see "State rules". The gotcha below matters only
if you call `$toCanvas` yourself.)

`selection.$toCanvas()` without options returns a canvas the size of the
selection **in screen pixels**, not in original image pixels. A 300×200
selection over a 4000px photo gives a 300×200 result. To export at source
resolution, compute the scale between displayed and natural size and pass
`width`/`height` (see `exportAtNaturalSize` in `references/editor-template.md`).
Verify it: selecting the whole unrotated image should produce roughly the
image's `naturalWidth × naturalHeight`.

## Loading user files

- Get the file from Vuetify `<v-file-input>`, create `URL.createObjectURL(file)`,
  revoke the previous URL when replacing and on unmount.
- Validate type (`image/*`) before creating a URL.
- For remote URLs add `crossorigin="anonymous"` to `<cropper-image>`, otherwise
  the canvas is tainted and `toBlob` throws a SecurityError.

## Done checklist

- [ ] No v1 API anywhere (`grep -r "getCroppedCanvas\|new Cropper" src`)
- [ ] `isCustomElement` configured, no "Failed to resolve component" warnings
- [ ] Rotate/flip/zoom/aspect ratio/reset work after loading a second image
- [ ] The stored crop rectangle is in natural pixels (select the whole image → `0, 0, naturalWidth, naturalHeight`)
- [ ] Object URLs revoked, no cropper elements in Pinia
- [ ] `npm run type-check` passes
