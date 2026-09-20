<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useEditorStore } from '@/stores/editor';

const editor = useEditorStore();
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const isDragging = ref(false);
const error = ref<string | null>(null);

const showError = computed({
  get: () => error.value !== null,
  set: (value: boolean) => {
    if (!value) error.value = null;
  },
});

async function handleFiles(files: FileList | null) {
  const file = files?.[0] ?? null;
  if (!file) return;
  try {
    error.value = null;
    await editor.loadFile(file);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load this file.';
  }
}

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  void handleFiles(target.files);
  target.value = '';
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  void handleFiles(event.dataTransfer?.files ?? null);
}
</script>

<template>
  <div
    class="d-flex align-center justify-center"
    style="height: 100%"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <v-sheet
      class="d-flex flex-column align-center justify-center pa-10 ga-3 text-center dropzone"
      :class="{ 'dropzone--active': isDragging }"
    >
      <v-avatar color="rgba(255, 255, 255, 0.08)" size="80" class="mb-2">
        <v-icon icon="mdi-tray-arrow-up" size="36" color="primary" />
      </v-avatar>
      <h1 class="text-h5 font-weight-regular">Drop an image here</h1>
      <p class="text-body-1 text-medium-emphasis">or choose a file from your computer</p>
      <v-btn color="primary" size="large" prepend-icon="mdi-image" @click="fileInput?.click()">
        Choose image
      </v-btn>
      <p class="text-caption text-medium-emphasis mt-2">JPG, PNG or WebP</p>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="d-none"
        @change="onInputChange"
      />
    </v-sheet>
    <v-snackbar v-model="showError" color="error" timeout="4000">{{ error }}</v-snackbar>
  </div>
</template>

<style scoped>
.dropzone {
  width: 680px;
  max-width: 90vw;
  height: 420px;
  border: 2px dashed rgba(255, 255, 255, 0.28);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  transition: border-color 0.15s ease;
}
.dropzone--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(255, 255, 255, 0.06);
}
</style>
