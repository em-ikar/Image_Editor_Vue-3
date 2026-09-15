# Reference implementation

Adapt names if the project differs, but keep the split:
pure filter builder → store → DOM-only export service.

## src/services/imageFilters.ts

```ts
export type FilterId = 'none' | 'grayscale' | 'sepia';

export interface Adjustments {
  brightness: number; // %, 100 = unchanged
  contrast: number;   // %, 100 = unchanged
  saturation: number; // %, 100 = unchanged
}

export const DEFAULT_ADJUSTMENTS: Readonly<Adjustments> = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
});

export const FILTERS: ReadonlyArray<{ id: FilterId; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'grayscale', label: 'Greyscale' },
  { id: 'sepia', label: 'Sepia' },
];

const FILTER_CSS: Record<FilterId, string> = {
  none: '',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(100%)',
};

/** Single source of truth for preview (style.filter) AND export (ctx.filter). */
export function buildCssFilter(a: Adjustments, filter: FilterId): string {
  const parts = [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
    FILTER_CSS[filter],
  ].filter(Boolean);
  return parts.join(' ');
}

export function isDefault(a: Adjustments, filter: FilterId): boolean {
  return (
    a.brightness === DEFAULT_ADJUSTMENTS.brightness &&
    a.contrast === DEFAULT_ADJUSTMENTS.contrast &&
    a.saturation === DEFAULT_ADJUSTMENTS.saturation &&
    filter === 'none'
  );
}
```

## src/stores/editor.ts

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  DEFAULT_ADJUSTMENTS,
  buildCssFilter,
  isDefault,
  type Adjustments,
  type FilterId,
} from '@/services/imageFilters';

export interface OriginalImage {
  name: string;
  type: string;
  url: string;
  width: number;
  height: number;
}

function readSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Cannot decode image'));
    img.src = url;
  });
}

export const useEditorStore = defineStore('editor', () => {
  const original = ref<OriginalImage | null>(null);
  const croppedUrl = ref<string | null>(null);
  const adjustments = ref<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
  const filter = ref<FilterId>('none');
  const mode = ref<'crop' | 'adjust'>('adjust');
  const showOriginal = ref(false);

  const hasImage = computed(() => original.value !== null);
  const workingUrl = computed(() => croppedUrl.value ?? original.value?.url ?? null);
  const cssFilter = computed(() => buildCssFilter(adjustments.value, filter.value));
  const hasEdits = computed(
    () => croppedUrl.value !== null || !isDefault(adjustments.value, filter.value),
  );
  const previewUrl = computed(() =>
    showOriginal.value ? original.value?.url ?? null : workingUrl.value,
  );
  const previewFilter = computed(() => (showOriginal.value ? 'none' : cssFilter.value));

  function revoke(url: string | null | undefined) {
    if (url) URL.revokeObjectURL(url);
  }

  async function loadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Unsupported file type');
    }
    const url = URL.createObjectURL(file);
    try {
      const size = await readSize(url);
      dispose();
      original.value = { name: file.name, type: file.type, url, ...size };
      mode.value = 'adjust';
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function applyCrop(blob: Blob) {
    revoke(croppedUrl.value);
    croppedUrl.value = URL.createObjectURL(blob);
    mode.value = 'adjust';
  }

  function clearCrop() {
    revoke(croppedUrl.value);
    croppedUrl.value = null;
  }

  function setAdjustment(key: keyof Adjustments, value: number) {
    adjustments.value[key] = value;
  }

  function setFilter(id: FilterId) {
    filter.value = id;
  }

  function resetAdjustments() {
    adjustments.value = { ...DEFAULT_ADJUSTMENTS };
    filter.value = 'none';
  }

  function resetAll() {
    clearCrop();
    resetAdjustments();
    showOriginal.value = false;
  }

  function toggleOriginal(value = !showOriginal.value) {
    showOriginal.value = value;
  }

  function dispose() {
    clearCrop();
    revoke(original.value?.url);
    original.value = null;
    resetAdjustments();
    showOriginal.value = false;
  }

  return {
    // state (return all of it for DevTools)
    original, croppedUrl, adjustments, filter, mode, showOriginal,
    // getters
    hasImage, workingUrl, cssFilter, hasEdits, previewUrl, previewFilter,
    // actions
    loadFile, applyCrop, clearCrop, setAdjustment, setFilter,
    resetAdjustments, resetAll, toggleOriginal, dispose,
  };
});
```

## src/services/exportImage.ts

```ts
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Cannot load image for export'));
    img.src = url;
  });
}

export async function renderToBlob(
  url: string,
  cssFilter: string,
  type = 'image/png',
  quality?: number,
): Promise<Blob> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');

  ctx.filter = cssFilter || 'none'; // same string as the preview
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))), type, quality);
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function editedFileName(originalName: string, ext = 'png') {
  const base = originalName.replace(/\.[^.]+$/, '');
  return `${base}-edited.${ext}`;
}
```

## Usage in a component

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '@/stores/editor';
import { downloadBlob, editedFileName, renderToBlob } from '@/services/exportImage';

const editor = useEditorStore();
const { previewUrl, previewFilter, hasEdits } = storeToRefs(editor);

const brightness = computed({
  get: () => editor.adjustments.brightness,
  set: (v: number) => editor.setAdjustment('brightness', v),
});

async function onExport() {
  if (!editor.workingUrl || !editor.original) return;
  const blob = await renderToBlob(editor.workingUrl, editor.cssFilter);
  downloadBlob(blob, editedFileName(editor.original.name));
}
</script>

<template>
  <img v-if="previewUrl" :src="previewUrl" :style="{ filter: previewFilter }" alt="Preview" />
  <v-slider v-model="brightness" label="Brightness" :min="0" :max="200" :step="1" />
  <v-btn :disabled="!hasEdits" @click="editor.resetAll()">Reset</v-btn>
  <v-btn @click="onExport">Download</v-btn>
</template>
```
