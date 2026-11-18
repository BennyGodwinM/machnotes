<script setup lang="ts">
const { data } = await useFetch("/api/articles");
const { data: categoryData } = await useFetch("/api/categories/tree");

const [featured, ...rest] = computed(() => data.value?.articles ?? []).value;
</script>

<template>
  <div>
    <div class="relative overflow-hidden border-b border-default">
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--ui-primary)_0%,transparent_60%)] opacity-20"
      />
      <UContainer class="relative py-20 text-center">
        <div
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
          class="flex justify-center [&_svg]:h-10 [&_svg]:w-10 [&_span]:text-4xl [&_span]:sm:text-5xl"
        >
          <AppLogo />
        </div>
        <p
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 100 } }"
          class="mx-auto mt-4 max-w-xl text-lg text-muted"
        >
          Notes on aerospace engineering &mdash; propulsion, orbital mechanics, structures, and
          everything in between.
        </p>

        <div
          v-if="categoryData?.tree?.length"
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 200 } }"
          class="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          <CategoryTree :nodes="categoryData.tree" />
        </div>
      </UContainer>
    </div>

    <UContainer class="py-16">
      <div v-if="!data?.articles?.length" class="py-24 text-center text-muted">
        Nothing published yet.
      </div>

      <template v-else>
        <NuxtLink
          v-if="featured"
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 150 } }"
          :to="`/article/${featured.slug}`"
          class="group block"
        >
          <UCard
            class="overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:ring-1 hover:ring-primary/30"
          >
            <div class="flex items-center gap-2 text-sm text-muted">
              <UBadge v-if="featured.category" color="primary" variant="subtle" size="sm">
                {{ featured.category.name }}
              </UBadge>
              <span v-if="featured.publishedAt">{{ new Date(featured.publishedAt).toLocaleDateString() }}</span>
            </div>
            <h2 class="mt-3 text-2xl font-semibold text-highlighted transition-colors group-hover:text-primary">
              {{ featured.title }}
            </h2>
            <p v-if="featured.excerpt" class="mt-2 max-w-2xl text-muted">{{ featured.excerpt }}</p>
          </UCard>
        </NuxtLink>

        <div v-if="rest.length" class="mt-6 grid gap-6 sm:grid-cols-2">
          <ArticleCard
            v-for="(article, i) in rest"
            :key="article.id"
            v-motion
            :initial="{ opacity: 0, y: 24 }"
            :visible-once="{ opacity: 1, y: 0, transition: { duration: 400, delay: i * 60 } }"
            :article="article"
          />
        </div>
      </template>
    </UContainer>
  </div>
</template>
