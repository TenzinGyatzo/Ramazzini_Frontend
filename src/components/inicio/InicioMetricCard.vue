<script setup lang="ts">
defineProps<{
  label: string;
  value: number | string;
  hint: string;
  icon?: string;
  accent?: 'default' | 'warning';
  interactive?: boolean;
}>();
</script>

<template>
  <div
    class="inicio-metric relative isolate h-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    :class="interactive ? 'group' : ''"
  >
    <div
      v-if="interactive"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-50/70 opacity-0 ring-1 ring-inset ring-emerald-200/80 transition-opacity duration-150 ease-out group-hover:opacity-100 dark:bg-emerald-950/30 dark:ring-emerald-800/60"
    />
    <div class="relative">
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium text-gray-500 dark:text-slate-400">{{ label }}</p>
        <span
          v-if="icon"
          class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150"
          :class="
            accent === 'warning'
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          "
        >
          <i :class="icon"></i>
        </span>
      </div>
      <p
        class="mt-1 text-4xl font-semibold tabular-nums sm:text-5xl"
        :class="accent === 'warning' ? 'text-amber-500' : 'text-emerald-700 dark:text-emerald-400'"
      >
        {{ value }}
      </p>
      <p class="mt-1 text-sm text-gray-500 dark:text-slate-400">{{ hint }}</p>
    </div>
  </div>
</template>
