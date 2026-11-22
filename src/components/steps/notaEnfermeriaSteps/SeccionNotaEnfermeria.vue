<script setup lang="ts">
/**
 * Una sección de la nota de enfermería (punto 46). Con vista previa, el título y una caja que
 * toma la altura que queda en la ventana; en captura rápida, título con ícono y línea verde,
 * como los otros documentos.
 */
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

defineProps<{
  titulo: string;
  icono: string;
}>();

const capturaRapida = enCapturaRapida();
</script>

<template>
  <div v-if="capturaRapida" class="w-full">
    <h2
      class="flex items-center gap-2 pb-2 mb-4 border-b-2 border-emerald-600 text-base font-semibold text-gray-900 dark:text-slate-100"
    >
      <i :class="['fas', icono, 'text-emerald-600 w-5 text-center']" aria-hidden="true"></i>
      {{ titulo }}
    </h2>
    <slot />
  </div>

  <div v-else class="flex flex-col min-h-0 w-full">
    <h1 class="text-2xl font-bold mb-3 text-gray-900 dark:text-slate-100 shrink-0">{{ titulo }}</h1>
    <div
      class="flex-1 min-h-0 overflow-y-auto max-h-[var(--alto-seccion,min(58vh,520px))] sm:max-h-[var(--alto-seccion,min(60vh,560px))] xl:max-h-[var(--alto-seccion,min(68vh,640px))] pr-1"
    >
      <slot />
    </div>
  </div>
</template>
