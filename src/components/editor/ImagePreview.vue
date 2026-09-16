<script setup lang="ts">
const { src, filter, scale = 1 } = defineProps<{
  src: string;
  filter: string;
  scale?: number;
}>();

defineEmits<{ load: [event: Event] }>();
</script>

<template>
  <img
    :src="src"
    alt="Edited preview of the uploaded image"
    :style="{
      filter,
      display: 'block',
      maxWidth: '100%',
      maxHeight: '100%',
      transform: `scale(${scale})`,
    }"
    @load="$emit('load', $event)"
  />
</template>
