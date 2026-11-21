<script setup lang="ts">
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

// Captura rápida (punto 41): las preguntas en dos columnas desde 640 px
const capturaRapida = enCapturaRapida();

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
    <div
      :class="[
        'ef-microseccion-body',
        capturaRapida ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-8 [&>*]:min-w-0' : '',
      ]"
    >
      <slot />
    </div>
  </section>
</template>
