<script setup lang="ts">
defineProps<{
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: string | null;
    category?: { name: string; fullSlugPath: string };
  };
}>();
</script>

<template>
  <NuxtLink :to="`/article/${article.slug}`" class="group block">
    <UCard
      class="h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:ring-1 hover:ring-primary/30"
    >
      <div class="flex items-center gap-2 text-sm text-muted">
        <UBadge v-if="article.category" color="neutral" variant="subtle" size="sm">
          {{ article.category.name }}
        </UBadge>
        <span v-if="article.publishedAt">{{ new Date(article.publishedAt).toLocaleDateString() }}</span>
      </div>
      <h2 class="mt-2 text-lg font-semibold text-highlighted transition-colors group-hover:text-primary">
        {{ article.title }}
      </h2>
      <p v-if="article.excerpt" class="mt-1 text-muted">{{ article.excerpt }}</p>
    </UCard>
  </NuxtLink>
</template>
