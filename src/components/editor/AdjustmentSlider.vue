<script setup lang="ts">
import { ADJUSTMENT_RANGE, formatAdjustment } from '@/services/imageFilters';

const value = defineModel<number>({ required: true });

const { label, icon, defaultValue = 0 } = defineProps<{
  label: string;
  icon: string;
  defaultValue?: number;
}>();
</script>

<template>
  <div class="d-flex flex-column ga-1">
    <div class="d-flex align-center ga-3">
      <v-icon :icon="icon" size="20" color="medium-emphasis" />
      <label class="text-body-1 flex-grow-1">{{ label }}</label>
      <div class="value-box text-body-2">{{ formatAdjustment(value) }}</div>
      <v-btn
        icon="mdi-restore"
        variant="text"
        size="small"
        density="comfortable"
        :aria-label="`Reset ${label}`"
        :disabled="value === defaultValue"
        @click="value = defaultValue"
      />
    </div>
    <v-slider
      v-model="value"
      :min="ADJUSTMENT_RANGE.min"
      :max="ADJUSTMENT_RANGE.max"
      :step="ADJUSTMENT_RANGE.step"
      color="primary"
      thumb-label
      hide-details
      :aria-label="label"
    />
  </div>
</template>

<style scoped>
.value-box {
  min-width: 48px;
  height: 32px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}
</style>
