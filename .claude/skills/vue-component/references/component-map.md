# Component map

```
src/
├── App.vue                         v-app shell: AppEditorBar + v-main > EditorLayout
├── components/
│   └── editor/
│       ├── AppEditorBar.vue        v-app-bar: file info, Edited chip, Replace/Reset/Export
│       ├── EditorLayout.vue        layout: empty state vs editor (drawer + stage), owns crop-session UI state
│       ├── ImageUpload.vue         drop zone + hidden file input → store.loadFile(file)
│       ├── EditorStage.vue         switches by store.mode: CropperPanel | ImagePreview; owns zoom state; renders StageToolbar
│       ├── StageToolbar.vue        reusable: zoom in/out/fit + View original (props/emits, no store)
│       ├── CropperPanel.vue        cropper (see cropperjs skill); apply() exposed, calls store.applyCrop
│       ├── CropPanel.vue           drawer content for the Crop tab: aspect ratio chips, output size, Cancel/Apply
│       ├── ImagePreview.vue        <img :src="previewUrl" :style="{ filter: previewFilter }">
│       ├── AdjustmentsPanel.vue    3 × AdjustmentSlider + FilterPicker bound to store
│       ├── AdjustmentSlider.vue    reusable: label + v-slider + value box + reset (defineModel, no store)
│       └── FilterPicker.vue        v-chip-group over FILTERS → store.setFilter
├── services/
│   ├── imageFilters.ts             Adjustments/FilterId types, buildCssFilter(), isDefault()
│   ├── exportImage.ts              renderToBlob/downloadBlob/editedFileName (DOM/canvas)
│   └── aspectRatios.ts             ASPECT_RATIOS, resolveAspectRatio(), formatRatioLabel()
└── stores/
    └── editor.ts                   useEditorStore
```

## Data flow

```
ImageUpload ──loadFile──▶ store
                            │
      AdjustmentsPanel ──setAdjustment──▶ store
      FilterPicker ──setFilter──▶ store
      AppEditorBar ──resetAll / dispose──▶ store
      EditorStage ──toggleOriginal──▶ store
                            │
                            ▼
      EditorStage reads store.mode to switch CropperPanel | ImagePreview
      ImagePreview reads previewUrl + previewFilter (props from EditorStage)
      AppEditorBar reads workingUrl + cssFilter → exportImage service → download

Crop session (aspect ratio id, live output size) is local state in
EditorLayout, not in the store — it's ephemeral UI state for the Crop tab,
not part of the non-destructive edit model:

EditorLayout (aspectId, cropSize)
  ├─▶ CropPanel (props: aspectId, cropSize, originalRatioLabel)
  │     emits select-aspect / cancel / apply ──▶ EditorLayout
  └─▶ EditorStage (prop: aspectRatio) ──▶ CropperPanel (prop: aspectRatio)
        CropperPanel emits selection-change ──▶ EditorStage ──▶ EditorLayout (cropSize)
        EditorLayout.applyCrop() calls stage.applyCrop() → cropperPanel.apply()
        → CropperPanel exports at natural size and calls store.applyCrop(blob)
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
