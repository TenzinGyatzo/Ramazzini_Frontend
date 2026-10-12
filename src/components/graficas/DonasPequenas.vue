<script setup lang="ts">
/**
 * Varias proporciones lado a lado, cada una con su dona pequeña: el porcentaje
 * al centro y «n de m» debajo. Para comparar pocas condiciones entre sí.
 *
 * Admite al final una dona de otra naturaleza (`reparto`): no mide una
 * proporción sino cómo se reparte un grupo entre varias categorías. Va tras un
 * separador, con su propio rótulo, el total al centro y la leyenda al pie.
 */
interface Segmento {
  etiqueta: string;
  cantidad: number;
  color: string;
}

const props = defineProps<{
  filas: { clave: string; etiqueta: string; cantidad: number; total: number }[];
  /** Color de la parte que se cuenta. */
  color: string;
  /**
   * Color del anillo cuando la parte es cero. Sin él, un anillo vacío queda
   * gris y parece que falta el dato; con él se ve que el dato es «ninguno».
   */
  colorEnCero?: string;
  reparto?: { etiqueta: string; rotulo: string; segmentos: Segmento[] } | null;
}>();

// Circunferencia de un círculo de radio 15.9155: 100, para que el trazo se exprese en porcentaje
const RADIO = 15.9155;
const pct = (fila: { cantidad: number; total: number }) =>
  fila.total > 0 ? Math.round((fila.cantidad / fila.total) * 100) : 0;

const totalDelReparto = () => (props.reparto?.segmentos ?? []).reduce((suma, s) => suma + s.cantidad, 0);

/** Cada segmento empieza donde terminó el anterior. */
const arcos = () => {
  const total = totalDelReparto();
  let acumulado = 0;
  return (props.reparto?.segmentos ?? [])
    .filter((segmento) => segmento.cantidad > 0)
    .map((segmento) => {
      const parte = (segmento.cantidad / total) * 100;
      const arco = { ...segmento, trazo: `${parte} ${100 - parte}`, desfase: -acumulado };
      acumulado += parte;
      return arco;
    });
};
</script>

<template>
  <div>
    <ul class="flex flex-wrap items-start justify-center gap-x-10 gap-y-5">
      <li v-for="fila in filas" :key="fila.clave" class="flex w-32 flex-col items-center text-center" data-test="dona-pequena">
        <div class="relative h-24 w-24">
          <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90" aria-hidden="true">
            <circle
              v-if="colorEnCero && fila.total > 0 && pct(fila) === 0"
              cx="18"
              cy="18"
              :r="RADIO"
              fill="none"
              :stroke="colorEnCero"
              stroke-width="4"
              data-test="dona-en-cero"
            />
            <circle v-else class="donas-pequenas__riel" cx="18" cy="18" :r="RADIO" fill="none" stroke="#D1D5DB" stroke-width="4" />
            <circle
              v-if="pct(fila) > 0"
              cx="18"
              cy="18"
              :r="RADIO"
              fill="none"
              :stroke="color"
              stroke-width="4"
              :stroke-dasharray="`${pct(fila)} ${100 - pct(fila)}`"
            />
          </svg>
          <span class="lista-conteos__cantidad absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums text-gray-900">
            {{ pct(fila) }}%
          </span>
        </div>
        <span class="lista-conteos__etiqueta mt-2 text-sm font-medium leading-tight text-gray-800">{{ fila.etiqueta }}</span>
        <span class="lista-conteos__detalle text-xs text-gray-600">{{ fila.cantidad }} de {{ fila.total }}</span>
      </li>

      <!-- Reparto: otra medida, por eso va tras un separador y con su rótulo -->
      <li
        v-if="reparto && totalDelReparto() > 0"
        class="donas-pequenas__reparto flex flex-col items-center text-center"
        :class="filas.length ? 'sm:border-l sm:border-gray-200 sm:pl-10' : ''"
        data-test="dona-reparto"
      >
        <div class="relative h-24 w-24">
          <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90" aria-hidden="true">
            <circle
              v-for="arco in arcos()"
              :key="arco.etiqueta"
              cx="18"
              cy="18"
              :r="RADIO"
              fill="none"
              :stroke="arco.color"
              stroke-width="4"
              :stroke-dasharray="arco.trazo"
              :stroke-dashoffset="arco.desfase"
            />
          </svg>
          <span class="lista-conteos__cantidad absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums text-gray-900">
            {{ totalDelReparto() }}
          </span>
        </div>
        <span class="lista-conteos__etiqueta mt-2 w-32 text-sm font-medium leading-tight text-gray-800">{{ reparto.etiqueta }}</span>
        <span class="lista-conteos__detalle w-32 text-xs text-gray-600">{{ reparto.rotulo }}</span>
      </li>
    </ul>

    <ul
      v-if="reparto && totalDelReparto() > 0"
      class="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-600"
      data-test="dona-reparto-leyenda"
    >
      <li class="lista-conteos__etiqueta font-medium text-gray-700">{{ reparto.etiqueta }}:</li>
      <li v-for="segmento in reparto.segmentos" :key="segmento.etiqueta" class="inline-flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: segmento.color }"></span>
        {{ segmento.etiqueta }}
        <span class="lista-conteos__cantidad font-semibold tabular-nums text-gray-900">{{ segmento.cantidad }}</span>
      </li>
    </ul>
  </div>
</template>
