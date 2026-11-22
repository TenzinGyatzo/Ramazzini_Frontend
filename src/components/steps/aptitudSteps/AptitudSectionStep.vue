<script setup lang="ts">
/**
 * Una sección de la aptitud. Con vista previa, título y caja con desplazamiento propio; en
 * captura rápida (punto 45), título con ícono y línea verde, como los otros documentos.
 */
import { ref } from 'vue';
import { useSectionPinpoint } from '@/composables/useSectionPinpoint';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

defineProps<{
  title: string;
  icono?: string;
}>();

const capturaRapida = enCapturaRapida();
const scrollRoot = ref<HTMLElement | null>(null);
useSectionPinpoint(scrollRoot);
</script>

<template>
  <div v-if="capturaRapida" class="aptitud-section-step w-full">
    <h2
      class="flex items-center gap-2 pb-2 mb-4 border-b-2 border-emerald-600 text-base font-semibold text-gray-900 dark:text-slate-100"
    >
      <i v-if="icono" :class="['fas', icono, 'text-emerald-600 w-5 text-center']" aria-hidden="true"></i>
      {{ title }}
    </h2>
    <div ref="scrollRoot" class="aptitud-section-scroll space-y-1">
      <slot />
    </div>
  </div>

  <div v-else class="aptitud-section-step flex flex-col min-h-0 w-full">
    <h1 class="text-xl font-bold mb-3 text-gray-900 dark:text-slate-100 shrink-0">{{ title }}</h1>
    <div
      ref="scrollRoot"
      class="aptitud-section-scroll flex-1 min-h-0 overflow-y-auto max-h-[var(--alto-seccion,min(58vh,520px))] sm:max-h-[var(--alto-seccion,min(60vh,560px))] xl:max-h-[var(--alto-seccion,min(68vh,640px))] pr-1 space-y-1 border border-gray-100 dark:border-slate-700 rounded-lg bg-gray-50/40 dark:bg-slate-900/70 p-2 sm:p-3"
    >
      <slot />
    </div>
  </div>
</template>
