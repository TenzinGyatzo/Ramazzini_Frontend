<script setup lang="ts">
import { computed } from 'vue';
import GraficaAnillo from '@/components/graficas/GraficaAnillo.vue';

/**
 * Dona para una proporción con una cifra que importa: al centro, cuántos y qué
 * parte del total; debajo, qué es cada color. Usa la misma dona que el resto
 * del tablero. Con `navegable`, cada segmento y su entrada en la leyenda avisan
 * al hacer clic para que la pantalla lleve a la lista correspondiente; sin él,
 * no muestra cursor de clic.
 */
interface Segmento {
  etiqueta: string;
  cantidad: number;
  color: string;
  /** Valor con el que la pantalla filtra, si no es la etiqueta. */
  clave?: string;
}

const props = withDefaults(
  defineProps<{
    segmentos: Segmento[];
    /** La cifra del centro. */
    cantidad: number;
    /** Sobre cuántos se calcula el porcentaje del centro. */
    total: number;
    /** Qué se cuenta, para el globo de cada segmento. */
    unidad?: string;
    /** Qué significa la cifra del centro. */
    nota?: string;
    navegable?: boolean;
  }>(),
  { unidad: 'Trabajadores', nota: '', navegable: false },
);

const emit = defineEmits<{ (e: 'elegir', segmento: Segmento): void }>();

const datos = computed(() => ({
  labels: props.segmentos.map((s) => s.etiqueta),
  datasets: [
    {
      data: props.segmentos.map((s) => s.cantidad),
      backgroundColor: props.segmentos.map((s) => s.color),
    },
  ],
}));

const opciones = computed(() => ({
  responsive: true,
  cutout: '70%',
  plugins: {
    tooltip: { enabled: true, callbacks: { label: (contexto: { raw: unknown }) => `${props.unidad}: ${contexto.raw}` } },
    datalabels: { display: false },
    legend: { display: false },
  },
  ...(props.navegable
    ? {
        onClick: (_evento: unknown, elementos: { index: number }[]) => {
          if (elementos.length) emit('elegir', props.segmentos[elementos[0].index]);
        },
        onHover: (evento: { chart?: { canvas?: HTMLCanvasElement } }, elementos: unknown[]) => {
          if (evento.chart?.canvas) evento.chart.canvas.style.cursor = elementos.length ? 'pointer' : 'default';
        },
      }
    : {}),
}));

const porcentaje = computed(() => (props.total > 0 ? Math.round((props.cantidad / props.total) * 100) : 0));
</script>

<template>
  <div data-test="dona-con-leyenda">
    <div class="h-56 sm:h-64">
      <GraficaAnillo :data="datos" :options="opciones" :cantidad="cantidad" :porcentaje="porcentaje" />
    </div>
    <p v-if="nota" class="mt-1 text-center text-xs italic text-gray-600">{{ nota }}</p>
    <ul class="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-600">
      <li v-for="segmento in segmentos" :key="segmento.etiqueta" data-test="dona-leyenda">
        <component
          :is="navegable ? 'button' : 'span'"
          :type="navegable ? 'button' : undefined"
          class="inline-flex items-center gap-1.5 rounded px-1"
          :class="navegable ? 'cursor-pointer transition hover:bg-gray-200' : ''"
          @click="navegable && emit('elegir', segmento)"
        >
          <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: segmento.color }"></span>
          {{ segmento.etiqueta }}
          <span class="lista-conteos__cantidad font-semibold tabular-nums text-gray-900">{{ segmento.cantidad }}</span>
        </component>
      </li>
    </ul>
  </div>
</template>
