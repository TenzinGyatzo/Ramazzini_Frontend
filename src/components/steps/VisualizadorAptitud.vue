<script setup>
import { useVisualizadorScrollPaso } from '@/composables/useVisualizadorScrollPaso';
import { onMounted, ref, computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { convertirFechaISOaDDMMYYYY, formatDateDDMMYYYY } from '@/helpers/dates';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import DocumentosAPI from '@/api/DocumentosAPI';
import ResultadosClinicosAPI from '@/api/ResultadosClinicosAPI';
import { filasEstudiosAptitud } from '@/helpers/aptitudEstudios';
import TablaEstudiosAptitud from './aptitudSteps/TablaEstudiosAptitud.vue';

import { useAptitudSectionsV2 } from '@/composables/useAptitudSectionsV2';
import {
  getAptitudSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/aptitudSections';
import { shouldShowPinpointVisual } from '@/helpers/sectionPinpointVisual';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => formData.formDataAptitud.fechaAptitudPuesto);
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const { aptitudSectionsV2Enabled } = useAptitudSectionsV2();
const scrollRoot = ref(null);
useVisualizadorScrollPaso(scrollRoot, () => steps.currentStep);


// Documentos del trabajador para la tabla de estudios; la tabla la arma `helpers/aptitudEstudios.ts`
// (la misma que muestra la captura rápida, punto 45)
const vecinosAptitud = ref({});
const resultadosClinicos = ref([]);

/** `true` mientras llegan los documentos del trabajador; la tabla resumen lo indica. */
const cargandoDocumentos = ref(true);

onMounted(async () => {
  const trabajadorId = trabajadores.currentTrabajadorId;

  // Dos peticiones en paralelo en lugar de una por tipo de documento, una tras otra:
  // el resumen no se puede calcular hasta tener todo, y en cadena tardaba la suma de todas.
  const [vecinosRes, resultadosRes] = await Promise.allSettled([
    DocumentosAPI.getAptitudInformeVecinos(trabajadorId),
    ResultadosClinicosAPI.getByTrabajador(trabajadorId),
  ]);

  if (vecinosRes.status === 'fulfilled') {
    vecinosAptitud.value = vecinosRes.value.data ?? {};
  } else {
    console.error('Error al obtener los documentos del trabajador:', vecinosRes.reason);
  }

  if (resultadosRes.status === 'fulfilled') {
    resultadosClinicos.value = resultadosRes.value.data || [];
  } else {
    console.error('Error al obtener los resultados clínicos:', resultadosRes.reason);
    resultadosClinicos.value = [];
  }

  cargandoDocumentos.value = false;

});

const resolveNavStep = (legacyStep) => {
  if (aptitudSectionsV2Enabled.value) {
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
  aptitudSectionsV2Enabled.value &&
  steps.focusedLegacyStep === legacyStep &&
  shouldShowPinpointVisual({
    documentType: 'aptitud',
    legacyStep,
  });

const isActiveLegacyStep = (legacyStep) => {
  if (aptitudSectionsV2Enabled.value) return false;
  return steps.currentStep === legacyStep;
};

const isActiveSection = (sectionId) => {
  if (!aptitudSectionsV2Enabled.value) return false;
  return steps.currentStep === getAptitudSectionIndex(sectionId);
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


const filasEstudios = computed(() =>
  filasEstudiosAptitud(vecinosAptitud.value, resultadosClinicos.value, formData.formDataAptitud.fechaAptitudPuesto),
);

</script>

<template>
  <div
    ref="scrollRoot"
    class="visualizador-aptitud flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-[55.5rem] mx-auto max-h-[var(--alto-documento,66vh)] sm:max-h-[var(--alto-documento,68vh)] md:max-h-[var(--alto-documento,67vh)] lg:max-h-[var(--alto-documento,67vh)] xl:max-h-[var(--alto-documento,81vh)] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataAptitud.estado" 
        :fechaFinalizacion="formData.formDataAptitud.fechaFinalizacion" 
        :finalizadoPor="formData.formDataAptitud.finalizadoPor"
        :fechaAnulacion="formData.formDataAptitud.fechaAnulacion"
        :anuladoPor="formData.formDataAptitud.anuladoPor"
        :razonAnulacion="formData.formDataAptitud.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Empresa -->
      <div class="w-full md:w-auto md:flex-1 text-center">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <!-- Fecha -->
      <div class="w-full md:w-auto md:flex-1 flex flex-wrap gap-2 justify-start md:justify-end text-sm sm:text-base cursor-pointer"
        :class="[sectionOutlineClass('fecha'), rowOutlineClass(1), rowPinpointClass(1)]"
        :data-paso="resolveNavStep(1)" @click="goToStep(1)">
        <p class="w-full md:w-auto text-right">Fecha: <span class="font-medium">{{
           formatDateDDMMYYYY(formData.formDataAptitud.fechaAptitudPuesto) }}</span></p>
      </div>
    </div>

    <!-- Trabajador -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NOMBRE
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NACIMIENTO
            </td>
            <td class="w-1/4 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ convertirFechaISOaDDMMYYYY(trabajadores.currentTrabajador.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESCOLARIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.escolaridad }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ edad }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PUESTO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.puesto }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              SEXO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.sexo }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGUEDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ antiguedad }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              TELÉFONO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.telefono }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESTADO CIVIL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.estadoCivil }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NUM. EMPLEADO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.numeroEmpleado || '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Resumen y/o Alteraciones -->
    <div class="w-full">
      <h2 class="mb-1 text-left">La evaluación médica para la aptitud ante el puesto está basada
        en la siguiente información:</h2>
      <TablaEstudiosAptitud :filas="filasEstudios" :cargando="cargandoDocumentos" :class="[sectionOutlineClass('fecha'), sectionOutlineClass('evaluacionesAdicionales'), rowOutlineClass(1), rowPinpointClass(1)]">
        <template #filas-extra>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional1" class="odd:bg-white even:bg-gray-50 cursor-pointer" :data-paso="resolveNavStep(2)" @click="goToStep(2)"
            :class="[rowOutlineClass(2), rowPinpointClass(2)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional1.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional1) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional1 }}</td>
          </tr>
          <tr v-else :data-paso="resolveNavStep(2)" :class="[rowOutlineClass(2), rowPinpointClass(2)]"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional2" class="odd:bg-white even:bg-gray-50 cursor-pointer" :data-paso="resolveNavStep(3)" @click="goToStep(3)"
            :class="[rowOutlineClass(3), rowPinpointClass(3)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional2.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional2) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional2 }}</td>
          </tr>
          <tr v-else :data-paso="resolveNavStep(3)" :class="[rowOutlineClass(3), rowPinpointClass(3)]"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional3" class="odd:bg-white even:bg-gray-50 cursor-pointer" :data-paso="resolveNavStep(4)" @click="goToStep(4)"
            :class="[rowOutlineClass(4), rowPinpointClass(4)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional3.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional3) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional3 }}</td>
          </tr>
          <tr v-else :data-paso="resolveNavStep(4)" :class="[rowOutlineClass(4), rowPinpointClass(4)]"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional4" class="odd:bg-white even:bg-gray-50 cursor-pointer" :data-paso="resolveNavStep(5)" @click="goToStep(5)"
            :class="[rowOutlineClass(5), rowPinpointClass(5)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional4.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional4) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional4 }}</td>
          </tr>
          <tr v-else :data-paso="resolveNavStep(5)" :class="[rowOutlineClass(5), rowPinpointClass(5)]"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional5" class="odd:bg-white even:bg-gray-50 cursor-pointer" :data-paso="resolveNavStep(6)" @click="goToStep(6)"
            :class="[rowOutlineClass(6), rowPinpointClass(6)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional5.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional5) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional5 }}</td>
          </tr>
          <tr v-else :data-paso="resolveNavStep(6)" :class="[rowOutlineClass(6), rowPinpointClass(6)]"></tr>
          <tr v-if="formData.formDataAptitud.evaluacionAdicional6" class="odd:bg-white even:bg-gray-50 cursor-pointer" :data-paso="resolveNavStep(7)" @click="goToStep(7)"
            :class="[rowOutlineClass(7), rowPinpointClass(7)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">{{ formData.formDataAptitud.evaluacionAdicional6.toUpperCase() }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAptitud.fechaEvaluacionAdicional6) }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">{{ formData.formDataAptitud.resultadosEvaluacionAdicional6 }}</td>
          </tr>
          <tr v-else :data-paso="resolveNavStep(7)" :class="[rowOutlineClass(7), rowPinpointClass(7)]"></tr>
        </template>
      </TablaEstudiosAptitud>
    </div>

    <!-- Aptitud al Puesto -->
    <div class="w-full cursor-pointer" :data-paso="resolveNavStep(8)" @click="goToStep(8)" 
      :class="[sectionOutlineClass('aptitud'), rowOutlineClass(8), rowPinpointClass(8)]">
      <table class="table-auto w-full border-collapse border border-gray-200 ">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center" colspan="2">
              BASADO EN LA INFORMACIÓN ANTERIOR SE HA DETERMINADO:
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!formData.formDataAptitud.aptitudPuesto" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-gray-700 font-medium P">
              -
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Apto Sin Restricciones'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-green-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'APTA SIN RESTRICCIONES' : 'APTO SIN RESTRICCIONES' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Apto Con Precaución'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-amber-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'APTA CON PRECAUCIÓN' : 'APTO CON PRECAUCIÓN' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Apto Con Restricciones'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-orange-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'APTA CON RESTRICCIONES' : 'APTO CON RESTRICCIONES' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'No Apto'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-red-600 font-medium">
              {{ trabajadores.currentTrabajador.sexo === 'Femenino' ? 'NO APTA' : 'NO APTO' }}
            </td>
          </tr>

          <tr v-if="formData.formDataAptitud.aptitudPuesto === 'Evaluación No Completada'" class="odd:bg-white even:bg-gray-50 cursor-pointer">
            <td class="text-lg sm:text-2xl lg:text-3xl text-center px-2 py-0 sm:py-1 lg:py-2 border border-gray-300 text-gray-700 font-medium">
              EVALUACIÓN NO COMPLETADA
            </td>
          </tr>
        </tbody>

      </table>
    </div>

    <!-- Conclusión y recomendaciones -->
    <div class="w-full">
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center" colspan="2">
              CONCLUSIÓN Y RECOMENDACIONES
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 3.9rem;" :data-paso="resolveNavStep(9)" @click='goToStep(9)'
          :class="[sectionOutlineClass('alteraciones'), rowOutlineClass(9), rowPinpointClass(9)]">
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              Alteraciones a la salud
            </td>
            <td class="text-xs sm:text-sm text-justify px-2 py-0 border border-gray-300">
              {{ formData.formDataAptitud.alteracionesSalud }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 3.9rem;" :data-paso="resolveNavStep(10)" @click='goToStep(10)'
          :class="[sectionOutlineClass('resultados'), rowOutlineClass(10), rowPinpointClass(10)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              Resultados
            </td>
            <td class="text-xs sm:text-sm text-justify px-2 py-0 border border-gray-300">
              {{ formData.formDataAptitud.resultados }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 3.9rem;" :data-paso="resolveNavStep(11)" @click='goToStep(11)'
          :class="[sectionOutlineClass('medidas'), rowOutlineClass(11), rowPinpointClass(11)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              Medidas Preventivas Específicas
            </td>
            <td class="text-xs sm:text-sm text-justify px-2 py-0 border border-gray-300">
              {{ formData.formDataAptitud.medidasPreventivas }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
.tabla-resumen-estudios-aptitud thead th:nth-child(2),
.tabla-resumen-estudios-aptitud tbody td:nth-child(2) {
  white-space: nowrap;
  word-break: normal;
  overflow-wrap: normal;
}

.cursor-pointer {
  cursor: pointer;
}

.visualizador-aptitud div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-aptitud div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-aptitud tbody tr.cursor-pointer,
.visualizador-aptitud thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-aptitud tbody tr.cursor-pointer > td,
.visualizador-aptitud tbody tr.cursor-pointer > th,
.visualizador-aptitud thead tr.cursor-pointer > td,
.visualizador-aptitud thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-aptitud tbody tr.cursor-pointer:hover,
.visualizador-aptitud tbody tr.cursor-pointer:hover > td,
.visualizador-aptitud tbody tr.cursor-pointer:hover > th,
.visualizador-aptitud thead tr.cursor-pointer:hover,
.visualizador-aptitud thead tr.cursor-pointer:hover > td,
.visualizador-aptitud thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.visualizador-aptitud tbody tr.pinpoint-row > td,
.visualizador-aptitud tbody tr.pinpoint-row > th,
.visualizador-aptitud thead tr.pinpoint-row > td,
.visualizador-aptitud thead tr.pinpoint-row > th {
  background-color: #dbeafe !important;
}</style>

<style>
html.dark-mode .visualizador-aptitud div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-aptitud tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-aptitud tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-aptitud tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-aptitud thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-aptitud thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-aptitud thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-aptitud tbody tr.pinpoint-row > td,
html.dark-mode .visualizador-aptitud tbody tr.pinpoint-row > th,
html.dark-mode .visualizador-aptitud thead tr.pinpoint-row > td,
html.dark-mode .visualizador-aptitud thead tr.pinpoint-row > th {
  background-color: #1e4a7a !important;
}
</style>
