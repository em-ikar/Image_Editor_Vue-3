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
const { original, workingUrl, previewUrl, previewFilter, mode, showOriginal } = storeToRefs(editor);

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

// Tracks the natural size of whatever bitmap is actually on screen (the
// original or the cropped result), since cropping changes it.
const workingNaturalSize = ref<{ width: number; height: number } | null>(null);

function onPreviewLoad(event: Event) {
  const img = event.target as HTMLImageElement;
  workingNaturalSize.value = { width: img.naturalWidth, height: img.naturalHeight };
}

const naturalSize = computed(() => workingNaturalSize.value ?? original.value);

const fitPercent = computed(() => {
  if (!naturalSize.value || !stageSize.value.width || !stageSize.value.height) return 100;
  const scale = Math.min(
    stageSize.value.width / naturalSize.value.width,
    stageSize.value.height / naturalSize.value.height,
    1,
  );
  return Math.max(1, Math.round(scale * 100));
});

const zoomOverride = ref<number | null>(null);

// A crop replaces the working bitmap: drop the stale natural size and zoom
// override so the new result starts back at "Fit".
watch(workingUrl, () => {
  workingNaturalSize.value = null;
  zoomOverride.value = null;
});

const zoomPercent = computed(() => zoomOverride.value ?? fitPercent.value);
const isFit = computed(() => zoomOverride.value === null);
// Scale applied on top of the image's natural "fit" rendering (which already
// fills the stage via max-width/max-height), so 1 = exactly at fitPercent.
const relativeZoom = computed(() => zoomPercent.value / fitPercent.value);

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
          <ImagePreview
            :src="previewUrl ?? ''"
            :filter="previewFilter"
            :scale="relativeZoom"
            @load="onPreviewLoad"
          />
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
