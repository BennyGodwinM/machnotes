<script setup lang="ts">
type CategoryNode = {
  id: string;
  name: string;
  fullSlugPath: string;
  children: CategoryNode[];
};

defineProps<{ nodes: CategoryNode[] }>();
</script>

<template>
  <template v-for="node in nodes" :key="node.id">
    <UButton
      :to="`/category/${node.fullSlugPath}`"
      color="neutral"
      variant="soft"
      size="sm"
      :label="node.name"
    />
    <CategoryTree v-if="node.children.length" :nodes="node.children" />
  </template>
</template>
