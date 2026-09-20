<script setup lang="ts">
defineProps<{
  zoomPercent: number;
  isFit: boolean;
  zoomDisabled: boolean;
  showOriginal: boolean;
  viewOriginalDisabled: boolean;
}>();

defineEmits<{
  'zoom-in': [];
  'zoom-out': [];
  'zoom-fit': [];
  'toggle-original': [];
}>();
</script>

<template>
  <div
    class="d-flex align-center ga-2 px-5 py-5"
    style="height: 77px; flex-shrink: 0; border-top: 1px solid rgba(255, 255, 255, 0.08)"
  >
    <div class="d-flex align-center zoom-group">
      <v-btn
        icon="mdi-minus"
        variant="text"
        size="large"
        :disabled="zoomDisabled"
        aria-label="Zoom out"
        @click="$emit('zoom-out')"
      />
      <v-btn variant="text" size="large" :disabled="zoomDisabled" class="zoom-label" @click="$emit('zoom-fit')">
        <span v-if="isFit">Fit · {{ zoomPercent }}%</span>
        <span v-else>{{ zoomPercent }}%</span>
      </v-btn>
      <v-btn
        icon="mdi-plus"
        variant="text"
        size="large"
        :disabled="zoomDisabled"
        aria-label="Zoom in"
        @click="$emit('zoom-in')"
      />
    </div>
    <v-spacer />
    <v-btn
      variant="outlined"
      size="large"
      prepend-icon="mdi-compare"
      :disabled="viewOriginalDisabled"
      @click="$emit('toggle-original')"
    >
      {{ showOriginal ? 'View edited' : 'View original' }}
    </v-btn>
  </div>
</template>

<style scoped>
.zoom-group {
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 4px;
  overflow: hidden;
}
.zoom-label {
  font-variant-numeric: tabular-nums;
  min-width: 88px;
}
</style>
