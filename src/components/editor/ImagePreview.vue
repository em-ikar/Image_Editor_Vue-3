<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { usePreviewRender } from '@/composables/usePreviewRender';

// width/height: CSS size (px) of the image when fitted to the stage.
const { width, height, scale = 1 } = defineProps<{
  width: number;
  height: number;
  scale?: number;
}>();

const canvasEl = useTemplateRef<HTMLCanvasElement>('canvasEl');
usePreviewRender(canvasEl);
</script>

<template>
  <canvas
    ref="canvasEl"
    role="img"
    aria-label="Edited preview of the uploaded image"
    :style="{
      display: 'block',
      width: `${width}px`,
      height: `${height}px`,
      transform: `scale(${scale})`,
    }"
  />
</template>
