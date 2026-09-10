<script setup>
import { computed, ref } from 'vue';
import { useVisualizadorScrollPaso } from '@/composables/useVisualizadorScrollPaso';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { useHtmlDarkMode } from '@/composables/useHtmlDarkMode';
import GraficaAudiometria from '@/components/graficas/GraficaAudiometria.vue';
import { buildAudiogramaLongitudinalChartConfig } from '@/helpers/graficaAudiogramaLongitudinal';
import {
  FRECUENCIAS_MATRIZ_ILA,
  PIE_COLOR_MAGNITUD_ILA,
  claseColorMagnitudDeltaIla,
  filasMatrizPorOidoIla,
  etiquetaResultadoResumenIla,
  formatearDeltaConSigno,
  ordenarPorFechaAscIla,
  textoInterpretacionLegadoIla,
  textoInterpretacionOidoIla,
} from '@/helpers/informeLongitudinalAudiometrico';
import {
  etiquetaLetraRecomendacionIla,
  normalizarRecomendacionesIla,
} from '@/helpers/ilaRecomendaciones';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const isHtmlDark = useHtmlDarkMode();
const fm = computed(() => formData.formDataInformeLongitudinalAudiometrico);
const { edad } = useEdadAntiguedadDocumento(() => fm.value.fechaInformeLongitudinalAudiometrico);

const goToStep = (n) => steps.goToStep(n);
const scrollRoot = ref(null);
useVisualizadorScrollPaso(scrollRoot, () => steps.currentStep);
const recomendacionesPreview = computed(() =>
  normalizarRecomendacionesIla(fm.value.recomendacionesSeguimientoAudiometrico),
);

const basal = computed(() => fm.value.audiometriaBasalConcentrada);
const subsecuentes = computed(() => fm.value.audiometriasSubsecuentesConcentradas || []);
const metodosIncluidos = computed(() => {
  const todos = [basal.value, ...subsecuentes.value].filter(Boolean);
  return [...new Set(todos.map((e) => e.metodoAudiometria).filter(Boolean))];
});

const chartOd = computed(() =>
  buildAudiogramaLongitudinalChartConfig('Derecho', basal.value, subsecuentes.value, {
    isDark: isHtmlDark.value,
  }),
);
const chartOi = computed(() =>
  buildAudiogramaLongitudinalChartConfig('Izquierdo', basal.value, subsecuentes.value, {
    isDark: isHtmlDark.value,
  }),
);

const resumen = computed(() => ordenarPorFechaAscIla(fm.value.resumenCronologico || []));
const interpretacionLegado = computed(() => textoInterpretacionLegadoIla(fm.value));
const bloquesOido = computed(() => [
  {
    clave: 'Derecho',
    titulo: 'oído derecho',
    chart: chartOd.value,
    filas: filasMatrizPorOidoIla(fm.value.matrizDeltas, 'Derecho'),
    interpretacion: textoInterpretacionOidoIla(fm.value, 'Derecho'),
    paso: 2,
  },
  {
    clave: 'Izquierdo',
    titulo: 'oído izquierdo',
    chart: chartOi.value,
    filas: filasMatrizPorOidoIla(fm.value.matrizDeltas, 'Izquierdo'),
    interpretacion: textoInterpretacionOidoIla(fm.value, 'Izquierdo'),
    paso: 3,
  },
]);

function deltaDe(fila, freq) {
  return (fila.deltas || []).find((d) => d.frecuenciaHz === freq)?.deltaDb;
}
</script>

