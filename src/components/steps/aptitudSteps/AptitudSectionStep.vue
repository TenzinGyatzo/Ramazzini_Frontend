<script setup lang="ts">
import { ref } from 'vue';
import { useSectionPinpoint } from '@/composables/useSectionPinpoint';

defineProps<{
  title: string;
}>();

const scrollRoot = ref<HTMLElement | null>(null);
useSectionPinpoint(scrollRoot);
</script>

<template>
  <div class="aptitud-section-step flex flex-col min-h-0 w-full">
    <h1 class="text-xl font-bold mb-3 text-gray-900 dark:text-slate-100 shrink-0">{{ title }}</h1>
    <div
      ref="scrollRoot"
      class="aptitud-section-scroll flex-1 min-h-0 overflow-y-auto max-h-[min(58vh,520px)] sm:max-h-[min(60vh,560px)] xl:max-h-[min(68vh,640px)] pr-1 space-y-1 border border-gray-100 dark:border-slate-700 rounded-lg bg-gray-50/40 dark:bg-slate-900/70 p-2 sm:p-3"
    >
      <slot />
    </div>
  </div>
</template>
