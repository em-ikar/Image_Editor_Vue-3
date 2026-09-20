<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditorStore } from '@/stores/editor';
import { downloadBlob, editedFileName, renderToBlob } from '@/services/exportImage';

const editor = useEditorStore();

const dimensionsLabel = computed(() => {
  const original = editor.original;
  if (!original) return '';
  const format = original.type.split('/')[1]?.toUpperCase() ?? 'IMAGE';
  return `${original.width} × ${original.height} px · ${format}`;
});

const exporting = ref(false);
const exportError = ref<string | null>(null);

async function onExport() {
  const original = editor.original;
  if (!editor.workingUrl || !original) return;
  exporting.value = true;
  try {
    const blob = await renderToBlob(editor.workingUrl, editor.cssFilter, original.type);
    downloadBlob(blob, editedFileName(original.name));
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'Export failed.';
  } finally {
    exporting.value = false;
  }
}

function onReplace() {
  editor.dispose();
}
</script>

<template>
  <v-app-bar color="surface" elevation="4" height="77">
    <template #prepend>
      <v-avatar color="primary" rounded="lg" size="40" class="ml-2">
        <v-icon icon="mdi-image" color="white" />
      </v-avatar>
    </template>

    <v-app-bar-title class="flex-0-0">Image Editor</v-app-bar-title>

    <template v-if="editor.hasImage && editor.original">
      <v-divider vertical class="mx-5" />
      <div class="d-flex flex-column">
        <span class="text-body-2 font-weight-medium">{{ editor.original.name }}</span>
        <span class="text-caption text-medium-emphasis" style="font-variant-numeric: tabular-nums">
          {{ dimensionsLabel }}
        </span>
      </div>
      <v-chip v-if="editor.hasEdits" size="small" class="ml-3">Edited</v-chip>
    </template>

    <v-spacer />

    <v-btn v-if="editor.hasImage" variant="text" size="large" prepend-icon="mdi-tray-arrow-up" @click="onReplace">
      Upload New
    </v-btn>
    <v-btn
      variant="outlined"
      size="large"
      prepend-icon="mdi-restore"
      class="ml-2"
      :disabled="!editor.hasEdits"
      @click="editor.resetAll()"
    >
      Reset
    </v-btn>
    <v-btn
      color="primary"
      variant="flat"
      size="large"
      prepend-icon="mdi-tray-arrow-down"
      class="ml-2 mr-2"
      :disabled="!editor.hasImage"
      :loading="exporting"
      @click="onExport"
    >
      Export
    </v-btn>
  </v-app-bar>

  <v-snackbar :model-value="exportError !== null" color="error" timeout="4000" @update:model-value="exportError = null">
    {{ exportError }}
  </v-snackbar>
</template>
