<script setup lang="ts">
withDefaults(defineProps<{ showWordmark?: boolean }>(), { showWordmark: true });
</script>

<template>
  <span class="inline-flex items-center gap-2 text-highlighted">
    <!-- Minimal mark: a jet/dart silhouette in flight. -->
    <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 14 L22 7 L15 10.5 L22 17 L13 13.5 L9 19 L10 13 Z" fill="currentColor" />
    </svg>
    <span v-if="showWordmark" class="font-semibold tracking-tight">MachNotes</span>
  </span>
</template>
