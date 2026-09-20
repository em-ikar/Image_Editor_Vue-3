# Cropper editor component template

Generic starting point. In this project the real component is
`src/components/editor/CropperPanel.vue`: it emits/stores a crop **rectangle in
natural pixels** (`naturalRect()`) instead of exporting a bitmap
(`exportAtNaturalSize` below), and it positions the selection from
`store.crop` on mount (`showStoredCrop()`).

Starting point for a cropper component. Adapt names and props to the
project; keep the structure (template refs, `$ready`, `:key`, local element
refs, serializable emits).

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import 'cropperjs';
// If these types are not exported from 'cropperjs', import them from
// '@cropper/element-canvas' / '-image' / '-selection' (add as dependencies).
import type { CropperCanvas, CropperImage, CropperSelection } from 'cropperjs';

const props = defineProps<{
  src: string;                 // object URL or same-origin URL
  aspectRatio?: number;        // undefined = free
}>();

const emit = defineEmits<{
  (e: 'cropped', payload: { blob: Blob; width: number; height: number }): void; // parent calls store.applyCrop(payload.blob)
}>();

const canvasRef = ref<CropperCanvas | null>(null);
const imageRef = ref<CropperImage | null>(null);
const selectionRef = ref<CropperSelection | null>(null);

const ratio = computed(() => props.aspectRatio ?? Number.NaN);

watch(ratio, (value) => {
  const selection = selectionRef.value;
  if (!selection) return;
  selection.aspectRatio = value;
  selection.$reset();
});

async function onImageMounted() {
  const image = imageRef.value;
  if (!image) return;
  await image.$ready();
  image.$center('contain');
}

function rotate(deg: number) {
  imageRef.value?.$rotate(`${deg}deg`);
}

function flip(axis: 'x' | 'y') {
  imageRef.value?.$scale(axis === 'x' ? -1 : 1, axis === 'y' ? -1 : 1);
}

function zoom(step: number) {
  imageRef.value?.$zoom(step);
}

function reset() {
  imageRef.value?.$resetTransform().$center('contain');
  selectionRef.value?.$reset();
}

// Export at source resolution instead of screen size.
// Displayed scale is taken from the image transform matrix [a, b, c, d, e, f].
// VERIFY after changes: selecting the whole unrotated image should give
// ~naturalWidth x naturalHeight.
async function exportAtNaturalSize(type = 'image/png') {
  const image = imageRef.value;
  const selection = selectionRef.value;
  if (!image || !selection) return;

  const [a, b] = image.$getTransform();
  const displayScale = Math.hypot(a, b) || 1;

  const width = Math.round(selection.width / displayScale);
  const height = Math.round(selection.height / displayScale);

  const canvas = await selection.$toCanvas({ width, height });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type));
  if (blob) emit('cropped', { blob, width, height });
}

defineExpose({ rotate, flip, zoom, reset, exportAtNaturalSize });

onBeforeUnmount(() => {
  // Nothing to destroy for Cropper v2. Clean up only listeners/URLs you created.
});
</script>

<template>
  <cropper-canvas :key="src" ref="canvasRef" class="cropper" background>
    <cropper-image
      ref="imageRef"
      :src="src"
      alt="Image to crop"
      rotatable
      scalable
      translatable
      @vue:mounted="onImageMounted"
    />
    <cropper-shade hidden />
    <cropper-handle action="select" plain />
    <cropper-selection
      ref="selectionRef"
      :aspect-ratio="ratio"
      initial-coverage="0.8"
      movable
      resizable
      outlined
    >
      <cropper-grid role="grid" covered />
      <cropper-crosshair centered />
      <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)" />
      <cropper-handle action="n-resize" />
      <cropper-handle action="e-resize" />
      <cropper-handle action="s-resize" />
      <cropper-handle action="w-resize" />
      <cropper-handle action="ne-resize" />
      <cropper-handle action="nw-resize" />
      <cropper-handle action="se-resize" />
      <cropper-handle action="sw-resize" />
    </cropper-selection>
  </cropper-canvas>
</template>

<style scoped>
.cropper {
  display: block;
  width: 100%;
  height: 60vh;
}
</style>
```

Notes:
- `@vue:mounted` fires when Vue inserts the element. If it proves unreliable,
  use `watch(imageRef, ...)` or `nextTick` inside `onMounted` instead.
- The parent owns the object URL: create it from the `<v-file-input>` file,
  pass it as `src`, and revoke the old one when the file changes.
- Keep selection within the image: listen to `@change` on
  `<cropper-selection>` and call `event.preventDefault()` when
  `event.detail` leaves the image rect (see the official "Limit boundaries" example).
