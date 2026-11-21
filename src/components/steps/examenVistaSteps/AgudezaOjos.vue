<script setup lang="ts">
/**
 * Punto 43: la agudeza visual de una distancia con el diseño común de captura, en los dos
 * modos: ojo izquierdo y derecho lado a lado («20/» fijo y el denominador), «Ceguera total»
 * como casilla junto al ojo e interpretación en tarjeta con su color. Solo acomoda: valores,
 * reglas e interpretación los lleva el paso.
 */
import { computed } from 'vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { parseOptionalNumber } from '@/helpers/notaMedicaCexRanges';
import { CLASE_CASILLA_LATERAL, CLASE_ERROR, CLASE_ETIQUETA } from '../captura/estiloCaptura';
import { colorAgudeza } from './colorAgudeza';

const props = defineProps<{
  /** «Lejana · carta de Snellen». */
  titulo: string;
  /** data-campo de la interpretación (aviso al guardar). */
  campo: string;
  idOI: string;
  idOD: string;
  ciegaOI: boolean;
  ciegaOD: boolean;
  /** Con casilla de ceguera (sin corrección); con corrección solo se muestra. */
  conCasillaCeguera?: boolean;
  /** Casillas de ceguera desactivadas (lentes de contacto). */
  cegueraBloqueada?: boolean;
  deshabilitadoOI?: boolean;
  deshabilitadoOD?: boolean;
  placeholder?: string;
  errorOI?: string;
  errorOD?: string;
  interpretacion?: string | null;
}>();
const oi = defineModel<number | string | null>('oi');
const od = defineModel<number | string | null>('od');
const emit = defineEmits<{ cegueraOI: []; cegueraOD: [] }>();

const ancho = enCapturaRapida();

const ojos = computed(() => [
  {
    clave: 'oi',
    etiqueta: 'Ojo izquierdo',
    id: props.idOI,
    ciega: props.ciegaOI,
    deshabilitado: props.deshabilitadoOI,
    error: props.errorOI,
  },
  {
    clave: 'od',
    etiqueta: 'Ojo derecho',
    id: props.idOD,
    ciega: props.ciegaOD,
    deshabilitado: props.deshabilitadoOD,
    error: props.errorOD,
  },
]);

function valor(clave: string) {
  const v = clave === 'oi' ? oi.value : od.value;
  return v ?? '';
}
function escribir(clave: string, e: Event) {
  const v = parseOptionalNumber((e.target as HTMLInputElement).value);
  if (clave === 'oi') oi.value = v;
  else od.value = v;
}
function ceguera(clave: string) {
  if (clave === 'oi') emit('cegueraOI');
  else emit('cegueraOD');
}

/** «OI: Visión normal OD: …» en renglones. */
const interpretacionParaMostrar = computed(() => {
  const v = props.interpretacion || '';
  return v.includes(' OD: ') ? v.replace(' OD: ', '\nOD: ') : v;
});
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
      <p class="text-sm font-semibold text-gray-800">{{ titulo }}</p>
      <slot name="lateral" />
    </div>
    <slot name="aviso" />

    <div :data-campo="campo" :class="['grid gap-3', ancho ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2']">
      <div v-for="ojo in ojos" :key="ojo.clave" class="min-w-0">
        <div class="flex items-center justify-between gap-2 mb-1">
          <label :for="ojo.id" :class="CLASE_ETIQUETA">{{ ojo.etiqueta }}</label>
          <label
            v-if="conCasillaCeguera && ancho"
            :class="[CLASE_CASILLA_LATERAL, cegueraBloqueada ? 'opacity-50 cursor-not-allowed' : '']"
            :title="cegueraBloqueada ? 'No disponible con lentes de contacto' : undefined"
          >
            <input
              type="checkbox"
              class="rounded"
              tabindex="-1"
              :checked="ojo.ciega"
              :disabled="cegueraBloqueada"
              @change="ceguera(ojo.clave)"
            />
            Ceguera total
          </label>
        </div>

        <div
          v-if="ojo.ciega"
          class="flex items-center h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-800"
        >
          Ceguera total
        </div>
        <div
          v-else
          :class="[
            'flex items-stretch h-10 rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500',
            ojo.deshabilitado ? 'bg-gray-100' : '',
          ]"
        >
          <span
            class="flex items-center px-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 select-none"
            title="Medida base"
          >20/</span>
          <input
            :id="ojo.id"
            type="number"
            class="flex-1 min-w-0 px-3 text-sm bg-transparent text-gray-800 placeholder-gray-400 border-0 focus:outline-none focus:ring-0 disabled:text-gray-400 disabled:cursor-not-allowed"
            step="5"
            min="5"
            max="400"
            :value="valor(ojo.clave)"
            :placeholder="placeholder"
            :disabled="ojo.deshabilitado"
            @input="escribir(ojo.clave, $event)"
          />
        </div>

        <label
          v-if="conCasillaCeguera && !ancho"
          :class="[CLASE_CASILLA_LATERAL, 'mt-1', cegueraBloqueada ? 'opacity-50 cursor-not-allowed' : '']"
        >
          <input
            type="checkbox"
            class="rounded"
            tabindex="-1"
            :checked="ojo.ciega"
            :disabled="cegueraBloqueada"
            @change="ceguera(ojo.clave)"
          />
          Ceguera total
        </label>
        <p v-if="ojo.error" :class="CLASE_ERROR">{{ ojo.error }}</p>
      </div>
    </div>

    <!-- Si la interpretación no cabe junto a la etiqueta, baja de renglón (no se parte «Visión normal») -->
    <div
      data-calculado
      class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
    >
      <p class="text-xs text-gray-500 shrink-0">Interpretación</p>
      <span
        v-if="interpretacion"
        :class="[
          'ml-auto max-w-full px-2.5 py-1 rounded-md text-sm font-semibold text-white text-right whitespace-pre-line',
          colorAgudeza(interpretacion),
        ]"
      >{{ interpretacionParaMostrar }}</span>
      <span v-else class="text-xs text-gray-400">Se calcula con la agudeza</span>
    </div>
  </div>
</template>
