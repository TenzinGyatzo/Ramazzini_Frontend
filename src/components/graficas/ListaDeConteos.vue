<script setup lang="ts">
import { computed } from 'vue';

/** Lista de barras horizontales para conteos: una fila por concepto, en el orden recibido. */
const props = withDefaults(
  defineProps<{
    filas: { clave: string; etiqueta: string; cantidad: number }[];
    /** Total contra el que se calcula el porcentaje; por defecto, la suma de las filas. */
    total?: number;
    /** Filas que se muestran; el resto se resume en una línea. */
    limite?: number;
    vacio?: string;
  }>(),
  { limite: 10, vacio: 'Sin registros en el periodo.' },
);

const mostradas = computed(() => props.filas.slice(0, props.limite));
const restantes = computed(() => props.filas.slice(props.limite));
const maximo = computed(() => Math.max(1, ...props.filas.map((fila) => fila.cantidad)));
const total = computed(() => props.total ?? props.filas.reduce((suma, fila) => suma + fila.cantidad, 0));

const ancho = (cantidad: number) => `${Math.max(cantidad ? 2 : 0, (cantidad / maximo.value) * 100)}%`;
const porcentaje = (cantidad: number) =>
  total.value > 0 ? `${Math.round((cantidad / total.value) * 100)} %` : '';
</script>

<template>
  <p v-if="!filas.length" class="py-6 text-center text-sm text-gray-500">{{ vacio }}</p>
  <ul v-else class="space-y-2">
    <li v-for="fila in mostradas" :key="fila.clave" data-test="conteo">
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="lista-conteos__etiqueta min-w-0 truncate text-gray-800" :title="fila.etiqueta">{{ fila.etiqueta }}</span>
        <span class="shrink-0 whitespace-nowrap text-xs text-gray-500">
          <span class="lista-conteos__cantidad font-semibold tabular-nums text-gray-900">{{ fila.cantidad }}</span>
          <template v-if="porcentaje(fila.cantidad)"> ({{ porcentaje(fila.cantidad) }})</template>
        </span>
      </div>
      <div class="lista-conteos__riel mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
        <div class="lista-conteos__barra h-full rounded-full bg-emerald-500" :style="{ width: ancho(fila.cantidad) }"></div>
      </div>
    </li>
    <li v-if="restantes.length" class="pt-1 text-xs text-gray-500" data-test="conteo-restantes">
      Y {{ restantes.length }} más, con
      {{ restantes.reduce((suma, fila) => suma + fila.cantidad, 0) }} registros en total.
    </li>
  </ul>
</template>
