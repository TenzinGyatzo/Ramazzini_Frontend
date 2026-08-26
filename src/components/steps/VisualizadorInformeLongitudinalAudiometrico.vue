<script setup>
import { computed } from 'vue';
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
  CRITERIO_COMPARACION_ILA,
  VERSION_CRITERIO_ILA,
} from '@/helpers/informeLongitudinalAudiometrico';

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

const basal = computed(() => fm.value.audiometriaBasalConcentrada);
const subsecuentes = computed(() => fm.value.audiometriasSubsecuentesConcentradas || []);
const exposicion = computed(() => fm.value.antecedenteExposicionRuido || {});
const metodosIncluidos = computed(() => {
  const todos = [basal.value, ...subsecuentes.value].filter(Boolean);
  return [...new Set(todos.map((e) => e.metodoAudiometria).filter(Boolean))];
});

const chartOd = computed(() =>
  buildAudiogramaLongitudinalChartConfig('Derecho', basal.value, subsecuentes.value, { isDark: isHtmlDark.value }),
);
const chartOi = computed(() =>
  buildAudiogramaLongitudinalChartConfig('Izquierdo', basal.value, subsecuentes.value, { isDark: isHtmlDark.value }),
);
</script>

<template>
  <div class="space-y-4">
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

    <table class="table-auto w-full border-collapse border border-gray-200 text-xs sm:text-sm">
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
        <tr class="odd:bg-white even:bg-gray-50">
          <td class="px-2 py-1 border border-gray-300 font-light">EXPOSICIÓN A RUIDO</td>
          <td class="px-2 py-1 border border-gray-300 font-medium" colspan="3">
            {{ exposicion.trabajoAmbientesRuidosos || '—' }}
            · {{ exposicion.tiempoExposicionLaboral || '—' }}
            · EPP {{ exposicion.usoProteccionAuditiva || '—' }}
            <span v-if="exposicion.ruidoEnAgentesRiesgoActuales"> · Ruido en agentes actuales</span>
          </td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50">
          <td class="px-2 py-1 border border-gray-300 font-light">CRITERIO</td>
          <td class="px-2 py-1 border border-gray-300 font-medium" colspan="3">
            {{ fm.criterioComparacion || CRITERIO_COMPARACION_ILA }} {{ fm.versionCriterio || VERSION_CRITERIO_ILA }}
            — solo diferencias de umbral; sin clasificación NIOSH/OSHA/NOM-011.
          </td>
        </tr>
      </tbody>
    </table>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <h3 class="text-sm font-semibold mb-2">Oído derecho</h3>
        <div class="h-56">
          <GraficaAudiometria :data="chartOd.data" :options="chartOd.options" />
        </div>
      </div>
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <h3 class="text-sm font-semibold mb-2">Oído izquierdo</h3>
        <div class="h-56">
          <GraficaAudiometria :data="chartOi.data" :options="chartOi.options" />
        </div>
      </div>
    </div>
    <p class="text-xs text-gray-500">Basal en negro grueso; más reciente destacada; intermedias tenues. Al señalar una línea se muestra fecha y umbrales.</p>
  </div>
</template>
