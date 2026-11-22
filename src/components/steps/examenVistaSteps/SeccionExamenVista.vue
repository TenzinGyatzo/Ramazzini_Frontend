<script setup lang="ts">
/**
 * Una sección del examen de la vista (punto 43): sus pasos, cada uno en su ancla de pregunta
 * (número canónico, ver examenVistaSections). Con vista previa, título y caja con desplazamiento
 * propio; en captura rápida, título con ícono y línea verde, como los otros documentos.
 */
import { ref, type Component } from 'vue';
import MicrostepAnchor from '../MicrostepAnchor.vue';
import { useSectionPinpoint } from '@/composables/useSectionPinpoint';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

defineProps<{
  titulo: string;
  icono?: string;
  pasos: Array<{ componente: Component; legacyStep: number }>;
}>();

const capturaRapida = enCapturaRapida();
const scrollRoot = ref<HTMLElement | null>(null);
useSectionPinpoint(scrollRoot);
</script>

<template>
  <div v-if="capturaRapida" class="ev-section-step w-full">
    <h2
      class="flex items-center gap-2 pb-2 mb-4 border-b-2 border-emerald-600 text-base font-semibold text-gray-900 dark:text-slate-100"
    >
      <i v-if="icono" :class="['fas', icono, 'text-emerald-600 w-5 text-center']" aria-hidden="true"></i>
      {{ titulo }}
    </h2>
    <div ref="scrollRoot" class="ev-section-scroll space-y-4">
      <MicrostepAnchor v-for="p in pasos" :key="p.legacyStep" :legacy-step="p.legacyStep">
        <component :is="p.componente" variant="compact" />
      </MicrostepAnchor>
    </div>
  </div>

  <div v-else class="ev-section-step flex flex-col min-h-0 w-full">
    <h1 class="text-xl font-bold mb-3 text-gray-900 dark:text-slate-100 shrink-0">{{ titulo }}</h1>
    <div
      ref="scrollRoot"
      class="ev-section-scroll flex-1 min-h-0 overflow-y-auto max-h-[var(--alto-seccion,min(58vh,520px))] sm:max-h-[var(--alto-seccion,min(60vh,560px))] xl:max-h-[var(--alto-seccion,min(68vh,640px))] pr-1 space-y-4 border border-gray-100 dark:border-slate-700 rounded-lg bg-gray-50/40 dark:bg-slate-900/70 p-2 sm:p-3"
    >
      <MicrostepAnchor v-for="p in pasos" :key="p.legacyStep" :legacy-step="p.legacyStep">
        <component :is="p.componente" variant="compact" />
      </MicrostepAnchor>
    </div>
  </div>
</template>
