<script setup lang="ts">
import { computed } from 'vue';

/**
 * Lista de barras horizontales para conteos: una fila por concepto, en el orden
 * recibido. El color dice algo: verde es favorable, ámbar pide atención, naranja
 * y rojo son riesgo, y gris es un conteo sin valoración. Con `navegable`, cada
 * fila avisa al hacer clic para que la pantalla lleve a la lista correspondiente.
 */
type Tono = 'neutro' | 'favorable' | 'atencion' | 'alerta' | 'riesgo';

interface Fila {
  clave: string;
  etiqueta: string;
  cantidad: number;
  /** Si la fila se mide sobre su propio total («3 de 20»), en lugar del total de la lista. */
  total?: number;
  tono?: Tono;
  /** En una lista navegable, esta fila no lleva a ninguna parte. */
  sinDestino?: boolean;
}

const props = withDefaults(
  defineProps<{
    filas: Fila[];
    /** Total contra el que se calcula el porcentaje; por defecto, la suma de las filas. */
    total?: number;
    /** Filas que se muestran; el resto se resume en una línea. */
    limite?: number;
    vacio?: string;
    /** Color de las filas que no traen el suyo. */
    tono?: Tono;
    navegable?: boolean;
  }>(),
  { limite: 10, vacio: 'Sin registros en el periodo.', tono: 'neutro', navegable: false },
);

const emit = defineEmits<{ (e: 'elegir', fila: Fila): void }>();

// Los mismos colores que usan las gráficas del tablero
const BARRA: Record<Tono, string> = {
  neutro: 'bg-gray-600',
  favorable: 'bg-emerald-500',
  atencion: 'bg-amber-500',
  alerta: 'bg-orange-500',
  riesgo: 'bg-red-600',
};

const mostradas = computed(() => props.filas.slice(0, props.limite));
const restantes = computed(() => props.filas.slice(props.limite));
const maximo = computed(() => Math.max(1, ...props.filas.map((fila) => fila.cantidad)));
const total = computed(() => props.total ?? props.filas.reduce((suma, fila) => suma + fila.cantidad, 0));

const conTotalPropio = (fila: Fila) => typeof fila.total === 'number';
const totalDe = (fila: Fila) => (conTotalPropio(fila) ? (fila.total as number) : total.value);
/** Con total propio la barra es la proporción; sin él, se compara con la fila más larga. */
const ancho = (fila: Fila) => {
  const parte = conTotalPropio(fila)
    ? totalDe(fila) > 0
      ? (fila.cantidad / totalDe(fila)) * 100
      : 0
    : (fila.cantidad / maximo.value) * 100;
  return `${Math.max(fila.cantidad ? 2 : 0, Math.min(100, parte))}%`;
};
const porcentaje = (fila: Fila) =>
  totalDe(fila) > 0 ? `${Math.round((fila.cantidad / totalDe(fila)) * 100)} %` : '';
</script>

<template>
  <p v-if="!filas.length" class="py-6 text-center text-sm text-gray-500">{{ vacio }}</p>
  <ul v-else class="space-y-3">
    <li v-for="fila in mostradas" :key="fila.clave" data-test="conteo">
      <component
        :is="navegable && !fila.sinDestino ? 'button' : 'div'"
        :type="navegable && !fila.sinDestino ? 'button' : undefined"
        class="block w-full text-left"
        :class="[
          navegable ? '-mx-2 w-[calc(100%+1rem)] rounded px-2 py-1' : '',
          navegable && !fila.sinDestino ? 'cursor-pointer transition hover:bg-gray-200' : '',
        ]"
        @click="navegable && !fila.sinDestino && emit('elegir', fila)"
      >
      <div class="flex items-baseline justify-between gap-3">
        <span class="lista-conteos__etiqueta min-w-0 truncate text-sm text-gray-800" :title="fila.etiqueta">{{ fila.etiqueta }}</span>
        <span class="lista-conteos__detalle shrink-0 whitespace-nowrap text-sm text-gray-600">
          <span class="lista-conteos__cantidad text-base font-semibold tabular-nums text-gray-900">{{ fila.cantidad }}</span>
          <template v-if="conTotalPropio(fila)"> de {{ fila.total }}</template>
          <template v-if="porcentaje(fila)"> · {{ porcentaje(fila) }}</template>
        </span>
      </div>
      <div class="lista-conteos__riel mt-1 h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          class="lista-conteos__barra h-full rounded-full"
          :class="BARRA[fila.tono ?? tono]"
          :data-tono="fila.tono ?? tono"
          :style="{ width: ancho(fila) }"
        ></div>
      </div>
      </component>
    </li>
    <li v-if="restantes.length" class="pt-1 text-xs text-gray-500" data-test="conteo-restantes">
      Y {{ restantes.length }} más, con
      {{ restantes.reduce((suma, fila) => suma + fila.cantidad, 0) }} registros en total.
    </li>
  </ul>
</template>
