<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
import 'cropperjs';
import type { CropperImage, CropperSelection } from 'cropperjs';
import { useEditorStore } from '@/stores/editor';

const { src, aspectRatio } = defineProps<{
  src: string;
  aspectRatio: number;
}>();

const emit = defineEmits<{
  'selection-change': [size: { width: number; height: number }];
}>();

const editor = useEditorStore();

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
}

function displayScale(): number {
  const image = imageRef.value;
  if (!image) return 1;
  const [a, b] = image.$getTransform();
  return Math.hypot(a ?? 1, b ?? 0) || 1;
}

function reportSelection() {
  const selection = selectionRef.value;
  if (!selection) return;
  const scale = displayScale();
  emit('selection-change', {
    width: Math.round(selection.width / scale),
    height: Math.round(selection.height / scale),
  });
}

// Exported at source resolution: `$toCanvas` alone returns a canvas sized in
// screen pixels, so the selection size is converted using the image's
// current display scale (see the cropperjs skill's export gotcha).
async function apply() {
  const selection = selectionRef.value;
  if (!selection) return;
  const scale = displayScale();
  const width = Math.round(selection.width / scale);
  const height = Math.round(selection.height / scale);
  const canvas = await selection.$toCanvas({ width, height });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) editor.applyCrop(blob);
}

defineExpose({ apply });
</script>

<template>
  <cropper-canvas :key="src" class="cropper-canvas" background>
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
