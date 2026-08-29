<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    iconTone?: 'emerald' | 'slate' | 'amber';
    testId?: string;
    interactive?: boolean;
  }>(),
  { interactive: true },
);
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    :data-testid="testId"
    :class="[
      'inicio-action-row group flex min-h-11 w-full items-start gap-3 rounded-xl p-2.5 text-left',
      interactive
        ? 'cursor-pointer transition-[background-color,box-shadow,color] duration-150 ease-out hover:bg-emerald-50/70 hover:ring-1 hover:ring-emerald-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 active:bg-emerald-100/70 dark:hover:bg-emerald-950/30 dark:hover:ring-emerald-800/60 dark:focus-visible:ring-offset-slate-900'
        : 'cursor-default',
    ]"
  >
    <span
      class="inicio-action-row__icon mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150"
      :class="{
        'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-emerald-950/40':
          iconTone !== 'slate' && iconTone !== 'amber',
        'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300':
          iconTone === 'slate',
        'bg-amber-50 text-amber-600 group-hover:bg-amber-100 group-hover:text-amber-700 dark:bg-amber-950/40':
          iconTone === 'amber',
      }"
    >
      <i :class="icon"></i>
    </span>
    <span class="min-w-0 flex-1">
      <slot />
    </span>
    <span class="shrink-0 self-start pt-1 text-xs text-gray-400">
      <slot name="meta" />
    </span>
    <i
      v-if="interactive"
      class="inicio-action-row__chevron fas fa-chevron-right mt-2.5 shrink-0 text-gray-300 transition-all duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-emerald-600 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
    ></i>
  </component>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .inicio-action-row__chevron {
    transition: none;
  }

  .inicio-action-row:hover .inicio-action-row__chevron {
    transform: none;
  }
}
</style>
