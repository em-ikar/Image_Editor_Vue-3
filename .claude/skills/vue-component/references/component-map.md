# Component map

```
src/
├── App.vue                         v-app shell, renders EditorLayout
├── components/
│   └── editor/
│       ├── EditorLayout.vue        layout only: empty state vs editor (sidebar + stage)
│       ├── ImageUpload.vue         v-file-input / drop zone → store.loadFile(file)
│       ├── EditorStage.vue         switches by store.mode: CropperPanel | ImagePreview
│       ├── CropperPanel.vue        cropper (see cropperjs skill), Apply/Cancel → store.applyCrop
│       ├── ImagePreview.vue        <img :src="previewUrl" :style="{ filter: previewFilter }">
│       ├── AdjustmentsPanel.vue    3 × AdjustmentSlider bound to store adjustments
│       ├── AdjustmentSlider.vue    reusable: label + v-slider + value + reset (defineModel, no store)
│       ├── FilterPicker.vue        v-chip-group / v-btn-toggle over FILTERS → store.setFilter
│       └── EditorToolbar.vue       Crop, View original, Reset, Download (export service)
```

## Data flow

```
ImageUpload ──loadFile──▶ store ◀──applyCrop── CropperPanel
                            │
      AdjustmentsPanel ──setAdjustment──▶ store
      FilterPicker ──setFilter──▶ store
      EditorToolbar ──toggleOriginal / resetAll / mode──▶ store
                            │
                            ▼
      ImagePreview reads previewUrl + previewFilter
      EditorToolbar reads workingUrl + cssFilter → exportImage service → download
```

## Example: reusable slider (no store)

```vue
<script setup lang="ts">
const value = defineModel<number>({ required: true });

const { label, min = 0, max = 200, defaultValue = 100 } = defineProps<{
  label: string;
  min?: number;
  max?: number;
  defaultValue?: number;
}>();
</script>

<template>
  <div class="d-flex align-center ga-2">
    <v-slider
      v-model="value"
      :label="label"
      :min="min"
      :max="max"
      :step="1"
      thumb-label
      hide-details
      class="flex-grow-1"
    />
    <span class="text-body-2" style="min-width: 3.5ch">{{ value }}%</span>
    <v-btn
      icon="mdi-restore"
      size="small"
      variant="text"
      :aria-label="`Reset ${label}`"
      :disabled="value === defaultValue"
      @click="value = defaultValue"
    />
  </div>
</template>
```

## Example: feature panel (uses store)

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '@/stores/editor';
import type { Adjustments } from '@/services/imageFilters';
import AdjustmentSlider from './AdjustmentSlider.vue';

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
  <v-card title="Adjustments" :disabled="!editor.hasImage">
    <v-card-text class="d-flex flex-column ga-4">
      <AdjustmentSlider v-model="brightness" label="Brightness" />
      <AdjustmentSlider v-model="contrast" label="Contrast" />
      <AdjustmentSlider v-model="saturation" label="Saturation" />
    </v-card-text>
  </v-card>
</template>
```
