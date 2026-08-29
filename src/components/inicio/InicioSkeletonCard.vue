<script setup lang="ts">
defineProps<{
  label?: string;
  variant?: 'metric' | 'list';
}>();
</script>

<template>
  <div
    class="animate-pulse rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    :aria-label="label ?? 'Cargando'"
  >
    <template v-if="variant === 'list'">
      <div class="h-5 w-40 rounded bg-gray-200 dark:bg-slate-600" />
      <div class="mt-4 flex gap-3">
        <div class="h-10 w-10 rounded-lg bg-gray-200 dark:bg-slate-600" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-600" />
          <div class="h-3 w-1/2 rounded bg-gray-100 dark:bg-slate-700" />
        </div>
      </div>
      <div class="mt-3 flex gap-3">
        <div class="h-10 w-10 rounded-lg bg-gray-200 dark:bg-slate-600" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-2/3 rounded bg-gray-200 dark:bg-slate-600" />
          <div class="h-3 w-1/3 rounded bg-gray-100 dark:bg-slate-700" />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="h-4 w-32 rounded bg-gray-200 dark:bg-slate-600" />
      <div class="mt-3 h-9 w-16 rounded bg-gray-200 dark:bg-slate-600" />
      <div class="mt-2 h-3 w-40 rounded bg-gray-100 dark:bg-slate-700" />
    </template>
  </div>
</template>
