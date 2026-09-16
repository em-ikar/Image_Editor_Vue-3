<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useEditorStore, type EditorMode } from '@/stores/editor';
import { formatRatioLabel, resolveAspectRatio, type AspectId } from '@/services/aspectRatios';
import ImageUpload from './ImageUpload.vue';
import EditorStage from './EditorStage.vue';
import AdjustmentsPanel from './AdjustmentsPanel.vue';
import CropPanel from './CropPanel.vue';

const editor = useEditorStore();

const aspectId = ref<AspectId>('free');
const cropSize = ref<{ width: number; height: number } | null>(null);
const stage = useTemplateRef<InstanceType<typeof EditorStage>>('stage');

const originalRatio = computed(() => {
  const original = editor.original;
  return original ? original.width / original.height : 1;
});

const originalRatioLabel = computed(() => {
  const original = editor.original;
  return original ? formatRatioLabel(original.width, original.height) : 'Original';
});

const aspectRatio = computed(() => resolveAspectRatio(aspectId.value, originalRatio.value));

function selectAspect(id: AspectId) {
  aspectId.value = id;
}

function onSelectionChange(size: { width: number; height: number }) {
  cropSize.value = size;
}

function applyCrop() {
  void stage.value?.applyCrop();
}

function cancelCrop() {
  editor.setMode('adjust');
}

function onTabChange(value: unknown) {
  editor.setMode(value as EditorMode);
}
</script>

<template>
  <div class="d-flex" style="height: 100%">
    <div class="flex-grow-1 d-flex flex-column" style="min-width: 0">
      <ImageUpload v-if="!editor.hasImage" />
      <EditorStage
        v-else
        ref="stage"
        :aspect-ratio="aspectRatio"
        @selection-change="onSelectionChange"
      />
    </div>

    <v-navigation-drawer location="right" width="380" permanent>
      <div class="d-flex flex-column" style="height: 100%">
        <div
          v-if="!editor.hasImage"
          class="d-flex flex-column align-center justify-center text-center pa-8 ga-3"
          style="height: 100%"
        >
          <div class="text-subtitle-1 font-weight-medium">No image yet</div>
          <div class="text-body-2 text-medium-emphasis">
            Crop and adjustment tools appear once an image is loaded.
          </div>
        </div>

        <template v-else>
          <v-tabs :model-value="editor.mode" grow @update:model-value="onTabChange">
            <v-tab value="crop" prepend-icon="mdi-crop">Crop</v-tab>
            <v-tab value="adjust" prepend-icon="mdi-tune-variant">Adjust</v-tab>
          </v-tabs>

          <div class="flex-grow-1" style="min-height: 0">
            <CropPanel
              v-if="editor.mode === 'crop'"
              :aspect-id="aspectId"
              :crop-size="cropSize"
              :original-ratio-label="originalRatioLabel"
              @select-aspect="selectAspect"
              @cancel="cancelCrop"
              @apply="applyCrop"
            />
            <AdjustmentsPanel v-else />
          </div>
        </template>
      </div>
    </v-navigation-drawer>
  </div>
</template>
