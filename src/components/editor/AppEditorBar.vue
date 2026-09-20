<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditorStore } from '@/stores/editor';
import {
  downloadBlob,
  editDocumentToBlob,
  editedFileName,
  editedOpsFileName,
  renderToPngBlob,
} from '@/services/exportImage';
import { serializeEdits } from '@/services/editDocument';

const editor = useEditorStore();

const dimensionsLabel = computed(() => {
  const original = editor.original;
  if (!original) return '';
  const format = original.type.split('/')[1]?.toUpperCase() ?? 'IMAGE';
  return `${original.width} × ${original.height} px · ${format}`;
});

const exporting = ref(false);
const exportError = ref<string | null>(null);

const DOWNLOAD_GAP_MS = 300;

async function onExport() {
  const { original, image } = editor;
  if (!original || !image) return;
  exporting.value = true;
  try {
    const png = await renderToPngBlob(image, editor.ops);
    const doc = serializeEdits({
      source: { name: original.name, width: original.width, height: original.height, sha256: original.sha256 },
      adjustments: editor.adjustments,
      filter: editor.filter,
      crop: editor.crop,
    });
    downloadBlob(png, editedFileName(original.name));
    // Browsers may block back-to-back programmatic downloads, so space them out.
    await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_GAP_MS));
    downloadBlob(editDocumentToBlob(doc), editedOpsFileName(original.name));
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'Export failed.';
  } finally {
    exporting.value = false;
  }
}

const confirmReplace = ref(false);

function onReplace() {
  if (editor.hasEdits) {
    confirmReplace.value = true;
  } else {
    editor.dispose();
  }
}

function onConfirmReplace() {
  confirmReplace.value = false;
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

  <v-dialog v-model="confirmReplace" max-width="440">
    <v-card title="Upload a new image?">
      <v-card-text>
        Your edits (crop, adjustments, filter) will be lost. Export first if you want to keep the result.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmReplace = false">Cancel</v-btn>
        <v-btn color="error" variant="flat" @click="onConfirmReplace">Discard &amp; upload new</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar :model-value="exportError !== null" color="error" timeout="4000" @update:model-value="exportError = null">
    {{ exportError }}
  </v-snackbar>
</template>
