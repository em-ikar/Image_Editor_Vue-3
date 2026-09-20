<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useEditorStore } from '@/stores/editor';
import { formatOp } from '@/services/editDocument';
import type { Op } from '@/types/operations';

const editor = useEditorStore();
const { importedDoc, importedFileName, importErrors, importResult, importPlan, hasImage, hasEdits } =
  storeToRefs(editor);

const OP_ICONS: Record<Op['type'], string> = {
  crop: 'mdi-crop',
  brightness: 'mdi-brightness-6',
  contrast: 'mdi-contrast-circle',
  saturation: 'mdi-water',
  filter: 'mdi-palette-outline',
};

const picked = ref<File | File[] | null>(null);

function onPick(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value;
  if (file) void editor.loadOperationsFile(file);
}

function onClear() {
  picked.value = null;
  editor.clearOperations();
}

const mismatch = computed(() => importPlan.value?.sourceMatches === false);
const confirmOpen = ref(false);

function onApply() {
  if (mismatch.value || hasEdits.value) confirmOpen.value = true;
  else commit();
}

function commit() {
  confirmOpen.value = false;
  editor.applyOperations();
}
</script>

<template>
  <div class="d-flex flex-column" style="height: 100%">
    <div class="flex-grow-1 pa-6 d-flex flex-column ga-6" style="overflow-y: auto; min-height: 0">
      <div class="text-overline text-medium-emphasis">Load operations</div>

      <v-file-input
        v-model="picked"
        label="Operations file (.ops.json)"
        accept=".json,application/json"
        prepend-icon=""
        prepend-inner-icon="mdi-code-json"
        variant="outlined"
        density="comfortable"
        class="flex-0-0"
        hide-details
        clearable
        @update:model-value="onPick"
        @click:clear="onClear"
      />

      <v-alert
        v-if="importErrors.length > 0"
        class="flex-0-0"
        type="error"
        variant="tonal"
        density="compact"
        title="Cannot use this file"
      >
        <ul class="pl-4">
          <li v-for="(message, index) in importErrors" :key="index">{{ message }}</li>
        </ul>
      </v-alert>

      <template v-if="importedDoc">
        <div class="d-flex align-center ga-2">
          <div class="text-overline text-medium-emphasis flex-grow-1">Loaded operations</div>
          <v-btn variant="text" size="small" prepend-icon="mdi-close" @click="onClear">Clear</v-btn>
        </div>

        <div class="d-flex flex-column ga-1">
          <span class="text-body-2 font-weight-medium">{{ importedFileName }}</span>
          <span class="text-caption text-medium-emphasis" style="font-variant-numeric: tabular-nums">
            Created for {{ importedDoc.source.name }} · {{ importedDoc.source.width }} ×
            {{ importedDoc.source.height }} px
          </span>
        </div>

        <div v-if="importPlan">
          <v-chip
            size="small"
            :color="importPlan.sourceMatches ? 'success' : 'warning'"
            :prepend-icon="importPlan.sourceMatches ? 'mdi-check-circle-outline' : 'mdi-alert-outline'"
          >
            {{ importPlan.sourceMatches ? 'Matches loaded image' : 'Created for a different image' }}
          </v-chip>
        </div>
        <div v-else class="text-body-2 text-medium-emphasis">Load an image to apply these operations.</div>

        <v-list density="compact" bg-color="transparent" class="pa-0">
          <v-list-item
            v-for="(op, index) in importedDoc.operations"
            :key="`${index}-${op.type}`"
            :prepend-icon="OP_ICONS[op.type]"
            :title="formatOp(op)"
          />
          <v-list-item v-if="importedDoc.operations.length === 0" title="No operations (unedited original)" />
        </v-list>
      </template>

      <template v-if="importResult">
        <v-alert class="flex-0-0" type="success" variant="tonal" density="compact">
          Operations applied to the loaded image.
        </v-alert>
        <v-alert
          v-for="(warning, index) in importResult.warnings"
          :key="index"
          class="flex-0-0"
          type="warning"
          variant="tonal"
          density="compact"
        >
          {{ warning }}
        </v-alert>
      </template>
    </div>

    <div class="pa-4" style="border-top: 1px solid rgba(255, 255, 255, 0.12)">
      <v-btn
        block
        color="primary"
        variant="flat"
        size="large"
        prepend-icon="mdi-check"
        :disabled="!hasImage || !importedDoc"
        @click="onApply"
      >
        Apply
      </v-btn>
    </div>
  </div>

  <v-dialog v-model="confirmOpen" max-width="480">
    <v-card :title="mismatch ? 'Different image' : 'Replace current edits?'">
      <v-card-text class="d-flex flex-column ga-3">
        <p v-if="mismatch && importedDoc">
          These operations were created for a different image ({{ importedDoc.source.name }}). The result may
          differ. If this is an already exported image, the operations will be applied a second time.
        </p>
        <p v-if="hasEdits">Current edits will be replaced.</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="commit">{{ mismatch ? 'Apply anyway' : 'Apply' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
