# Cropper.js v2 API cheat sheet

Source: https://fengyuanchen.github.io/cropperjs/api/ (v2.x).
If something here disagrees with `node_modules/cropperjs` types, the types win.

## Contents
- Registration
- `<cropper-canvas>`
- `<cropper-image>`
- `<cropper-selection>`
- `<cropper-handle>`, `<cropper-shade>`, `<cropper-grid>`, `<cropper-crosshair>`

## Registration

```ts
import 'cropperjs'; // defines all <cropper-*> custom elements
```
On-demand alternative: `import CropperCanvas from '@cropper/element-canvas'; CropperCanvas.$define();`

## `<cropper-canvas>`

Props: `background` (bool, grid bg), `disabled` (bool), `scaleStep` (number, wheel zoom step, default 0.1), `themeColor` (string, default `#39f`).

Methods:
- `$setAction(action: string)` — change current action
- `$toCanvas(options?: { width?, height?, beforeDraw?(ctx, canvas) }): Promise<HTMLCanvasElement>` — whole canvas

Events: `action` (cancelable; `event.detail.scale` present for wheel zoom).

## `<cropper-image>`

Props: `initial-center-size` (`"contain"` | `"cover"`), `rotatable`, `scalable`, `skewable`, `translatable`, `slottable` (all bool).
Inherited to inner `<img>`: `src`, `alt`, `crossorigin`, `decoding`, `loading`, `referrerpolicy`, `sizes`, `srcset` …

Methods (all return the element for chaining unless noted):
- `$ready(cb?): Promise<HTMLImageElement>` — resolves after the image loads
- `$center(size?: 'contain' | 'cover')`
- `$move(x, y?)`, `$moveTo(x, y?)`
- `$rotate(angle: number | string, x?, y?)` — number = radians; strings: `'90deg'`, `'0.25turn'`
- `$zoom(scale, x?, y?)` — `0.1` = +10%, `-0.1` = −10%
- `$scale(x, y?)` — `-1, 1` flips horizontally
- `$skew(x, y?)`, `$translate(x, y?)`
- `$transform(a, b, c, d, e, f)` — multiply current matrix
- `$setTransform(a | matrix[], b?, c?, d?, e?, f?)` — replace matrix
- `$getTransform(): number[]` — `[a, b, c, d, e, f]`
- `$resetTransform()`

Events: `transform` (cancelable; `detail.matrix`, `detail.oldMatrix`). Call `event.preventDefault()` to block a transform.

## `<cropper-selection>`

Props: `x`, `y`, `width`, `height` (number), `aspectRatio` (number, `NaN` = free), `initialAspectRatio`, `initialCoverage` (0–1), `dynamic`, `movable`, `resizable`, `zoomable`, `multiple`, `keyboard`, `outlined`, `precise` (bool).

Methods:
- `$center()`
- `$move(x, y?)`, `$moveTo(x, y?)`
- `$resize(action: 'n-resize' | 'e-resize' | ... | 'sw-resize', offsetX?, offsetY?, aspectRatio?)`
- `$zoom(scale, x?, y?)`
- `$change(x, y, width?, height?, aspectRatio?)`
- `$reset()` — back to initial position/size
- `$clear()`
- `$render()`
- `$toCanvas(options?: { width?, height?, beforeDraw?(ctx, canvas) }): Promise<HTMLCanvasElement>` — selected area only; default size = selection size in screen px

Events: `change` (cancelable; `detail: { x, y, width, height }`). Use `event.preventDefault()` to keep the selection inside bounds.

Keyboard (when `keyboard`): arrows move 1px, `+`/`-` zoom 10%, Delete removes.

## Child elements

- `<cropper-handle action="move|select|scale|rotate|n-resize|...">` — `plain`, `theme-color`. Needed for any mouse interaction.
- `<cropper-shade hidden>` — darkens outside the selection.
- `<cropper-grid role="grid" covered>` — rule-of-thirds grid inside selection.
- `<cropper-crosshair centered>` — center mark.
