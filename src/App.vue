<script setup lang="ts">
import AppEditorBar from './components/editor/AppEditorBar.vue';
import EditorLayout from './components/editor/EditorLayout.vue';
</script>

<template>
  <v-app>
    <AppEditorBar />
    <v-main>
      <div style="height: calc(100dvh - 64px)">
        <EditorLayout />
      </div>
    </v-main>
  </v-app>
</template>
