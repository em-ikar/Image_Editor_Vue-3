import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { DEFAULT_ADJUSTMENTS, isDefault, type Adjustments, type FilterId } from '@/services/imageFilters';
import { isFullCrop, opsToState, stateToOps } from '@/services/editDocument';
import { parseEditDocumentText } from '@/services/parseEditDocument';
import { planApply } from '@/services/planApply';
import { sha256Hex } from '@/services/sha256';
import type { CropRect, EditDocument } from '@/types/operations';

export interface OriginalImage {
  name: string;
  type: string;
  url: string;
  width: number;
  height: number;
  sha256: string;
}

export type EditorMode = 'crop' | 'adjust' | 'operations';

function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode this image.'));
    img.src = url;
  });
}

export const useEditorStore = defineStore('editor', () => {
  const original = ref<OriginalImage | null>(null);
  // Decoded original for rendering. Shallow so Vue never proxies the DOM element.
  const image = shallowRef<HTMLImageElement | null>(null);
  const crop = ref<CropRect | null>(null);
  const adjustments = ref<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
  const filter = ref<FilterId>('none');
  const mode = ref<EditorMode>('adjust');
  const showOriginal = ref(false);

  // Imported operations file. Survives image uploads; only clearOperations() removes it.
  const importedDoc = ref<EditDocument | null>(null);
  const importedFileName = ref<string | null>(null);
  const importErrors = ref<string[]>([]);
  const importResult = ref<{ warnings: string[] } | null>(null);

  const hasImage = computed(() => original.value !== null);
  // The list of operations is the single source of truth for what the image looks like.
  const ops = computed(() =>
    original.value
      ? stateToOps({ adjustments: adjustments.value, filter: filter.value, crop: crop.value }, original.value)
      : [],
  );
  const hasAdjustmentEdits = computed(() => !isDefault(adjustments.value, filter.value));
  const hasEdits = computed(() => ops.value.length > 0);
  // What applying the imported file to the loaded image would do (null until both exist).
  const importPlan = computed(() =>
    importedDoc.value && original.value ? planApply(importedDoc.value, original.value) : null,
  );

  function revoke(url: string | null | undefined) {
    if (url) URL.revokeObjectURL(url);
  }

  async function loadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please choose a JPG, PNG or WebP image.');
    }
    const url = URL.createObjectURL(file);
    try {
      const [decoded, sha256] = await Promise.all([decodeImage(url), sha256Hex(file)]);
      dispose();
      image.value = decoded;
      original.value = {
        name: file.name,
        type: file.type,
        url,
        width: decoded.naturalWidth,
        height: decoded.naturalHeight,
        sha256,
      };
      leaveCropMode();
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function applyCrop(rect: CropRect) {
    const source = original.value;
    crop.value = source && isFullCrop(rect, source) ? null : rect;
    mode.value = 'adjust';
  }

  function clearCrop() {
    crop.value = null;
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
    leaveCropMode();
  }

  function toggleOriginal(value = !showOriginal.value) {
    showOriginal.value = value;
  }

  // Only crop mode depends on an image; the other tabs stay put on upload / reset.
  function leaveCropMode() {
    if (mode.value === 'crop') mode.value = 'adjust';
  }

  function setMode(value: EditorMode) {
    mode.value = value;
  }

  function dispose() {
    clearCrop();
    revoke(original.value?.url);
    original.value = null;
    image.value = null;
    resetAdjustments();
    showOriginal.value = false;
    importResult.value = null; // an "applied" message describes the image that was just replaced
    leaveCropMode();
  }

  async function loadOperationsFile(file: File) {
    importResult.value = null;
    importedFileName.value = file.name;
    try {
      const result = parseEditDocumentText(await file.text());
      importedDoc.value = result.ok ? result.doc : null;
      importErrors.value = result.ok ? [] : result.errors;
    } catch {
      importedDoc.value = null;
      importErrors.value = ['Could not read this file.'];
    }
  }

  function clearOperations() {
    importedDoc.value = null;
    importedFileName.value = null;
    importErrors.value = [];
    importResult.value = null;
  }

  /** Replaces the current edits with the imported operations. The original is untouched. */
  function applyOperations() {
    const plan = importPlan.value;
    if (!plan) return;
    const state = opsToState(plan.ops);
    adjustments.value = state.adjustments;
    filter.value = state.filter;
    crop.value = state.crop;
    showOriginal.value = false;
    importResult.value = { warnings: plan.warnings };
  }

  return {
    // state
    original,
    image,
    crop,
    adjustments,
    filter,
    mode,
    showOriginal,
    importedDoc,
    importedFileName,
    importErrors,
    importResult,
    // getters
    hasImage,
    ops,
    hasAdjustmentEdits,
    hasEdits,
    importPlan,
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
    loadOperationsFile,
    clearOperations,
    applyOperations,
    dispose,
  };
});
