<script setup lang="ts">
const { data: settings } = await useFetch("/api/settings");

useHead({
  htmlAttrs: { lang: "en" },
});

useSeoMeta({
  title: () => settings.value?.siteTitle ?? "MachNotes",
  description: () => settings.value?.siteDescription ?? "Notes on aerospace engineering.",
  ogTitle: () => settings.value?.siteTitle ?? "MachNotes",
  ogDescription: () => settings.value?.siteDescription ?? "Notes on aerospace engineering.",
});
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/">
          <AppLogo />
        </NuxtLink>
      </template>

      <template #right>
        <UButton to="/mindmap" icon="i-lucide-git-fork" color="neutral" variant="ghost" aria-label="Mind Map" />
        <UButton to="/search" icon="i-lucide-search" color="neutral" variant="ghost" aria-label="Search" />
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          {{ settings?.siteTitle ?? "MachNotes" }} &middot; {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
