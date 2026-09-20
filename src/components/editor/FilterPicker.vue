<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '@/stores/editor';
import { FILTERS, type FilterId } from '@/services/imageFilters';

const editor = useEditorStore();

const selected = computed<FilterId>({
  get: () => editor.filter,
  set: (id) => editor.setFilter(id),
});
</script>

<template>
  <v-chip-group v-model="selected" mandatory color="primary">
    <v-chip v-for="item in FILTERS" :key="item.id" :value="item.id" variant="outlined" filter>
      {{ item.label }}
    </v-chip>
  </v-chip-group>
</template>
