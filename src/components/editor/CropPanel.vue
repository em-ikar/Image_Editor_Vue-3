<script setup lang="ts">
import { ASPECT_RATIOS, type AspectId } from '@/services/aspectRatios';

const { aspectId, cropSize, originalRatioLabel } = defineProps<{
  aspectId: AspectId;
  cropSize: { width: number; height: number } | null;
  originalRatioLabel: string;
}>();

const emit = defineEmits<{
  'select-aspect': [id: AspectId];
  cancel: [];
  apply: [];
}>();

function labelFor(id: AspectId, fallback: string): string {
  return id === 'original' ? originalRatioLabel : fallback;
}
</script>

<template>
  <div class="d-flex flex-column" style="height: 100%">
    <div class="flex-grow-1 pa-6 d-flex flex-column ga-5" style="overflow-y: auto; min-height: 0">
      <div class="text-overline text-medium-emphasis">Aspect ratio</div>
      <div class="ratio-grid" role="radiogroup" aria-label="Aspect ratio">
        <v-btn
          v-for="ratio in ASPECT_RATIOS"
          :key="ratio.id"
          role="radio"
          :aria-checked="ratio.id === aspectId"
          :variant="ratio.id === aspectId ? 'flat' : 'outlined'"
          :color="ratio.id === aspectId ? 'primary' : undefined"
          rounded="pill"
          size="large"
          @click="emit('select-aspect', ratio.id)"
        >
          {{ labelFor(ratio.id, ratio.label) }}
        </v-btn>
      </div>

      <div class="text-overline text-medium-emphasis mt-2">Output size</div>
      <div class="d-flex align-center ga-3">
        <v-text-field
          label="Width, px"
          variant="outlined"
          readonly
          density="comfortable"
          hide-details
          style="font-variant-numeric: tabular-nums"
          :model-value="cropSize ? String(cropSize.width) : ''"
        />
        <span class="text-medium-emphasis">×</span>
        <v-text-field
          label="Height, px"
          variant="outlined"
          readonly
          density="comfortable"
          hide-details
          style="font-variant-numeric: tabular-nums"
          :model-value="cropSize ? String(cropSize.height) : ''"
        />
      </div>
      <p class="text-body-2 text-medium-emphasis">
        Drag the frame or its handles on the image. The crop is stored as a rectangle in original-image
        pixels.
      </p>
    </div>
    <div class="pa-4 d-flex ga-3" style="border-top: 1px solid rgba(255, 255, 255, 0.12)">
      <v-btn class="flex-grow-1" variant="text" size="large" @click="emit('cancel')">Cancel</v-btn>
      <v-btn class="flex-grow-1" color="primary" size="large" @click="emit('apply')">Apply crop</v-btn>
    </div>
  </div>
</template>

<style scoped>
.ratio-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
</style>