<template>
  <div
    ref="scrollRoot"
    class="visualizador-informe-longitudinal-audiometrico space-y-4 border-shadow w-full text-left rounded-lg p-4 sm:p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto"
  >
    <div data-paso="1" class="space-y-4">
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt
        v-if="isMX"
        :estado="fm.estado"
        :fechaFinalizacion="fm.fechaFinalizacion"
        :finalizadoPor="fm.finalizadoPor"
        :fechaAnulacion="fm.fechaAnulacion"
        :anuladoPor="fm.anuladoPor"
        :razonAnulacion="fm.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <div class="w-full md:flex-1 text-center">
        <p class="text-base sm:text-lg">{{ empresas.currentEmpresa.nombreComercial }}</p>
        <p class="text-xs text-gray-500">{{ centrosTrabajo.currentCentroTrabajo?.nombreCentro }}</p>
      </div>
      <div
        class="w-full md:flex-1 text-sm text-right cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)"
      >
        Fecha: <span class="font-medium">{{ formatDateDDMMYYYY(fm.fechaInformeLongitudinalAudiometrico) }}</span>
      </div>
    </div>

    <table
      class="table-auto w-full border-collapse border border-gray-200 text-xs sm:text-sm cursor-pointer rounded-md"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 1 }"
      @click="goToStep(1)"
    >
      <tbody>
        <tr class="odd:bg-white even:bg-gray-50">
          <td class="px-2 py-1 border border-gray-300 font-light w-1/5">TRABAJADOR</td>
          <td class="px-2 py-1 border border-gray-300 font-medium">{{ formatNombreCompleto(trabajadores.currentTrabajador) }}</td>
          <td class="px-2 py-1 border border-gray-300 font-light">PUESTO / ÁREA</td>
          <td class="px-2 py-1 border border-gray-300 font-medium">{{ trabajadores.currentTrabajador.puesto || '—' }}</td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50">
          <td class="px-2 py-1 border border-gray-300 font-light">EDAD</td>
          <td class="px-2 py-1 border border-gray-300 font-medium">{{ edad }}</td>
          <td class="px-2 py-1 border border-gray-300 font-light">PERIODO</td>
          <td class="px-2 py-1 border border-gray-300 font-medium">
            {{ formatDateDDMMYYYY(fm.periodoInicio) }} — {{ formatDateDDMMYYYY(fm.periodoFin) }}
          </td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50">
          <td class="px-2 py-1 border border-gray-300 font-light">BASAL</td>
          <td class="px-2 py-1 border border-gray-300 font-medium">{{ formatDateDDMMYYYY(basal?.fechaAudiometria) || '—' }}</td>
          <td class="px-2 py-1 border border-gray-300 font-light">ESTUDIOS</td>
          <td class="px-2 py-1 border border-gray-300 font-medium">{{ fm.numeroAudiometriasIncluidas || 0 }} · {{ metodosIncluidos.join(', ') || '—' }}</td>
        </tr>
      </tbody>
    </table>

    <div>
      <h2 class="text-sm font-semibold text-gray-800 mb-2">Resumen de cada audiometría</h2>
      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="ila-matriz min-w-full text-xs">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-2 py-2 text-left">Fecha</th>
              <th class="px-2 py-2 text-left">Tipo</th>
              <th class="px-2 py-2 text-left">Método</th>
              <th class="px-2 py-2 text-center">Resultado OD</th>
              <th class="px-2 py-2 text-center">Resultado OI</th>
              <th class="px-2 py-2 text-left">Cambio vs basal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in resumen" :key="idx" class="odd:bg-white even:bg-gray-50">
              <td class="px-2 py-1 whitespace-nowrap">{{ formatDateDDMMYYYY(row.fechaAudiometria) }}</td>
              <td class="px-2 py-1 capitalize">{{ row.tipo }}</td>
              <td class="px-2 py-1">{{ row.metodoAudiometria || '—' }}</td>
              <td class="px-2 py-1 text-center">{{ etiquetaResultadoResumenIla(row.resultadoOD, row.metodoAudiometria) }}</td>
              <td class="px-2 py-1 text-center">{{ etiquetaResultadoResumenIla(row.resultadoOI, row.metodoAudiometria) }}</td>
              <td class="px-2 py-1">{{ row.cambioRespectoBasal }}</td>
            </tr>
            <tr v-if="!resumen.length">
              <td colspan="6" class="px-2 py-3 text-center text-gray-500">Sin estudios seleccionados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>

    <p v-if="interpretacionLegado" class="text-sm text-gray-700 whitespace-pre-wrap">
      <span class="block text-sm font-semibold text-gray-800 mb-1">Interpretación longitudinal</span>
      {{ interpretacionLegado }}
    </p>

    <p class="text-xs text-gray-500">Basal en negro grueso; más reciente destacada; intermedias tenues. Al señalar una línea se muestra fecha y umbrales.</p>

    <section
      v-for="bloque in bloquesOido"
      :key="bloque.clave"
      :data-paso="bloque.paso"
      class="space-y-3 cursor-pointer rounded-md"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === bloque.paso }"
      @click="goToStep(bloque.paso)"
    >
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <h3 class="text-sm font-semibold mb-2">Audiograma {{ bloque.titulo }}</h3>
        <div class="h-80">
          <GraficaAudiometria :data="bloque.chart.data" :options="bloque.chart.options" :height="320" />
        </div>
      </div>

      <h3 class="text-sm font-semibold text-gray-800">Matriz longitudinal de cambios — {{ bloque.titulo }}</h3>
      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="ila-matriz min-w-full text-xs">
          <thead class="bg-gray-800 text-white">
            <tr>
              <th class="px-2 py-2 text-left">Fecha</th>
              <th v-for="freq in FRECUENCIAS_MATRIZ_ILA" :key="freq" class="px-2 py-2 text-center">{{ freq }} Hz</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fila, idx) in bloque.filas" :key="idx" class="odd:bg-white even:bg-gray-50">
              <td class="px-2 py-1 whitespace-nowrap">{{ formatDateDDMMYYYY(fila.fechaAudiometria) }}</td>
              <td
                v-for="freq in FRECUENCIAS_MATRIZ_ILA"
                :key="freq"
                class="px-2 py-1 text-center font-medium"
                :class="claseColorMagnitudDeltaIla(deltaDe(fila, freq))"
              >
                {{ formatearDeltaConSigno(deltaDe(fila, freq)) }}
              </td>
            </tr>
            <tr v-if="!bloque.filas.length">
              <td colspan="8" class="px-2 py-3 text-center text-gray-500">Seleccione basal y al menos una subsecuente.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-500">{{ PIE_COLOR_MAGNITUD_ILA }}</p>

      <h3 class="text-sm font-semibold text-gray-800">Interpretación — {{ bloque.titulo }}</h3>
      <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ bloque.interpretacion || 'Sin interpretación registrada.' }}</p>
    </section>

    <div
      data-paso="4"
      class="space-y-3 cursor-pointer rounded-md"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 4 }"
      @click="goToStep(4)"
    >
      <h2 class="text-sm font-semibold text-gray-800 mb-1">Conclusiones</h2>
      <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ fm.conclusionesSeguimientoAudiometrico?.trim() || 'Sin conclusiones registradas.' }}</p>
    </div>

    <div
      v-if="recomendacionesPreview.length"
      data-paso="5"
      class="space-y-3 cursor-pointer rounded-md"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500': steps.currentStep === 5 }"
      @click="goToStep(5)"
    >
      <h2 class="text-sm font-semibold text-gray-800 mb-1">Recomendaciones</h2>
      <div class="text-sm text-gray-700">
        <div
          v-for="(item, index) in recomendacionesPreview"
          :key="index"
          class="ml-4 relative"
        >
          <span class="absolute left-0">{{ etiquetaLetraRecomendacionIla(index) }}.</span>
          <span class="block pl-4">{{ item }}</span>
        </div>
      </div>
    </div>
    <div
      v-else
      data-paso="5"
      class="w-full text-center cursor-pointer text-gray-500 italic"
      :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 5 }"
      @click="goToStep(5)"
    >
      + Agregar Recomendaciones
    </div>
  </div>
</template>

<style scoped>
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
