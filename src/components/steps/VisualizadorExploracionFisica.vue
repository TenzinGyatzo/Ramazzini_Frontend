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
import { useEfSectionsV2 } from '@/composables/useEfSectionsV2';
import {
  getEfSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/exploracionFisicaSections';
import { shouldShowPinpointVisual } from '@/helpers/sectionPinpointVisual';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => formData.formDataExploracionFisica.fechaExploracionFisica);
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const { efSectionsV2Enabled } = useEfSectionsV2();

const resolveNavStep = (legacyStep) => {
  if (efSectionsV2Enabled.value) {
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
  efSectionsV2Enabled.value &&
  steps.focusedLegacyStep === legacyStep &&
  shouldShowPinpointVisual({
    documentType: 'exploracionFisica',
    legacyStep,
  });

/** V1: highlight por fila. V2: no marcar filas (se usa outline de sección). */
const isActiveLegacyStep = (legacyStep) => {
  if (efSectionsV2Enabled.value) return false;
  return steps.currentStep === legacyStep;
};

/** V2: outline alrededor del bloque de sección completo. */
const isActiveSection = (sectionId) => {
  if (!efSectionsV2Enabled.value) return false;
  return steps.currentStep === getEfSectionIndex(sectionId);
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


</script>

<template>
  <div
    class="visualizador-exploracion-fisica flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataExploracionFisica.estado" 
        :fechaFinalizacion="formData.formDataExploracionFisica.fechaFinalizacion" 
        :finalizadoPor="formData.formDataExploracionFisica.finalizadoPor"
        :fechaAnulacion="formData.formDataExploracionFisica.fechaAnulacion"
        :anuladoPor="formData.formDataExploracionFisica.anuladoPor"
        :razonAnulacion="formData.formDataExploracionFisica.razonAnulacion"
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
          formatDateDDMMYYYY(formData.formDataExploracionFisica.fechaExploracionFisica) }}</span></p>
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

    <!-- Somatometría -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('somatometria')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(2)">SOMATOMETRÍA</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-2/5 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-left">Parámetro</th>
            <th class="w-1/5 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Especifique</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Categoría</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(2), rowPinpointClass(2)]" @click="goToStep(2)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">PESO</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.peso ? `${formData.formDataExploracionFisica.peso} kg` : '' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(2), rowPinpointClass(2)]" @click="goToStep(2)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ALTURA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.altura ? `${formData.formDataExploracionFisica.altura} m` : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(2), rowPinpointClass(2)]" @click="goToStep(2)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">ÍNDICE DE MASA CORPORAL</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.indiceMasaCorporal }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.categoriaIMC }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(2), rowPinpointClass(2)]" @click="goToStep(2)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">CIRCUNFERENCIA CINTURA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.circunferenciaCintura
                ? `${formData.formDataExploracionFisica.circunferenciaCintura} cm` : '' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.categoriaCircunferenciaCintura }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Signos Vitales -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('signosVitales')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(3)">SIGNOS VITALES</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-2/5 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-left">Parámetro</th>
            <th class="w-1/5 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Especifique</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Categoría</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(3), rowPinpointClass(3)]" @click="goToStep(3)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">TENSIÓN ARTERIAL</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.categoriaTensionArterial ?
                `${formData.formDataExploracionFisica.tensionArterialSistolica}/${formData.formDataExploracionFisica.tensionArterialDiastolica}
              mmHg` : '' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.categoriaTensionArterial }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(3), rowPinpointClass(3)]" @click="goToStep(3)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">FRECUENCIA CARDIACA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.frecuenciaCardiaca ?
                `${formData.formDataExploracionFisica.frecuenciaCardiaca} lpm` : '' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.categoriaFrecuenciaCardiaca }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(3), rowPinpointClass(3)]" @click="goToStep(3)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">FRECUENCIA RESPIRATORIA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.frecuenciaRespiratoria ?
                `${formData.formDataExploracionFisica.frecuenciaRespiratoria} rpm` : '' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.categoriaFrecuenciaRespiratoria }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(3), rowPinpointClass(3)]" @click="goToStep(3)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">SATURACIÓN DE OXÍGENO</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.saturacionOxigeno ?
                `${formData.formDataExploracionFisica.saturacionOxigeno} %` : '' }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.categoriaSaturacionOxigeno }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cabeza y Cuello -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(4)">CABEZA Y CUELLO</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(4)" 
            :class="[rowOutlineClass(4), rowPinpointClass(4)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">CRÁNEO CARA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.craneoCara }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(5)" 
            :class="[rowOutlineClass(5), rowPinpointClass(5)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">OJOS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.ojos }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(6)" 
            :class="[rowOutlineClass(6), rowPinpointClass(6)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">OÍDOS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.oidos }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(7)" 
            :class="[rowOutlineClass(7), rowPinpointClass(7)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">NARIZ</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.nariz }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(8)" 
            :class="[rowOutlineClass(8), rowPinpointClass(8)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">BOCA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.boca }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(9)" 
            :class="[rowOutlineClass(9), rowPinpointClass(9)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">CUELLO</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.cuello }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Extremidades Superiores -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(10)">EXTREMIDADES SUPERIORES</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(10)"
            :class="[rowOutlineClass(10), rowPinpointClass(10)]"
            style="height: 1.57rem;">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">HOMBROS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.hombros }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(11)"
            :class="[rowOutlineClass(11), rowPinpointClass(11)]" 
            style="height: 1.57rem;">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">CODOS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.codos }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(12)" 
            :class="[rowOutlineClass(12), rowPinpointClass(12)]" 
            style="height: 1.57rem;">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">MANOS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.manos }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(13)" 
            :class="[rowOutlineClass(13), rowPinpointClass(13)]" 
            style="height: 1.57rem;">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">REFLEJOS O.T.</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.reflejosOsteoTendinososSuperiores }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(14)" 
            :class="[rowOutlineClass(14), rowPinpointClass(14)]" 
            style="height: 1.57rem;">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">VASCULAR</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.vascularESuperiores }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tórax -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(15)">TÓRAX</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" 
            :class="[rowOutlineClass(15), rowPinpointClass(15)]" 
            @click="goToStep(15)">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">TÓRAX</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.torax }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Abdomen -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(16)">ABDOMEN</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" 
            :class="[rowOutlineClass(16), rowPinpointClass(16)]"
            @click="goToStep(16)">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">ABDOMEN</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.abdomen }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Extremidades Inferiores -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(17)">EXTREMIDADES INFERIORES</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(17)"
          :class="[rowOutlineClass(17), rowPinpointClass(17)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">CADERA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.cadera }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(18)"
          :class="[rowOutlineClass(18), rowPinpointClass(18)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">RODILLAS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.rodillas }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(19)"
          :class="[rowOutlineClass(19), rowPinpointClass(19)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">TOBILLOS-PIES</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.tobillosPies }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(20)"
          :class="[rowOutlineClass(20), rowPinpointClass(20)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">REFLEJOS O.T.</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.reflejosOsteoTendinososInferiores }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(21)"
          :class="[rowOutlineClass(21), rowPinpointClass(21)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">VASCULAR</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.vascularEInferiores }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Columna -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(22)">COLUMNA</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(22)"
            :class="[rowOutlineClass(22), rowPinpointClass(22)]"
            style="height: 3.25rem;">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">INSPECCIÓN</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.inspeccionColumna }}</td>
          </tr>
          <tr 
            class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(23)" 
            :class="[rowOutlineClass(23), rowPinpointClass(23)]"
            style="height: 3.25rem;">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">MOVIMIENTOS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.movimientosColumna }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Piel -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(24)">PIEL</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(24)" style="height: 1.75rem;"
          :class="[rowOutlineClass(24), rowPinpointClass(24)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">LESIONES</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.lesionesPiel }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(25)" style="height: 1.75rem;"
          :class="[rowOutlineClass(25), rowPinpointClass(25)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">CICATRICES</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.cicatrices }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(26)" style="height: 1.75rem;"
          :class="[rowOutlineClass(26), rowPinpointClass(26)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">NEVOS</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.nevos }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Neurológico -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('exploracion')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(27)">NEUROLÓGICO</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="w-1/4 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">-</th>
            <th class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">Hallazgos</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(27)"
            :class="[rowOutlineClass(27), rowPinpointClass(27)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">COORDINACIÓN</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.coordinacion }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(28)"
            :class="[rowOutlineClass(28), rowPinpointClass(28)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">SENSIBILIDAD</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.sensibilidad }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(29)" 
            :class="[rowOutlineClass(29), rowPinpointClass(29)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">EQUILIBRIO</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.equilibrio }}</td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(30)"
            :class="[rowOutlineClass(30), rowPinpointClass(30)]">
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300 font-medium">MARCHA</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExploracionFisica.marcha }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Resumen de Exploración Física -->
    <div class="w-full" :class="[sectionOutlineClass('resumen'), rowOutlineClass(31), rowPinpointClass(31)]">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(31)">RESUMEN EXPLORACIÓN FÍSICA</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <!-- Encabezado -->
          <tr class="bg-gray-200 cursor-pointer" :class="[rowOutlineClass(31), rowPinpointClass(31)]" @click="goToStep(31)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light text-center">
              RESUMEN
            </td>
          </tr>
          <!-- Fila combinada -->
          <tr class="bg-white cursor-pointer" :class="[rowOutlineClass(31), rowPinpointClass(31)]" @click="goToStep(31)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center align-middle"
              style="height: calc(2 * 1.3rem);">
              {{ formData.formDataExploracionFisica.resumenExploracionFisica }}
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

