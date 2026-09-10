<script setup>
import { computed, watch } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  FRECUENCIAS_MATRIZ_ILA,
  MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA,
  PIE_COLOR_MAGNITUD_ILA,
  claseColorMagnitudDeltaIla,
  esBorradorInterpretacionIlaAplicable,
  filasMatrizPorOidoIla,
  formatearDeltaConSigno,
} from '@/helpers/informeLongitudinalAudiometrico';
import { formatDateDDMMYYYY } from '@/helpers/dates';

const props = defineProps({
  oido: {
    type: String,
    required: true,
    validator: (v) => v === 'Derecho' || v === 'Izquierdo',
  },
});

const store = useFormDataStore();
const fm = computed(() => store.formDataInformeLongitudinalAudiometrico);

const esDerecho = computed(() => props.oido === 'Derecho');
const tituloOido = computed(() => (esDerecho.value ? 'oído derecho' : 'oído izquierdo'));
const campoInterpretacion = computed(() =>
  esDerecho.value ? 'interpretacionOidoDerecho' : 'interpretacionOidoIzquierdo',
);
const campoBorrador = computed(() =>
  esDerecho.value ? 'borradorInterpretacionOidoDerecho' : 'borradorInterpretacionOidoIzquierdo',
);
const filas = computed(() => filasMatrizPorOidoIla(fm.value.matrizDeltas, props.oido));
const mostrarUsarAutomatica = computed(() => {
  const actual = String(fm.value[campoInterpretacion.value] || '').trim();
  return !actual && esBorradorInterpretacionIlaAplicable(fm.value[campoBorrador.value]);
});
const caracteresInterpretacion = computed(
  () => String(fm.value[campoInterpretacion.value] || '').length,
);
const topeInterpretacionAlcanzado = computed(
  () => caracteresInterpretacion.value >= MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA,
);

watch(caracteresInterpretacion, () => {
  const key = campoInterpretacion.value;
  const actual = String(fm.value[key] || '');
  if (actual.length > MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA) {
    fm.value[key] = actual.slice(0, MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA);
  }
});

function deltaDe(fila, freq) {
  return (fila.deltas || []).find((d) => d.frecuenciaHz === freq)?.deltaDb;
}

function usarInterpretacionAutomatica() {
  const texto = String(fm.value[campoBorrador.value] || '');
  if (!esBorradorInterpretacionIlaAplicable(texto)) return;
  fm.value[campoInterpretacion.value] = texto.slice(
    0,
    MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA,
  );
}
</script>

<template>
  <div class="ila-section-step flex flex-col min-h-0 w-full">
    <h1 class="text-2xl font-bold mb-2 text-gray-900 shrink-0">{{ esDerecho ? 'Oído derecho' : 'Oído izquierdo' }}</h1>
    <p class="text-sm text-gray-600 mb-3 shrink-0">
      Los números indican el cambio de umbral en dB respecto a la basal. Positivo: el umbral subió (empeoramiento). Negativo: el umbral bajó (mejoría aparente).
    </p>

    <div
      class="ila-section-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-h-[min(58vh,520px)] sm:max-h-[min(60vh,560px)] xl:max-h-[min(68vh,640px)] pr-0.5 space-y-3 border border-gray-100 rounded-lg bg-gray-50/40 p-2 sm:p-3"
    >
      <h2 class="text-base font-semibold text-gray-800">
        Matriz longitudinal de cambios — {{ tituloOido }}
      </h2>
      <div class="border border-gray-200 rounded-lg">
        <table class="ila-matriz w-full table-fixed text-[11px]">
          <thead class="bg-gray-800 text-white">
            <tr>
              <th class="px-1 py-1.5 text-left font-medium w-[4.25rem]">Fecha</th>
              <th v-for="freq in FRECUENCIAS_MATRIZ_ILA" :key="freq" class="px-0.5 py-1.5 text-center font-medium">{{ freq }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fila, idx) in filas" :key="idx" class="odd:bg-white even:bg-gray-50">
              <td class="px-1 py-1 whitespace-nowrap">{{ formatDateDDMMYYYY(fila.fechaAudiometria) }}</td>
              <td
                v-for="freq in FRECUENCIAS_MATRIZ_ILA"
                :key="freq"
                class="px-0.5 py-1 text-center font-medium"
                :class="claseColorMagnitudDeltaIla(deltaDe(fila, freq))"
              >
                {{ formatearDeltaConSigno(deltaDe(fila, freq)) }}
              </td>
            </tr>
            <tr v-if="!filas.length">
              <td colspan="8" class="px-2 py-3 text-center text-gray-500">Seleccione basal y al menos una subsecuente.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-500">{{ PIE_COLOR_MAGNITUD_ILA }}</p>

      <FormKit
        type="textarea"
        :name="campoInterpretacion"
        :label="`Interpretación — ${tituloOido}`"
        rows="9"
        input-class="min-h-[12rem]"
        :maxlength="MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA"
        v-model="fm[campoInterpretacion]"
      />
      <div class="flex items-center justify-between gap-2">
        <button
          v-if="mostrarUsarAutomatica"
          type="button"
          class="text-xs text-gray-500 underline decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500"
          @click="usarInterpretacionAutomatica"
        >
          Usar interpretación automática
        </button>
        <span v-else />
        <span
          class="ml-auto text-xs tabular-nums"
          :class="topeInterpretacionAlcanzado ? 'text-red-600' : 'text-gray-500'"
        >
          {{ caracteresInterpretacion }} / {{ MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ila-section-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.65) transparent;
}
.ila-section-scroll::-webkit-scrollbar {
  width: 3px;
}
.ila-section-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.ila-section-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(148 163 184 / 0.65);
  border-radius: 9999px;
}

.ila-matriz {
  border-collapse: collapse;
}
.ila-matriz th,
.ila-matriz td {
  border: 1px solid rgb(148 163 184 / 0.28);
}
.ila-matriz thead.bg-gray-800 th {
  border-color: rgb(255 255 255 / 0.14);
}
</style>
