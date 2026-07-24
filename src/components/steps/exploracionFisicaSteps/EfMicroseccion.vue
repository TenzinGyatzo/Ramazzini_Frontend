<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    /** Si true, muestra borde superior sutil (divisor respecto a la microsección anterior). */
    showDivider?: boolean;
  }>(),
  { showDivider: false },
);
</script>

<template>
  <section
    :class="[
      'ef-microseccion py-2',
      showDivider ? 'border-t border-gray-200 mt-3 pt-4' : '',
    ]"
  >
    <h2
      class="text-base sm:text-lg font-semibold text-gray-900 leading-snug tracking-normal mb-2.5 px-0.5 border-l-2 border-emerald-600 pl-2"
    >
      {{ title }}
    </h2>
    <div class="ef-microseccion-body">
      <slot />
    </div>
  </section>
</template>
