<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
import 'cropperjs';
import type { CropperCanvas, CropperImage, CropperSelection } from 'cropperjs';
import { useEditorStore } from '@/stores/editor';
import type { CropRect } from '@/types/operations';

const { src, aspectRatio } = defineProps<{
  src: string;
  aspectRatio: number;
}>();

const emit = defineEmits<{
  'selection-change': [size: { width: number; height: number }];
}>();

const editor = useEditorStore();

const canvasRef = useTemplateRef<CropperCanvas>('cropperCanvas');
const imageRef = useTemplateRef<CropperImage>('cropperImage');
const selectionRef = useTemplateRef<CropperSelection>('cropperSelection');

watch(
  () => aspectRatio,
  (value) => {
    const selection = selectionRef.value;
    if (!selection) return;
    selection.aspectRatio = value;
    selection.$reset();
  },
);

async function onImageMounted() {
  const image = imageRef.value;
  if (!image) return;
  await image.$ready();
  image.$center('contain');
  showStoredCrop();
}

// Inverse of naturalRect(): when a crop already exists (applied earlier or
// imported from JSON), start with the selection on it instead of a fresh one.
function showStoredCrop() {
  const image = imageRef.value;
  const selection = selectionRef.value;
  const canvas = canvasRef.value;
  const original = editor.original;
  const crop = editor.crop;
  if (!image || !selection || !canvas || !original || !crop) return;

  const imageBox = image.getBoundingClientRect();
  const canvasBox = canvas.getBoundingClientRect();
  const scale = imageBox.width / original.width;
  if (!scale) return;

  // NaN aspect ratio: show the crop exactly as stored, whatever ratio chip is active.
  selection.$change(
    imageBox.left - canvasBox.left + crop.x * scale,
    imageBox.top - canvasBox.top + crop.y * scale,
    crop.width * scale,
    crop.height * scale,
    Number.NaN,
  );
  reportSelection();
}

// Cropper v2 has no `getData()`. The selection and the image are both laid out
// in the page, so their bounding boxes give the selection relative to the image
// (the transform matrix alone isn't enough: its translation is relative to the
// image element's own layout offset). Divide by the display scale to get the
// original's natural pixels, clamped to the image bounds. The image is never
// rotated here, so its box width maps 1:1 to the natural width.
function naturalRect(): CropRect | null {
  const image = imageRef.value;
  const selection = selectionRef.value;
  const original = editor.original;
  if (!image || !selection || !original) return null;

  const imageBox = image.getBoundingClientRect();
  const selectionBox = selection.getBoundingClientRect();
  const scale = imageBox.width / original.width;
  if (!scale) return null;

  const toNatural = (value: number) => Math.round(value / scale);

  const x = Math.min(original.width - 1, Math.max(0, toNatural(selectionBox.left - imageBox.left)));
  const y = Math.min(original.height - 1, Math.max(0, toNatural(selectionBox.top - imageBox.top)));
  const width = Math.min(original.width - x, Math.max(1, toNatural(selectionBox.width)));
  const height = Math.min(original.height - y, Math.max(1, toNatural(selectionBox.height)));

  return { x, y, width, height };
}

function reportSelection() {
  const rect = naturalRect();
  if (rect) emit('selection-change', { width: rect.width, height: rect.height });
}

function apply() {
  const rect = naturalRect();
  if (rect) editor.applyCrop(rect);
}

defineExpose({ apply });
</script>

<template>
  <cropper-canvas :key="src" ref="cropperCanvas" class="cropper-canvas" background>
    <cropper-image
      ref="cropperImage"
      :src="src"
      alt="Image to crop"
      scalable
      translatable
      @vue:mounted="onImageMounted"
    />
    <cropper-shade hidden />
    <cropper-handle action="select" plain />
    <cropper-selection
      ref="cropperSelection"
      :aspect-ratio="aspectRatio"
      initial-coverage="0.8"
      movable
      resizable
      outlined
      @change="reportSelection"
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
.cropper-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
