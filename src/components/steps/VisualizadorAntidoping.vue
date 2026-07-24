<script setup>
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { computed } from 'vue';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import { useAntidopingSectionsV2 } from '@/composables/useAntidopingSectionsV2';
import {
  getAntidopingSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/antidopingSections';
import { shouldShowPinpointVisual } from '@/helpers/sectionPinpointVisual';
import {
  ANTIDOPING_PARAMETROS_ORDEN,
  ANTIDOPING_PARAMETRO_LABELS_VISTA,
  isCampoVisible,
} from '@/helpers/antidopingParametros';

const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const { antidopingSectionsV2Enabled } = useAntidopingSectionsV2();

const resolveNavStep = (legacyStep) => {
  if (antidopingSectionsV2Enabled.value) {
    return legacyStepToSectionIndex(legacyStep);
  }
  return legacyStep;
};

/** Fila/campo: sección + pinpoint */
const goToStep = (stepNumber) => {
  steps.goToSection(resolveNavStep(stepNumber), stepNumber);
};

/** Título de sección: sin pinpoint */
const goToSectionOnly = (stepNumber) => {
  steps.goToSection(resolveNavStep(stepNumber), null);
};

const isPinnedLegacyStep = (legacyStep) =>
  antidopingSectionsV2Enabled.value &&
  steps.focusedLegacyStep === legacyStep &&
  shouldShowPinpointVisual({
    documentType: 'antidoping',
    legacyStep,
  });

const isActiveLegacyStep = (legacyStep) => {
  if (antidopingSectionsV2Enabled.value) return false;
  return steps.currentStep === legacyStep;
};

const isActiveSection = (sectionId) => {
  if (!antidopingSectionsV2Enabled.value) return false;
  return steps.currentStep === getAntidopingSectionIndex(sectionId);
};

const sectionOutlineClass = (sectionId) =>
  isActiveSection(sectionId)
    ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md'
    : '';

const rowOutlineClass = (legacyStep) =>
  isActiveLegacyStep(legacyStep)
    ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md'
    : '';
const rowPinpointClass = (legacyStep) =>
  isPinnedLegacyStep(legacyStep) ? 'pinpoint-row' : '';


/** Filas reactivas: dependen del objeto completo del store (reemplazo en sync). */
const filasParametros = computed(() => {
  const data = formData.formDataAntidoping || {};
  return ANTIDOPING_PARAMETROS_ORDEN.filter((campo) =>
    isCampoVisible(campo, data.tipoPrueba || '5'),
  ).map((campo) => ({
    campo,
    label: ANTIDOPING_PARAMETRO_LABELS_VISTA[campo],
    valor: data[campo] || '',
  }));
});
</script>

<template>
  <div
    class="visualizador-antidoping border-shadow w-full col-span-1 2xl:col-span-9 text-left rounded-lg p-7 2xl:p-7 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-lg mx-auto"
  >
    <div class="flex justify-between items-start mb-4">
      <h2 class="text-lg font-medium cursor-pointer" @click="goToSectionOnly(1)">Información del Documento</h2>
      <EstadoDocumentoBadgeAlt
        v-if="isMX"
        :estado="formData.formDataAntidoping.estado"
        :fechaFinalizacion="formData.formDataAntidoping.fechaFinalizacion"
        :finalizadoPor="formData.formDataAntidoping.finalizadoPor"
        :fechaAnulacion="formData.formDataAntidoping.fechaAnulacion"
        :anuladoPor="formData.formDataAntidoping.anuladoPor"
        :razonAnulacion="formData.formDataAntidoping.razonAnulacion"
      />
    </div>
    <table
      class="table-auto w-full border-collapse border border-gray-200"
      :class="sectionOutlineClass('antidoping')"
    >
      <thead>
        <tr class="bg-gray-200">
          <th class="px-2 py-1 border border-gray-300 text-left whitespace-nowrap">
            Campo
          </th>
          <th class="px-2 py-1 border border-gray-300 text-left">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr
          class="odd:bg-white even:bg-gray-50 cursor-pointer"
          :class="[rowOutlineClass(1), rowPinpointClass(1)]"
          @click="goToStep(1)"
        >
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">
            Fecha Antidoping
          </td>
          <td class="px-2 py-1 border border-gray-300">
            {{ formatDateDDMMYYYY(formData.formDataAntidoping.fechaAntidoping) }}
          </td>
        </tr>
        <tr
          v-for="fila in filasParametros"
          :key="fila.campo"
          class="odd:bg-white even:bg-gray-50 cursor-pointer"
          :class="[rowOutlineClass(2), rowPinpointClass(2)]"
          @click="goToStep(2)"
        >
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">
            {{ fila.label }}
          </td>
          <td
            class="px-2 py-1 border border-gray-300"
            :class="fila.valor === 'Positivo' ? 'text-red-600 font-bold' : ''"
          >
            {{ fila.valor }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.visualizador-antidoping tbody tr.cursor-pointer,
.visualizador-antidoping thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-antidoping tbody tr.cursor-pointer > td,
.visualizador-antidoping tbody tr.cursor-pointer > th,
.visualizador-antidoping thead tr.cursor-pointer > td,
.visualizador-antidoping thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-antidoping tbody tr.cursor-pointer:hover,
.visualizador-antidoping tbody tr.cursor-pointer:hover > td,
.visualizador-antidoping tbody tr.cursor-pointer:hover > th,
.visualizador-antidoping thead tr.cursor-pointer:hover,
.visualizador-antidoping thead tr.cursor-pointer:hover > td,
.visualizador-antidoping thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.visualizador-antidoping tbody tr.pinpoint-row > td,
.visualizador-antidoping tbody tr.pinpoint-row > th,
.visualizador-antidoping thead tr.pinpoint-row > td,
.visualizador-antidoping thead tr.pinpoint-row > th {
  background-color: #dbeafe !important;
}</style>

<style>
html.dark-mode .visualizador-antidoping tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-antidoping tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-antidoping tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-antidoping thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-antidoping thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-antidoping thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-antidoping tbody tr.pinpoint-row > td,
html.dark-mode .visualizador-antidoping tbody tr.pinpoint-row > th,
html.dark-mode .visualizador-antidoping thead tr.pinpoint-row > td,
html.dark-mode .visualizador-antidoping thead tr.pinpoint-row > th {
  background-color: #1e4a7a !important;
}
</style>
