<script setup lang="ts">
const route = useRoute();
const path = computed(() =>
  Array.isArray(route.params.slugPath) ? route.params.slugPath.join("/") : String(route.params.slugPath)
);

const { data, error } = await useFetch(() => `/api/category/${path.value}`);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: "Category not found" });
}

const breadcrumbLinks = computed(
  () => data.value?.breadcrumbs.map((b) => ({ label: b.name, to: `/category/${b.fullSlugPath}` })) ?? []
);
</script>

<template>
  <UContainer class="py-12">
    <UBreadcrumb
      :items="[{ label: 'Home', to: '/' }, ...breadcrumbLinks]"
      class="mb-6"
    />

    <h1 class="text-2xl font-semibold text-highlighted">{{ data?.category.name }}</h1>

    <div v-if="data?.children.length" class="mt-6 flex flex-wrap gap-2">
      <UButton
        v-for="child in data.children"
        :key="child.id"
        :to="`/category/${child.fullSlugPath}`"
        color="neutral"
        variant="soft"
        size="sm"
        :label="child.name"
      />
    </div>

    <div v-if="!data?.articles.length" class="mt-10 text-muted">
      No articles in this category yet.
    </div>

    <div v-else class="mt-10 grid gap-6 sm:grid-cols-2">
      <ArticleCard v-for="article in data.articles" :key="article.id" :article="article" />
    </div>
  </UContainer>
</template>
