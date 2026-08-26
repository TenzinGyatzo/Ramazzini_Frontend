<script setup>
import { computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import {
  FRECUENCIAS_MATRIZ_ILA,
  PIE_COLOR_MAGNITUD_ILA,
  claseColorMagnitudDeltaIla,
  formatearDeltaConSigno,
} from '@/helpers/informeLongitudinalAudiometrico';
import { formatDateDDMMYYYY } from '@/helpers/dates';

const store = useFormDataStore();
const fm = computed(() => store.formDataInformeLongitudinalAudiometrico);
const matriz = computed(() => fm.value.matrizDeltas || []);
const resumen = computed(() => fm.value.resumenCronologico || []);
const advertencias = computed(() => fm.value.advertencias || []);

function deltaDe(fila, freq) {
  return (fila.deltas || []).find((d) => d.frecuenciaHz === freq)?.deltaDb;
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Revisión de cambios</h1>
    <p class="text-sm text-gray-600 mb-4">
      Δ = umbral subsecuente − umbral basal. Positivo: empeoramiento. Negativo: mejoría aparente.
    </p>

    <div class="overflow-x-auto border border-gray-200 rounded-lg mb-6">
      <table class="min-w-full text-xs">
        <thead class="bg-gray-800 text-white">
          <tr>
            <th class="px-2 py-2 text-left">Fecha</th>
            <th class="px-2 py-2 text-left">Oído</th>
            <th v-for="freq in FRECUENCIAS_MATRIZ_ILA" :key="freq" class="px-2 py-2 text-center">{{ freq }} Hz</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(fila, idx) in matriz" :key="idx" class="odd:bg-white even:bg-gray-50">
            <td class="px-2 py-1 whitespace-nowrap">{{ formatDateDDMMYYYY(fila.fechaAudiometria) }}</td>
            <td class="px-2 py-1">{{ fila.oido }}</td>
            <td
              v-for="freq in FRECUENCIAS_MATRIZ_ILA"
              :key="freq"
              class="px-2 py-1 text-center font-medium"
              :class="claseColorMagnitudDeltaIla(deltaDe(fila, freq))"
            >
              {{ formatearDeltaConSigno(deltaDe(fila, freq)) }}
            </td>
          </tr>
          <tr v-if="!matriz.length">
            <td colspan="9" class="px-2 py-3 text-center text-gray-500">Seleccione basal y al menos una subsecuente.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-gray-500 mb-6">{{ PIE_COLOR_MAGNITUD_ILA }}</p>

    <h2 class="text-base font-semibold text-gray-800 mb-2">Resumen cronológico</h2>
    <div class="overflow-x-auto border border-gray-200 rounded-lg mb-6">
      <table class="min-w-full text-xs">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-2 py-2 text-left">Fecha</th>
            <th class="px-2 py-2 text-left">Tipo</th>
            <th class="px-2 py-2 text-left">Método</th>
            <th class="px-2 py-2 text-left">Resultado OD</th>
            <th class="px-2 py-2 text-left">Resultado OI</th>
            <th class="px-2 py-2 text-left">Cambio respecto a basal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in resumen" :key="idx" class="odd:bg-white even:bg-gray-50">
            <td class="px-2 py-1 whitespace-nowrap">{{ formatDateDDMMYYYY(row.fechaAudiometria) }}</td>
            <td class="px-2 py-1 capitalize">{{ row.tipo }}</td>
            <td class="px-2 py-1">{{ row.metodoAudiometria || '—' }}</td>
            <td class="px-2 py-1">{{ row.resultadoOD }}</td>
            <td class="px-2 py-1">{{ row.resultadoOI }}</td>
            <td class="px-2 py-1">{{ row.cambioRespectoBasal }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 class="text-base font-semibold text-gray-800 mb-2">Advertencias</h2>
    <ul class="list-disc pl-5 space-y-1 text-sm text-amber-800">
      <li v-for="(adv, idx) in advertencias" :key="idx">{{ adv }}</li>
    </ul>
  </div>
</template>
