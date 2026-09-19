<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '@/stores/editor';
import type { Adjustments } from '@/services/imageFilters';
import AdjustmentSlider from './AdjustmentSlider.vue';
import FilterPicker from './FilterPicker.vue';

const editor = useEditorStore();

function bind(key: keyof Adjustments) {
  return computed({
    get: () => editor.adjustments[key],
    set: (v: number) => editor.setAdjustment(key, v),
  });
}

const brightness = bind('brightness');
const contrast = bind('contrast');
const saturation = bind('saturation');
</script>

<template>
  <div class="d-flex flex-column" style="height: 100%">
    <div class="flex-grow-1 pa-6 d-flex flex-column ga-6" style="overflow-y: auto; min-height: 0">
      <div class="text-overline text-medium-emphasis">Light &amp; color</div>

      <AdjustmentSlider v-model="brightness" label="Brightness" icon="mdi-brightness-6" />
      <AdjustmentSlider v-model="contrast" label="Contrast" icon="mdi-contrast-circle" />
      <AdjustmentSlider v-model="saturation" label="Saturation" icon="mdi-water" />

      <div class="text-overline text-medium-emphasis">Filter</div>
      <FilterPicker />

      <!-- <v-alert class="flex-0-0" type="info" variant="tonal" density="compact"> -->
      <v-alert class="flex-0-0" color="#2f2f2f" type="info" style="color: #c3c3c3;" density="compact">
        Edits are non-destructive. The original file stays untouched until you export.
      </v-alert>
    </div>
    <div class="pa-4" style="border-top: 1px solid rgba(255, 255, 255, 0.12)">
      <v-btn
        block
        variant="outlined"
        size="large"
        :disabled="!editor.hasAdjustmentEdits"
        @click="editor.resetAdjustments()"
      >
        Reset adjustments
      </v-btn>
    </div>
  </div>
</template>
