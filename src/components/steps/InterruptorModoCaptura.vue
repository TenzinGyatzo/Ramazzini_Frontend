<script setup lang="ts">
/** «Captura rápida | Con vista previa» (punto 38). Se recuerda por usuario en el navegador. */
import type { ModoCaptura } from '@/composables/useModoCaptura';

defineProps<{ modo: ModoCaptura }>();
const emit = defineEmits<{ (e: 'cambiar', modo: ModoCaptura): void }>();

const opciones: { valor: ModoCaptura; etiqueta: string; icono: string }[] = [
  { valor: 'capturaRapida', etiqueta: 'Captura rápida', icono: 'fa-keyboard' },
  { valor: 'vistaPrevia', etiqueta: 'Con vista previa', icono: 'fa-file-lines' },
];
</script>

<template>
  <div
    role="group"
    aria-label="Modo de captura"
    class="inline-flex rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-0.5 text-xs"
  >
    <button
      v-for="op in opciones"
      :key="op.valor"
      type="button"
      tabindex="-1"
      :aria-pressed="modo === op.valor"
      :class="[
        'px-2.5 py-1 rounded-md font-medium transition-colors inline-flex items-center gap-1.5',
        modo === op.valor
          ? 'bg-emerald-600 text-white'
          : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700',
      ]"
      @click="modo !== op.valor && emit('cambiar', op.valor)"
    >
      <i :class="['fas', op.icono]" aria-hidden="true"></i>
      {{ op.etiqueta }}
    </button>
  </div>
</template>
