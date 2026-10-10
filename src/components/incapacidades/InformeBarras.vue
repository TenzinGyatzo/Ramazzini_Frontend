<script setup lang="ts">
import { computed, ref } from 'vue';

/** Lista de barras horizontales: una fila por grupo, ordenadas como llegan. */
const props = withDefaults(
  defineProps<{
    filas: { clave: string; etiqueta: string; casos: number; dias: number }[];
    /** Filas visibles antes de «Ver todos». */
    visibles?: number;
    vacio?: string;
  }>(),
  { visibles: 6, vacio: 'Sin datos en el periodo.' },
);

const verTodos = ref(false);
const mostradas = computed(() => (verTodos.value ? props.filas : props.filas.slice(0, props.visibles)));
const maximo = computed(() => Math.max(1, ...props.filas.map((fila) => fila.dias)));
const totalDias = computed(() => props.filas.reduce((suma, fila) => suma + fila.dias, 0));

const ancho = (dias: number) => `${Math.max(dias ? 2 : 0, (dias / maximo.value) * 100)}%`;
const porcentaje = (dias: number) =>
  totalDias.value ? `${Math.round((dias / totalDias.value) * 100)} %` : '';
</script>

<template>
  <p v-if="!filas.length" class="py-6 text-center text-sm text-gray-500 dark:text-slate-400">{{ vacio }}</p>
  <div v-else>
    <ul class="space-y-2.5">
      <li v-for="fila in mostradas" :key="fila.clave" data-test="barra">
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="min-w-0 truncate text-gray-800 dark:text-slate-200" :title="fila.etiqueta">{{ fila.etiqueta }}</span>
          <span class="shrink-0 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
            <span class="font-semibold tabular-nums text-gray-900 dark:text-slate-100">{{ fila.dias }}</span>
            {{ fila.dias === 1 ? 'día' : 'días' }}
            <template v-if="porcentaje(fila.dias)"> ({{ porcentaje(fila.dias) }})</template>
            · {{ fila.casos }} {{ fila.casos === 1 ? 'caso nuevo' : 'casos nuevos' }}
          </span>
        </div>
        <div class="informe-barras__riel mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
          <div class="informe-barras__barra h-full rounded-full bg-emerald-500" :style="{ width: ancho(fila.dias) }"></div>
        </div>
      </li>
    </ul>
    <button
      v-if="filas.length > visibles"
      type="button"
      class="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
      @click="verTodos = !verTodos"
    >
      {{ verTodos ? 'Ver menos' : `Ver todos (${filas.length})` }}
    </button>
  </div>
</template>
