<script setup>
import { computed, ref } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  FRECUENCIAS_MATRIZ_ILA,
  PIE_COLOR_MAGNITUD_ILA,
  claseColorMagnitudDeltaIla,
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
const mensajeCopiado = ref(false);

const esDerecho = computed(() => props.oido === 'Derecho');
const tituloOido = computed(() => (esDerecho.value ? 'oído derecho' : 'oído izquierdo'));
const campoInterpretacion = computed(() =>
  esDerecho.value ? 'interpretacionOidoDerecho' : 'interpretacionOidoIzquierdo',
);
const filas = computed(() => filasMatrizPorOidoIla(fm.value.matrizDeltas, props.oido));
const borrador = computed(() =>
  esDerecho.value
    ? fm.value.borradorInterpretacionOidoDerecho
    : fm.value.borradorInterpretacionOidoIzquierdo,
);

function deltaDe(fila, freq) {
  return (fila.deltas || []).find((d) => d.frecuenciaHz === freq)?.deltaDb;
}

function usarBorrador() {
  const texto = borrador.value;
  if (!texto || !String(texto).trim()) return;
  store.formDataInformeLongitudinalAudiometrico[campoInterpretacion.value] = texto;
}

const copiarBorrador = async () => {
  const texto = borrador.value || '';
  if (!texto) return;
  try {
    await navigator.clipboard.writeText(texto);
    mensajeCopiado.value = true;
    setTimeout(() => {
      mensajeCopiado.value = false;
    }, 2000);
  } catch (err) {
    console.error('No se pudo copiar el borrador', err);
  }
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">{{ esDerecho ? 'Oído derecho' : 'Oído izquierdo' }}</h1>
    <p class="text-sm text-gray-600 mb-4">
      Δ = umbral subsecuente − umbral basal. Positivo: empeoramiento. Negativo: mejoría aparente.
    </p>

    <h2 class="text-base font-semibold text-gray-800 mb-2">
      Matriz longitudinal de cambios — {{ tituloOido }}
    </h2>
    <div class="border border-gray-200 rounded-lg mb-2">
      <table class="w-full table-fixed text-[11px]">
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
    <p class="text-xs text-gray-500 mb-6">{{ PIE_COLOR_MAGNITUD_ILA }}</p>

    <FormKit
      type="textarea"
      :name="campoInterpretacion"
      :label="`Interpretación — ${tituloOido}`"
      rows="9"
      input-class="min-h-[12rem]"
      v-model="fm[campoInterpretacion]"
    />

    <div class="border border-gray-200 rounded-lg p-2 bg-slate-50 mt-3">
      <div class="flex items-center justify-between gap-2 mb-1">
        <h2 class="text-xs font-semibold text-gray-800">Interpretación sugerida</h2>
        <div class="flex gap-2">
          <button
            type="button"
            class="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            @click="usarBorrador"
          >
            Usar en interpretación
          </button>
          <button
            type="button"
            class="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50"
            @click="copiarBorrador"
          >
            {{ mensajeCopiado ? 'Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>
      <p class="text-[11px] leading-snug text-gray-600 whitespace-pre-wrap">{{ borrador || 'Seleccione basal y subsecuentes en el paso 1.' }}</p>
    </div>
  </div>
</template>
