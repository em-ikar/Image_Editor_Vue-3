<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '@/stores/editor';
import CropperPanel from './CropperPanel.vue';
import ImagePreview from './ImagePreview.vue';
import StageToolbar from './StageToolbar.vue';

defineProps<{ aspectRatio: number }>();

const emit = defineEmits<{
  'selection-change': [size: { width: number; height: number }];
}>();

const editor = useEditorStore();
const { original, crop, mode, showOriginal } = storeToRefs(editor);

const stageEl = useTemplateRef<HTMLDivElement>('stageEl');
const cropperPanel = useTemplateRef<InstanceType<typeof CropperPanel>>('cropperPanel');

const stageSize = ref({ width: 0, height: 0 });
let observer: ResizeObserver | undefined;

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    stageSize.value = { width: entry.contentRect.width, height: entry.contentRect.height };
  });
  if (stageEl.value) observer.observe(stageEl.value);
});

onBeforeUnmount(() => observer?.disconnect());

// Natural size of the image on screen: the whole original while comparing,
// otherwise the crop rectangle (if any).
const naturalSize = computed(() => (showOriginal.value ? original.value : (crop.value ?? original.value)));

const fitScale = computed(() => {
  if (!naturalSize.value || !stageSize.value.width || !stageSize.value.height) return 1;
  return Math.min(
    stageSize.value.width / naturalSize.value.width,
    stageSize.value.height / naturalSize.value.height,
    1,
  );
});
const fitPercent = computed(() => Math.max(1, Math.round(fitScale.value * 100)));

const zoomOverride = ref<number | null>(null);

// A crop changes the image size: drop the zoom override so it starts back at "Fit".
watch(crop, () => {
  zoomOverride.value = null;
});

const zoomPercent = computed(() => zoomOverride.value ?? fitPercent.value);
const isFit = computed(() => zoomOverride.value === null);
// Size of the preview when fitted to the stage, in CSS pixels.
const fitSize = computed(() => ({
  width: Math.round((naturalSize.value?.width ?? 0) * fitScale.value),
  height: Math.round((naturalSize.value?.height ?? 0) * fitScale.value),
}));
// Scale applied on top of the fitted size, so 1 = exactly at fitPercent.
const relativeZoom = computed(() =>
  zoomOverride.value === null ? 1 : zoomOverride.value / 100 / fitScale.value,
);

function zoomIn() {
  zoomOverride.value = Math.min(400, zoomPercent.value + 10);
}
function zoomOut() {
  zoomOverride.value = Math.max(1, zoomPercent.value - 10);
}
function zoomToFit() {
  zoomOverride.value = null;
}

function applyCrop() {
  return cropperPanel.value?.apply();
}

defineExpose({ applyCrop });
</script>

<template>
  <div class="d-flex flex-column" style="flex: 1 1 auto; min-height: 0">
    <div
      ref="stageEl"
      class="flex-grow-1 d-flex align-center justify-center pa-8"
      style="min-height: 0; overflow: auto; position: relative"
    >
      <template v-if="original">
        <CropperPanel
          v-if="mode === 'crop'"
          ref="cropperPanel"
          :src="original.url"
          :aspect-ratio="aspectRatio"
          @selection-change="(size) => emit('selection-change', size)"
        />
        <div v-else style="position: relative">
          <div v-if="showOriginal" class="original-badge">
            <v-icon icon="mdi-eye-outline" size="16" />
            Original
          </div>
          <ImagePreview :width="fitSize.width" :height="fitSize.height" :scale="relativeZoom" />
        </div>
      </template>
    </div>
    <StageToolbar
      :zoom-percent="zoomPercent"
      :is-fit="isFit"
      :zoom-disabled="mode === 'crop'"
      :show-original="showOriginal"
      :view-original-disabled="mode === 'crop'"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @zoom-fit="zoomToFit"
      @toggle-original="editor.toggleOriginal()"
    />
  </div>
</template>

<style scoped>
.original-badge {
  position: absolute;
  left: 16px;
  top: 16px;
  z-index: 1;
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
