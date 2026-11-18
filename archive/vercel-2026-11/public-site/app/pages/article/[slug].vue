<script setup lang="ts">
const route = useRoute();
const slug = computed(() => String(route.params.slug));

const { data, error } = await useFetch(() => `/api/article/${slug.value}`);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: "Article not found" });
}

const article = computed(() => data.value!.article);

useSeoMeta({
  title: () => article.value.title,
  description: () => article.value.excerpt ?? undefined,
});
</script>

<template>
  <UContainer class="py-12">
    <article class="mx-auto max-w-2xl">
      <UBreadcrumb
        :items="[
          { label: 'Home', to: '/' },
          { label: article.category.name, to: `/category/${article.category.fullSlugPath}` },
        ]"
        class="mb-6"
      />

      <header
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 450 } }"
        class="mb-8"
      >
        <h1 class="text-3xl font-semibold text-highlighted">{{ article.title }}</h1>
        <p v-if="article.publishedAt" class="mt-2 text-sm text-muted">
          {{ new Date(article.publishedAt).toLocaleDateString(undefined, { dateStyle: "long" }) }}
        </p>
      </header>

      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 450, delay: 100 } }"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="typst-article" v-html="article.compiledHtml ?? ''" />
      </div>
    </article>
  </UContainer>
</template>
