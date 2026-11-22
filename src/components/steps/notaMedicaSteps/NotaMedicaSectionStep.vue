<script setup lang="ts">
import { ref } from 'vue';
import { useSectionPinpoint } from '@/composables/useSectionPinpoint';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

defineProps<{
  title: string;
  /** Ícono de Font Awesome del título en la captura rápida (p. ej. «fa-stethoscope»). */
  icono?: string;
}>();

// Captura rápida: todas las secciones en una página, cada una con su altura completa
const capturaRapida = enCapturaRapida();

const scrollRoot = ref<HTMLElement | null>(null);
useSectionPinpoint(scrollRoot);
</script>

<template>
  <!-- Captura rápida: título con ícono y línea verde; sin caja gris por dentro (la tarjeta la pone la página) -->
  <div v-if="capturaRapida" class="nm-section-step w-full">
    <h2
      class="flex items-center gap-2 pb-2 mb-4 border-b-2 border-emerald-600 text-base font-semibold text-gray-900 dark:text-slate-100"
    >
      <i v-if="icono" :class="['fas', icono, 'text-emerald-600 w-5 text-center']" aria-hidden="true"></i>
      {{ title }}
    </h2>
    <div ref="scrollRoot" class="nm-section-scroll nota-medica-dark-inputs space-y-1">
      <slot />
    </div>
  </div>

  <div v-else class="nm-section-step flex flex-col min-h-0 w-full">
    <h1 class="font-bold mb-3 text-gray-900 dark:text-slate-100 shrink-0 text-xl">{{ title }}</h1>
    <div
      ref="scrollRoot"
      class="nm-section-scroll nota-medica-dark-inputs flex-1 min-h-0 pr-1 space-y-1 border border-gray-100 dark:border-slate-700 rounded-lg bg-gray-50/40 dark:bg-slate-900/70 p-2 sm:p-3 overflow-y-auto max-h-[var(--alto-seccion,min(58vh,520px))] sm:max-h-[var(--alto-seccion,min(60vh,560px))] xl:max-h-[var(--alto-seccion,min(68vh,640px))]"
    >
      <slot />
    </div>
  </div>
</template>
