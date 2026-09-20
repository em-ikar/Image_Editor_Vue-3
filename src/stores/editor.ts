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

export type EditorMode = 'crop' | 'adjust';

function readSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode this image.'));
    img.src = url;
  });
}

export const useEditorStore = defineStore('editor', () => {
  const original = ref<OriginalImage | null>(null);
  const croppedUrl = ref<string | null>(null);
  const adjustments = ref<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
  const filter = ref<FilterId>('none');
  const mode = ref<EditorMode>('adjust');
  const showOriginal = ref(false);

  const hasImage = computed(() => original.value !== null);
  const workingUrl = computed(() => croppedUrl.value ?? original.value?.url ?? null);
  const cssFilter = computed(() => buildCssFilter(adjustments.value, filter.value));
  const hasAdjustmentEdits = computed(() => !isDefault(adjustments.value, filter.value));
  const hasEdits = computed(() => croppedUrl.value !== null || hasAdjustmentEdits.value);
  const previewUrl = computed(() => (showOriginal.value ? (original.value?.url ?? null) : workingUrl.value));
  const previewFilter = computed(() => (showOriginal.value ? '' : cssFilter.value));

  function revoke(url: string | null | undefined) {
    if (url) URL.revokeObjectURL(url);
  }

  async function loadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please choose a JPG, PNG or WebP image.');
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
    adjustments.value = { ...adjustments.value, [key]: value };
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
    mode.value = 'adjust';
  }

  function toggleOriginal(value = !showOriginal.value) {
    showOriginal.value = value;
  }

  function setMode(value: EditorMode) {
    mode.value = value;
  }

  function dispose() {
    clearCrop();
    revoke(original.value?.url);
    original.value = null;
    resetAdjustments();
    showOriginal.value = false;
    mode.value = 'adjust';
  }

  return {
    // state
    original,
    croppedUrl,
    adjustments,
    filter,
    mode,
    showOriginal,
    // getters
    hasImage,
    workingUrl,
    cssFilter,
    hasAdjustmentEdits,
    hasEdits,
    previewUrl,
    previewFilter,
    // actions
    loadFile,
    applyCrop,
    clearCrop,
    setAdjustment,
    setFilter,
    resetAdjustments,
    resetAll,
    toggleOriginal,
    setMode,
    dispose,
  };
});