.visualizador-exploracion-fisica div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-exploracion-fisica div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-exploracion-fisica tbody tr.cursor-pointer,
.visualizador-exploracion-fisica thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-exploracion-fisica tbody tr.cursor-pointer > td,
.visualizador-exploracion-fisica tbody tr.cursor-pointer > th,
.visualizador-exploracion-fisica thead tr.cursor-pointer > td,
.visualizador-exploracion-fisica thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-exploracion-fisica tbody tr.cursor-pointer:hover,
.visualizador-exploracion-fisica tbody tr.cursor-pointer:hover > td,
.visualizador-exploracion-fisica tbody tr.cursor-pointer:hover > th,
.visualizador-exploracion-fisica thead tr.cursor-pointer:hover,
.visualizador-exploracion-fisica thead tr.cursor-pointer:hover > td,
.visualizador-exploracion-fisica thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.visualizador-exploracion-fisica tbody tr.pinpoint-row > td,
.visualizador-exploracion-fisica tbody tr.pinpoint-row > th,
.visualizador-exploracion-fisica thead tr.pinpoint-row > td,
.visualizador-exploracion-fisica thead tr.pinpoint-row > th {
  background-color: #dbeafe !important;
}</style>

<style>
html.dark-mode .visualizador-exploracion-fisica div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-exploracion-fisica tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-exploracion-fisica tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-exploracion-fisica tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-exploracion-fisica thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-exploracion-fisica thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-exploracion-fisica thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-exploracion-fisica tbody tr.pinpoint-row > td,
html.dark-mode .visualizador-exploracion-fisica tbody tr.pinpoint-row > th,
html.dark-mode .visualizador-exploracion-fisica thead tr.pinpoint-row > td,
html.dark-mode .visualizador-exploracion-fisica thead tr.pinpoint-row > th {
  background-color: #1e4a7a !important;
}
</style>
