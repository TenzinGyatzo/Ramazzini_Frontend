<script setup>
import { computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import { useHoSectionsV2 } from '@/composables/useHoSectionsV2';
import {
  getHoSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/hoSections';
import { shouldShowPinpointVisual } from '@/helpers/sectionPinpointVisual';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => formData.formDataHistoriaOtologica.fechaHistoriaOtologica);
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const { hoSectionsV2Enabled } = useHoSectionsV2();

const resolveNavStep = (legacyStep) => {
  if (hoSectionsV2Enabled.value) {
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
  hoSectionsV2Enabled.value &&
  steps.focusedLegacyStep === legacyStep &&
  shouldShowPinpointVisual({
    documentType: 'historiaOtologica',
    legacyStep,
  });

const isActiveLegacyStep = (legacyStep) => {
  if (hoSectionsV2Enabled.value) return false;
  return steps.currentStep === legacyStep;
};

const isActiveSection = (sectionId) => {
  if (!hoSectionsV2Enabled.value) return false;
  return steps.currentStep === getHoSectionIndex(sectionId);
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
    class="visualizador-historia-otologica flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataHistoriaOtologica.estado" 
        :fechaFinalizacion="formData.formDataHistoriaOtologica.fechaFinalizacion" 
        :finalizadoPor="formData.formDataHistoriaOtologica.finalizadoPor"
        :fechaAnulacion="formData.formDataHistoriaOtologica.fechaAnulacion"
        :anuladoPor="formData.formDataHistoriaOtologica.anuladoPor"
        :razonAnulacion="formData.formDataHistoriaOtologica.razonAnulacion"
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
          formatDateDDMMYYYY(formData.formDataHistoriaOtologica.fechaHistoriaOtologica) }}</span></p>
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
              ESCOLARIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador.escolaridad }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGUEDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ antiguedad }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- En los últimos 2 meses -->
    <div class="w-full" :class="sectionOutlineClass('sintomas')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(2)">EN LOS ÚLTIMOS DOS MESES</h2>
      <div class="flex flex-wrap gap-2">
        <!-- Tabla izquierda -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
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
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">DOLOR OÍDO</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.dolorOido === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.dolorOido }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(3)" style="height: 1.75rem;"
              :class="[rowOutlineClass(3), rowPinpointClass(3)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">SUPURACIÓN OÍDO</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.supuracionOido === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.supuracionOido }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(4)" style="height: 1.75rem;"
              :class="[rowOutlineClass(4), rowPinpointClass(4)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">MAREO O VÉRTIGO</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.mareoVertigo === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.mareoVertigo }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Tabla derecha -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <table class="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-200">
                <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(5)" style="height: 1.75rem;"
                :class="[rowOutlineClass(5), rowPinpointClass(5)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ZUMBIDO (TINNITUS)</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.zumbidoTinnitus === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.zumbidoTinnitus }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(6)" style="height: 1.75rem;"
                :class="[rowOutlineClass(6), rowPinpointClass(6)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">PÉRDIDA DE AUDICIÓN</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.perdidaAudicion === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.perdidaAudicion }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(7)" style="height: 1.75rem;"
                :class="[rowOutlineClass(7), rowPinpointClass(7)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">OÍDO TAPADO / PLENITUD</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.oidoTapadoPlenitud === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.oidoTapadoPlenitud }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Antecedentes personales -->
    <div class="w-full" :class="sectionOutlineClass('antecedentes')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(8)">ANTECEDENTES PERSONALES</h2>
      <div class="flex flex-wrap gap-2">
        <!-- Tabla izquierda -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <table class="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-200">
                <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(8)" 
              :class="[rowOutlineClass(8), rowPinpointClass(8)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">OTITIS FRECUENTES EN INFANCIA</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.otitisFrecuentesInfancia === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.otitisFrecuentesInfancia }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(9)" 
              :class="[rowOutlineClass(9), rowPinpointClass(9)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">CIRUGÍAS DE OÍDO</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.cirugiasOido === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.cirugiasOido }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(10)" 
              :class="[rowOutlineClass(10), rowPinpointClass(10)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">TRAUMATISMO CRANEAL</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.traumatismoCranealBarotrauma === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.traumatismoCranealBarotrauma }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(11)" 
              :class="[rowOutlineClass(11), rowPinpointClass(11)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">USO DE AUDÍFONOS</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.usoAudifonos === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.usoAudifonos }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Tabla derecha -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <table class="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-200">
                <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(12)" 
              :class="[rowOutlineClass(12), rowPinpointClass(12)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">MENINGITIS U INFECCIÓN GRAVE</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.meningitisInfeccionGraveInfancia === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.meningitisInfeccionGraveInfancia }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(13)" 
              :class="[rowOutlineClass(13), rowPinpointClass(13)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">DIABETES</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.diabetes === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.diabetes }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(14)" 
              :class="[rowOutlineClass(14), rowPinpointClass(14)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ENFERMEDAD RENAL</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.enfermedadRenal === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.enfermedadRenal }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(15)" 
              :class="[rowOutlineClass(15), rowPinpointClass(15)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">MEDICAMENTOS OTOXICOS</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.medicamentosOtotoxicos === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.medicamentosOtotoxicos }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Exposición a ruido -->
    <div class="w-full" :class="sectionOutlineClass('exposicion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(16)">EXPOSICIÓN A RUIDO</h2>
      <div class="flex flex-wrap gap-2">
        <!-- Tabla izquierda -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <table class="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-200">
                <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(16)"
              :class="[rowOutlineClass(16), rowPinpointClass(16)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">TRABAJO EN AMBIENTES RUIDOSOS</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.trabajoAmbientesRuidosos === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.trabajoAmbientesRuidosos }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(17)"
              :class="[rowOutlineClass(17), rowPinpointClass(17)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">TIEMPO DE EXPOSICIÓN A RUIDO LABORAL</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                  {{ formData.formDataHistoriaOtologica.tiempoExposicionLaboral }}</td>
              </tr>
                <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(18)"
                :class="[rowOutlineClass(18), rowPinpointClass(18)]">
                  <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">USO DE PROTECCIÓN AUDITIVA</td>
                  <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                    :class="formData.formDataHistoriaOtologica.usoProteccionAuditiva === 'A VECES' ? 'text-orange-600 font-medium' : formData.formDataHistoriaOtologica.usoProteccionAuditiva === 'NUNCA' ? 'text-red-600 font-medium' : ''">
                    {{ formData.formDataHistoriaOtologica.usoProteccionAuditiva }}</td>
                </tr>
            </tbody>
          </table>
        </div>
        <!-- Tabla derecha -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <table class="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-200">
                <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(19)"
              :class="[rowOutlineClass(19), rowPinpointClass(19)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">MÚSICA FUERTE CON AUDÍFONOS</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.musicaFuerteAudifonos === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.musicaFuerteAudifonos }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(20)"
              :class="[rowOutlineClass(20), rowPinpointClass(20)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ARMAS DE FUEGO O PASATIEMPOS RUIDOSOS</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.armasFuegoPasatiemposRuidosos === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.armasFuegoPasatiemposRuidosos }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(21)"
              :class="[rowOutlineClass(21), rowPinpointClass(21)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">SERVICIO MILITAR</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.servicioMilitar === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.servicioMilitar }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sección inferior: Otros y Otoscopia lado a lado -->
    <div class="w-full" :class="sectionOutlineClass('otoscopia')">
      <div class="flex flex-wrap gap-2">
        <!-- Otros -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(22)">OTROS</h2>
          <table class="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-200">
                <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(22)"
              :class="[rowOutlineClass(22), rowPinpointClass(22)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ALERGIAS</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.alergias === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.alergias }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" @click="goToStep(23)"
              :class="[rowOutlineClass(23), rowPinpointClass(23)]">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">RESFRIADO DÍA DE PRUEBA</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.resfriadoDiaPrueba === 'SI' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.resfriadoDiaPrueba }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Otoscopia -->
        <div class="w-full md:w-[calc(50%-0.25rem)]">
          <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(24)">OTOSCOPIA</h2>
          <table class="table-auto w-full border-collapse border border-gray-200">
            <thead>
              <tr class="bg-gray-200">
                <th class="w-3/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
                <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" :class="[rowOutlineClass(24), rowPinpointClass(24)]" @click="goToStep(24)">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">OÍDO DERECHO</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.otoscopiaOidoDerecho === 'NO PERMEABLE' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.otoscopiaOidoDerecho }}</td>
              </tr>
              <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" style="height: 1.75rem;" :class="[rowOutlineClass(24), rowPinpointClass(24)]" @click="goToStep(24)">
                <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">OÍDO IZQUIERDO</td>
                <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300"
                  :class="formData.formDataHistoriaOtologica.otoscopiaOidoIzquierdo === 'NO PERMEABLE' ? 'text-red-600 font-medium' : ''">
                  {{ formData.formDataHistoriaOtologica.otoscopiaOidoIzquierdo }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Resultado cuestionario -->
    <div class="w-full" :class="sectionOutlineClass('resultado')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(25)">RESULTADO CUESTIONARIO</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <!-- Encabezado -->
          <tr class="bg-gray-200 cursor-pointer" :class="[rowOutlineClass(25), rowPinpointClass(25)]" @click="goToStep(25)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light text-center">
              AUDIOMETRIA
            </td>
          </tr>
          <!-- Fila combinada -->
          <tr class="bg-white cursor-pointer" :class="[rowOutlineClass(25), rowPinpointClass(25)]" @click="goToStep(25)">
            <td class="w-1/2 text-xl md:text-2xl px-2 py-0 border border-gray-300 text-center align-middle"
              style="height: calc(2 * 1.3rem);"
              :class="formData.formDataHistoriaOtologica.resultadoCuestionario === 'PROCEDENTE' ? 'text-green-600 font-medium' : formData.formDataHistoriaOtologica.resultadoCuestionario === 'PROCEDENTE CON PRECAUCIÓN' ? 'text-orange-600 font-medium' : (formData.formDataHistoriaOtologica.resultadoCuestionario === 'OTRO' || (formData.formDataHistoriaOtologica.resultadoCuestionario === '' && formData.formDataHistoriaOtologica.resultadoCuestionarioPersonalizado)) ? 'text-gray-600 font-medium' : 'text-red-600 font-medium'">
              {{ (formData.formDataHistoriaOtologica.resultadoCuestionario === 'OTRO' || (formData.formDataHistoriaOtologica.resultadoCuestionario === '' && formData.formDataHistoriaOtologica.resultadoCuestionarioPersonalizado)) && formData.formDataHistoriaOtologica.resultadoCuestionarioPersonalizado ? formData.formDataHistoriaOtologica.resultadoCuestionarioPersonalizado.toUpperCase() : formData.formDataHistoriaOtologica.resultadoCuestionario }}
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

.visualizador-historia-otologica div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-historia-otologica div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-historia-otologica tbody tr.cursor-pointer,
.visualizador-historia-otologica thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-historia-otologica tbody tr.cursor-pointer > td,
.visualizador-historia-otologica tbody tr.cursor-pointer > th,
.visualizador-historia-otologica thead tr.cursor-pointer > td,
.visualizador-historia-otologica thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-historia-otologica tbody tr.cursor-pointer:hover,
.visualizador-historia-otologica tbody tr.cursor-pointer:hover > td,
.visualizador-historia-otologica tbody tr.cursor-pointer:hover > th,
.visualizador-historia-otologica thead tr.cursor-pointer:hover,
.visualizador-historia-otologica thead tr.cursor-pointer:hover > td,
.visualizador-historia-otologica thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.visualizador-historia-otologica tbody tr.pinpoint-row > td,
.visualizador-historia-otologica tbody tr.pinpoint-row > th,
.visualizador-historia-otologica thead tr.pinpoint-row > td,
.visualizador-historia-otologica thead tr.pinpoint-row > th {
  background-color: #dbeafe !important;
}</style>

<style>
html.dark-mode .visualizador-historia-otologica div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-historia-otologica tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-historia-otologica tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-historia-otologica tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-historia-otologica thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-historia-otologica thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-historia-otologica thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-historia-otologica tbody tr.pinpoint-row > td,
html.dark-mode .visualizador-historia-otologica tbody tr.pinpoint-row > th,
html.dark-mode .visualizador-historia-otologica thead tr.pinpoint-row > td,
html.dark-mode .visualizador-historia-otologica thead tr.pinpoint-row > th {
  background-color: #1e4a7a !important;
}
</style>
