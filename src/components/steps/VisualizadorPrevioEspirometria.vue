<script setup>
import { computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularEdad, calcularAntiguedad, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import { usePeSectionsV2 } from '@/composables/usePeSectionsV2';
import {
  getPeSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/peSections';
import { shouldShowPinpointVisual } from '@/helpers/sectionPinpointVisual';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const { peSectionsV2Enabled } = usePeSectionsV2();

const resolveNavStep = (legacyStep) => {
  if (peSectionsV2Enabled.value) {
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
  peSectionsV2Enabled.value &&
  steps.focusedLegacyStep === legacyStep &&
  shouldShowPinpointVisual({
    documentType: 'previoEspirometria',
    legacyStep,
  });

const isActiveLegacyStep = (legacyStep) => {
  if (peSectionsV2Enabled.value) return false;
  return steps.currentStep === legacyStep;
};

const isActiveSection = (sectionId) => {
  if (!peSectionsV2Enabled.value) return false;
  return steps.currentStep === getPeSectionIndex(sectionId);
};

/** Outline por fila (solo V1 legacy). */
const rowOutlineClass = (legacyStep) =>
  isActiveLegacyStep(legacyStep)
    ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md'
    : '';
const rowPinpointClass = (legacyStep) =>
  isPinnedLegacyStep(legacyStep) ? 'pinpoint-row' : '';


/** Outline por bloque de sección (solo V2). */
const sectionOutlineClass = (sectionId) =>
  isActiveSection(sectionId)
    ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md'
    : '';

</script>

<template>
  <div
    class="visualizador-previo-espirometria flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataPrevioEspirometria.estado" 
        :fechaFinalizacion="formData.formDataPrevioEspirometria.fechaFinalizacion" 
        :finalizadoPor="formData.formDataPrevioEspirometria.finalizadoPor"
        :fechaAnulacion="formData.formDataPrevioEspirometria.fechaAnulacion"
        :anuladoPor="formData.formDataPrevioEspirometria.anuladoPor"
        :razonAnulacion="formData.formDataPrevioEspirometria.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Empresa -->
      <div class="w-full md:w-auto md:flex-1 text-center">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <!-- Fecha -->
      <div 
        class="w-full md:w-auto md:flex-1 flex flex-wrap gap-2 justify-start md:justify-end text-sm sm:text-base cursor-pointer"
        :class="[sectionOutlineClass('fecha'), rowOutlineClass(1), rowPinpointClass(1)]"
        @click="goToStep(1)">
        <p class="w-full md:w-auto text-right">Fecha: <span class="font-medium">{{
          formatDateDDMMYYYY(formData.formDataPrevioEspirometria.fechaPrevioEspirometria) }}</span></p>
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
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }}
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
        </tbody>
      </table>
    </div>

    <!-- Contenido principal en dos columnas -->
    <div class="w-full">
      <div class="flex flex-wrap gap-2">
        <!-- Columna izquierda -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <!-- Factores de riesgo respiratorio 2 - 6 -->
          <div class="mb-4" :class="sectionOutlineClass('factoresRiesgo')">
            <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(2)">FACTORES DE RIESGO RESPIRATORIO</h2>
            <table class="table-auto w-full border-collapse border border-gray-200">
              <thead>
                <tr class="bg-gray-200">
                  <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                  <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)" style="height: 1.75rem;"
                :class="[rowOutlineClass(2), rowPinpointClass(2)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">TABAQUISMO</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.tabaquismo === 'FUMA' ? 'text-red-600 font-medium' : formData.formDataPrevioEspirometria.tabaquismo === 'EXFUMADOR' ? 'text-orange-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.tabaquismo }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(2), rowPinpointClass(2)]" @click="goToStep(2)" style="height: 1.75rem;">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">CIGARROS-SEMANA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                    {{ formData.formDataPrevioEspirometria.cigarrosSemana }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(3)" style="height: 1.75rem;"
                :class="[rowOutlineClass(3), rowPinpointClass(3)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">EXPOSICIÓN A HUMOS Y BIOMASA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.exposicionHumosBiomasa === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.exposicionHumosBiomasa }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(4)" style="height: 1.75rem;"
                :class="[rowOutlineClass(4), rowPinpointClass(4)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">EXPOSICIÓN A POLVOS</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.exposicionLaboralPolvos === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.exposicionLaboralPolvos }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(5)" style="height: 1.75rem;"
                :class="[rowOutlineClass(5), rowPinpointClass(5)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">EXP. VAPORES Y GASES IRRITANTES</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.exposicionVaporesGasesIrritantes === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.exposicionVaporesGasesIrritantes }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(6)" style="height: 1.75rem;"
                :class="[rowOutlineClass(6), rowPinpointClass(6)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">TUBERC./INFEC. RESPIRATORIAS</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.antecedentesTuberculosisInfeccionesRespiratorias === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.antecedentesTuberculosisInfeccionesRespiratorias }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Antecedentes médicos relevantes 13 - 16 -->
          <div class="mb-4" :class="sectionOutlineClass('antecedentes')">
            <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(13)">ANTECEDENTES MÉDICOS RELEVANTES</h2>
            <table class="table-auto w-full border-collapse border border-gray-200">
              <thead>
                <tr class="bg-gray-200">
                  <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                  <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(13)" style="height: 1.75rem;"
                :class="[rowOutlineClass(13), rowPinpointClass(13)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ASMA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.asma === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.asma }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(14)" style="height: 1.75rem;"
                :class="[rowOutlineClass(14), rowPinpointClass(14)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">EPOC O BRONQUITIS CRÓNICA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.epocBronquitisCronica === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.epocBronquitisCronica }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(15)" style="height: 1.75rem;"
                :class="[rowOutlineClass(15), rowPinpointClass(15)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">FIBROSIS PULMONAR</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.fibrosisPulmonar === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.fibrosisPulmonar }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(16)" style="height: 1.75rem;"
                :class="[rowOutlineClass(16), rowPinpointClass(16)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">APNEA DEL SUEÑO</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.apneaSueno === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.apneaSueno }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Contraindicaciones relativas 18 - 22 -->
          <div class="mb-4" :class="sectionOutlineClass('contraindRelativas')">
            <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(18)">CONTRAINDICACIONES RELATIVAS</h2>
            <table class="table-auto w-full border-collapse border border-gray-200">
              <thead>
                <tr class="bg-gray-200">
                  <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                  <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(18)" style="height: 1.75rem;"
                :class="[rowOutlineClass(18), rowPinpointClass(18)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">CIRUGÍA RECIENTE</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.cirugiaReciente === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.cirugiaReciente }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(19)" style="height: 1.75rem;"
                :class="[rowOutlineClass(19), rowPinpointClass(19)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">INFECCIÓN RESPIRATORIA ACTIVA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.infeccionRespiratoriaActiva === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.infeccionRespiratoriaActiva }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(20)" style="height: 1.75rem;"
                :class="[rowOutlineClass(20), rowPinpointClass(20)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">EMBARAZO COMPLICADO</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.embarazoComplicado === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.embarazoComplicado }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(21)" style="height: 1.75rem;"
                :class="[rowOutlineClass(21), rowPinpointClass(21)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">DERRAME PLEURAL</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.derramePleural === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.derramePleural }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(22)" style="height: 1.75rem;"
                :class="[rowOutlineClass(22), rowPinpointClass(22)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">NEUMOTÓRAX</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.neumotorax === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.neumotorax }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Columna derecha -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <!-- Síntomas respiratorios 7 - 12 -->
          <div class="mb-4" :class="sectionOutlineClass('sintomas')">
            <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(7)">SÍNTOMAS RESPIRATORIOS</h2>
            <table class="table-auto w-full border-collapse border border-gray-200">
              <thead>
                <tr class="bg-gray-200">
                  <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                  <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(7)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(7), rowPinpointClass(7)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">TOS CRÓNICA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.tosCronica === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.tosCronica }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(8)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(8), rowPinpointClass(8)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">EXPECTORACIÓN FRECUENTE</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.expectoracionFrecuente === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.expectoracionFrecuente }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(9)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(9), rowPinpointClass(9)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">DISNEA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.disnea === 'EN REPOSO' ? 'text-red-600 font-medium' : formData.formDataPrevioEspirometria.disnea === 'AL ESFUERZO' ? 'text-orange-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.disnea }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(10)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(10), rowPinpointClass(10)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">SIBILANCIAS</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.sibilancias === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.sibilancias }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(11)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(11), rowPinpointClass(11)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">HEMOPTISIS</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.hemoptisis === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.hemoptisis }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(12)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(12), rowPinpointClass(12)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">OTROS SÍNTOMAS</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.otrosSintomas && formData.formDataPrevioEspirometria.otrosSintomas !== 'NO' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.otrosSintomas ? formData.formDataPrevioEspirometria.otrosSintomas.toUpperCase() : '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Medicamentos actuales 17 -->
          <div class="mb-4" 
          :class="[sectionOutlineClass('antecedentes'), rowOutlineClass(17), rowPinpointClass(17)]">
            <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(17)">MEDICAMENTOS ACTUALES</h2>
            <table class="table-auto w-full border-collapse border border-gray-200">
              <thead>
                <tr class="bg-gray-200">
                  <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                  <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(17), rowPinpointClass(17)]" @click="goToStep(17)" style="height: 1.75rem;">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">MEDICAMENTOS ACTUALES</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.medicamentosActuales === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.medicamentosActuales }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(17), rowPinpointClass(17)]" @click="goToStep(17)" style="height: 5.25rem;">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ESPECIFICAR MEDICAMENTOS</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                    {{ formData.formDataPrevioEspirometria.medicamentosActualesEspecificar ? formData.formDataPrevioEspirometria.medicamentosActualesEspecificar.toUpperCase() : '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Contraindicaciones absolutas 23 - 27 -->
          <div class="mb-4" :class="sectionOutlineClass('contraindAbsolutas')">
            <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(23)">CONTRAINDICACIONES ABSOLUTAS</h2>
            <table class="table-auto w-full border-collapse border border-gray-200">
              <thead>
                <tr class="bg-gray-200">
                  <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                  <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(23)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(23), rowPinpointClass(23)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">IAM/ANGINA INESTABLE</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.infartoAgudoAnginaInestable === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.infartoAgudoAnginaInestable }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(24)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(24), rowPinpointClass(24)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ANEURISMA AÓRTICO</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.aneurismaAorticoConocido === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.aneurismaAorticoConocido }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(25)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(25), rowPinpointClass(25)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">INESTABILIDAD HEMODINÁMICA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.inestabilidadHemodinamicaGrave === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.inestabilidadHemodinamicaGrave }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(26)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(26), rowPinpointClass(26)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">HIPERTENSIÓN INTRACRANEAL</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.hipertensionIntracraneal === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.hipertensionIntracraneal }}</td>
                </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(27)" style="height: 1.75rem;"
                  :class="[rowOutlineClass(27), rowPinpointClass(27)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">DESPRENDIMIENTO DE RETINA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataPrevioEspirometria.desprendimientoAgudoRetina === 'SI' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataPrevioEspirometria.desprendimientoAgudoRetina }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Resultado cuestionario -->
    <div class="w-full" :class="[sectionOutlineClass('resultado'), rowOutlineClass(28), rowPinpointClass(28)]">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(28)">RESULTADO DEL CUESTIONARIO</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <!-- Encabezado -->
          <tr class="bg-gray-200 cursor-pointer" :class="[rowOutlineClass(28), rowPinpointClass(28)]" @click="goToStep(28)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light text-center">
              ESPIROMETRÍA
            </td>
          </tr>
          <!-- Fila combinada -->
          <tr class="bg-white cursor-pointer" :class="[rowOutlineClass(28), rowPinpointClass(28)]" @click="goToStep(28)">
            <td class="w-1/2 text-xl md:text-2xl px-2 py-0 border border-gray-300 text-center align-middle"
              style="height: calc(2 * 1.3rem);"
              :class="formData.formDataPrevioEspirometria.resultadoCuestionario === 'PROCEDENTE' ? 'text-green-600 font-medium' : formData.formDataPrevioEspirometria.resultadoCuestionario === 'PROCEDENTE CON PRECAUCIÓN' ? 'text-orange-600 font-medium' : (formData.formDataPrevioEspirometria.resultadoCuestionario === 'OTRO' || (formData.formDataPrevioEspirometria.resultadoCuestionario === '' && formData.formDataPrevioEspirometria.resultadoCuestionarioPersonalizado)) ? 'text-gray-600 font-medium' : 'text-red-600 font-medium'">
              {{ (formData.formDataPrevioEspirometria.resultadoCuestionario === 'OTRO' || (formData.formDataPrevioEspirometria.resultadoCuestionario === '' && formData.formDataPrevioEspirometria.resultadoCuestionarioPersonalizado)) && formData.formDataPrevioEspirometria.resultadoCuestionarioPersonalizado ? formData.formDataPrevioEspirometria.resultadoCuestionarioPersonalizado.toUpperCase() : formData.formDataPrevioEspirometria.resultadoCuestionario }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>

</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.visualizador-previo-espirometria div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-previo-espirometria div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-previo-espirometria tbody tr.cursor-pointer,
.visualizador-previo-espirometria thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-previo-espirometria tbody tr.cursor-pointer > td,
.visualizador-previo-espirometria tbody tr.cursor-pointer > th,
.visualizador-previo-espirometria thead tr.cursor-pointer > td,
.visualizador-previo-espirometria thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-previo-espirometria tbody tr.cursor-pointer:hover,
.visualizador-previo-espirometria tbody tr.cursor-pointer:hover > td,
.visualizador-previo-espirometria tbody tr.cursor-pointer:hover > th,
.visualizador-previo-espirometria thead tr.cursor-pointer:hover,
.visualizador-previo-espirometria thead tr.cursor-pointer:hover > td,
.visualizador-previo-espirometria thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.visualizador-previo-espirometria tbody tr.pinpoint-row > td,
.visualizador-previo-espirometria tbody tr.pinpoint-row > th,
.visualizador-previo-espirometria thead tr.pinpoint-row > td,
.visualizador-previo-espirometria thead tr.pinpoint-row > th {
  background-color: #dbeafe !important;
}</style>

<style>
html.dark-mode .visualizador-previo-espirometria div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-previo-espirometria tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-previo-espirometria tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-previo-espirometria tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-previo-espirometria thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-previo-espirometria thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-previo-espirometria thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-previo-espirometria tbody tr.pinpoint-row > td,
html.dark-mode .visualizador-previo-espirometria tbody tr.pinpoint-row > th,
html.dark-mode .visualizador-previo-espirometria thead tr.pinpoint-row > td,
html.dark-mode .visualizador-previo-espirometria thead tr.pinpoint-row > th {
  background-color: #1e4a7a !important;
}
</style>
