<script setup>
import { ref, computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularEdad, calcularAntiguedad, convertirFechaISOaDDMMYYYY, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';
import { useHcSectionsV2 } from '@/composables/useHcSectionsV2';
import {
  getHcSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/historiaClinicaSections';
import { shouldShowPinpointVisual } from '@/helpers/sectionPinpointVisual';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formDataPinia = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);
const { hcSectionsV2Enabled } = useHcSectionsV2();

/** Evita fallos si el payload o el store aún no son un objeto (p. ej. tras recargar). */
const historiaClinicaData = computed(() => {
  const raw = formDataPinia.formDataHistoriaClinica;
  return raw != null && typeof raw === 'object' ? raw : {};
});

const resolveNavStep = (legacyStep) => {
  if (hcSectionsV2Enabled.value) {
    return legacyStepToSectionIndex(
      legacyStep,
      trabajadores.currentTrabajador?.sexo,
    );
  }
  return legacyStep;
};

/** Fila/campo: navega a sección + pinpoint del microstep. */
const goToStep = (stepNumber) => {
  steps.goToSection(resolveNavStep(stepNumber), stepNumber);
};

/** Título de sección: navega sin pinpoint (solo outline de sección). */
const goToSectionOnly = (stepNumber) => {
  steps.goToSection(resolveNavStep(stepNumber), null);
};

/** V1: highlight por fila (outline amarillo). */
const isActiveLegacyStep = (legacyStep) => {
  if (hcSectionsV2Enabled.value) return false;
  const sexo = trabajadores.currentTrabajador?.sexo;
  if (sexo !== 'Femenino' && legacyStep >= 42 && legacyStep <= 46) {
    return steps.currentStep + 14 === legacyStep;
  }
  return steps.currentStep === legacyStep;
};

/** V2: fila pinneada (fondo azul). Omitir en secciones singleton. */
const isPinnedLegacyStep = (legacyStep) =>
  hcSectionsV2Enabled.value &&
  steps.focusedLegacyStep === legacyStep &&
  shouldShowPinpointVisual({
    documentType: 'historiaClinica',
    legacyStep,
    sexo: trabajadores.currentTrabajador?.sexo,
  });

/** V2: outline alrededor del bloque de sección completo. */
const isActiveSection = (sectionId) => {
  if (!hcSectionsV2Enabled.value) return false;
  return (
    steps.currentStep ===
    getHcSectionIndex(sectionId, trabajadores.currentTrabajador?.sexo)
  );
};

const sectionOutlineClass = (sectionId) =>
  isActiveSection(sectionId)
    ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md'
    : '';

const rowOutlineClass = (legacyStep) =>
  isActiveLegacyStep(legacyStep)
    ? 'outline outline-2 outline-yellow-500 rounded-md'
    : '';

const rowPinpointClass = (legacyStep) =>
  isPinnedLegacyStep(legacyStep) ? 'pinpoint-row' : '';


const antecedentesHeredoFamiliares = ref([
  { name: 'NEFROPATÍAS', step: 2, key: 'nefropatias', specifyKey: 'nefropatiasEspecificar' },
  { name: 'DIABÉTICOS', step: 3, key: 'diabeticos', specifyKey: 'diabeticosEspecificar' },
  { name: 'HIPERTENSIVOS', step: 4, key: 'hipertensivos', specifyKey: 'hipertensivosEspecificar' },
  { name: 'CARDIOPÁTICOS', step: 5, key: 'cardiopaticos', specifyKey: 'cardiopaticosEspecificar' },
  { name: 'NEOPLÁSICOS', step: 6, key: 'neoplasicos', specifyKey: 'neoplasicosEspecificar' },
  { name: 'PSIQUÁTRICOS', step: 7, key: 'psiquiatricos', specifyKey: 'psiquiatricosEspecificar' },
  { name: 'EPILÉPTICOS', step: 8, key: 'epilepticos', specifyKey: 'epilepticosEspecificar' },
  { name: 'AUTOINMUNES', step: 9, key: 'autoinmunes', specifyKey: 'autoinmunesEspecificar' },
  { name: 'TUBERCULOSIS', step: 10, key: 'tuberculosis', specifyKey: 'tuberculosisEspecificar' },
  { name: 'HEPATOPATÍAS', step: 11, key: 'hepatopatias', specifyKey: 'hepatopatiasEspecificar' },
]);

const antecedentesPersonalesPatologicos = ref([
  { name: 'LUMBALGIAS', step: 12, key: 'lumbalgias', specifyKey: 'lumbalgiasEspecificar' },
  { name: 'DIABÉTICOS', step: 13, key: 'diabeticosPP', specifyKey: 'diabeticosPPEspecificar' },
  { name: 'CARDIOPÁTICOS', step: 14, key: 'cardiopaticosPP', specifyKey: 'cardiopaticosPPEspecificar' },
  { name: 'ALÉRGICOS', step: 15, key: 'alergicos', specifyKey: 'alergicosEspecificar' },
  { name: 'HIPERTENSIVOS', step: 16, key: 'hipertensivosPP', specifyKey: 'hipertensivosPPEspecificar' },
  { name: 'RESPIRATORIOS', step: 17, key: 'respiratorios', specifyKey: 'respiratoriosEspecificar' },
  { name: 'EPILÉPTICOS', step: 18, key: 'epilepticosPP', specifyKey: 'epilepticosPPEspecificar' },
  { name: 'ACCIDENTES', step: 19, key: 'accidentes', specifyKey: 'accidentesEspecificar' },
  { name: 'QUIRÚRGICOS', step: 20, key: 'quirurgicos', specifyKey: 'quirurgicosEspecificar' },
  { name: 'OTROS', step: 21, key: 'otros', specifyKey: 'otrosEspecificar' },
]);

const antecedentesPersonalesNoPatologicos = ref([
  { name: 'ALCOHOLISMO', step: 22, key: 'alcoholismo', specifyKey: 'alcoholismoEspecificar' },
  { name: 'TABAQUISMO', step: 23, key: 'tabaquismo', specifyKey: 'tabaquismoEspecificar' },
  { name: 'TOXICOMANIAS', step: 24, key: 'toxicomanias', specifyKey: 'toxicomaniasEspecificar' },
]);

const antecedentesPersonalesNoPatologicosParte2 = ref([
  { name: 'ALIMENTACIÓN', step: 25, key: 'alimentacionDeficiente', specifyKey: 'alimentacionDeficienteEspecificar' },
  { name: 'ACTIVIDAD FÍSICA', step: 26, key: 'actividadFisicaDeficiente', specifyKey: 'actividadFisicaDeficienteEspecificar' },
  { name: 'HIGIENE PERSONAL', step: 27, key: 'higienePersonalDeficiente', specifyKey: 'higienePersonalDeficienteEspecificar' },
]);

const antecedentesLaborales = ref([
  { number: '1', step: 42, empresa: 'empresaAnterior1', puesto: 'puestoAnterior1', antiguedad: 'antiguedadAnterior1', agentes: 'agentesAnterior1' },
  { number: '2', step: 43, empresa: 'empresaAnterior2', puesto: 'puestoAnterior2', antiguedad: 'antiguedadAnterior2', agentes: 'agentesAnterior2' },
  { number: '3', step: 44, empresa: 'empresaAnterior3', puesto: 'puestoAnterior3', antiguedad: 'antiguedadAnterior3', agentes: 'agentesAnterior3' },
]);

</script>

<template>
  <div
    class="visualizador-historia-clinica flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa, Fecha y Motivo del Examen -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="historiaClinicaData.estado" 
        :fechaFinalizacion="historiaClinicaData.fechaFinalizacion" 
        :finalizadoPor="historiaClinicaData.finalizadoPor"
        :fechaAnulacion="historiaClinicaData.fechaAnulacion"
        :anuladoPor="historiaClinicaData.anuladoPor"
        :razonAnulacion="historiaClinicaData.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Empresa -->
      <div class="w-full md:w-auto md:flex-1 text-center">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa?.nombreComercial ?? '' }}
        </p>
      </div>

      <!-- Fecha y Motivo del Examen -->
      <div
        class="w-full md:w-auto md:flex-1 flex flex-wrap gap-2 justify-start md:justify-end text-sm sm:text-base cursor-pointer"
        :class="[
          isActiveLegacyStep(1) || isActiveSection('motivo')
            ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md'
            : '',
          isPinnedLegacyStep(1) ? 'pinpoint-block' : '',
        ]"
        @click="goToStep(1)">
        <p class="flex-1 md:flex-none">Ingreso ( {{ historiaClinicaData.motivoExamen === 'Ingreso' ? 'X' :
          '&nbsp;' }} )</p>
        <p class="flex-1 md:flex-none">Inicial ( {{ historiaClinicaData.motivoExamen === 'Inicial' ? 'X' :
          '&nbsp;' }} )</p>
        <p class="flex-1 md:flex-none">Periódico ( {{ historiaClinicaData.motivoExamen === 'Periódico' ?
          'X' : '&nbsp;' }} )</p>
        <p class="w-full md:w-auto text-right">Fecha: <span class="font-medium">{{
          formatDateDDMMYYYY(historiaClinicaData.fechaHistoriaClinica) }}</span></p>
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
              {{ convertirFechaISOaDDMMYYYY(trabajadores.currentTrabajador?.fechaNacimiento) }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESCOLARIDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.escolaridad ?? '' }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{
                trabajadores.currentTrabajador?.fechaNacimiento
                  ? calcularEdad(trabajadores.currentTrabajador.fechaNacimiento)
                  : ''
              }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PUESTO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.puesto ?? '' }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              SEXO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.sexo ?? '' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ANTIGUEDAD
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ calcularAntiguedad(trabajadores.currentTrabajador?.fechaIngreso ?? '') }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              TELÉFONO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.telefono ?? '' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ESTADO CIVIL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.estadoCivil ?? '' }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              NUM. EMPLEADO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.numeroEmpleado || 'No asignado' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              CONTACTO DE EMERGENCIA
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.contactoEmergenciaNombre ?? '' }}
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              TEL. CONTACTO EMERGENCIA
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">
              {{ trabajadores.currentTrabajador?.contactoEmergenciaTelefono ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Heredofamiliares -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('heredofamiliares')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(2)">Antecedentes Heredofamiliares</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-left">-</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Sí</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">No</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Especifique</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in antecedentesHeredoFamiliares" :key="index"
            :class="[
              index % 2 === 0 ? 'bg-gray-50 cursor-pointer' : 'bg-white cursor-pointer',
              rowOutlineClass(item.step),
              rowPinpointClass(item.step),
            ]"
            @click="goToStep(item.step)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">{{ item.name }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'Si' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'No' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.specifyKey] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Personales Patológicos -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('patologicos')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(12)">Antecedentes Personales Patológicos</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-left">-</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Sí</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">No</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Especifique</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in antecedentesPersonalesPatologicos" :key="index"
            :class="[
              index % 2 === 0 ? 'bg-gray-50 cursor-pointer' : 'bg-white cursor-pointer',
              rowOutlineClass(item.step),
              rowPinpointClass(item.step),
            ]"
            @click="goToStep(item.step)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">{{ item.name }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'Si' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'No' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.specifyKey] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Personales No Patológicos -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('noPatologicos')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(22)">Antecedentes Personales No Patológicos</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-left">-</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Sí</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">No</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Especifique</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in antecedentesPersonalesNoPatologicos" :key="index"
            :class="[
              index % 2 === 0 ? 'bg-gray-50 cursor-pointer' : 'bg-white cursor-pointer',
              rowOutlineClass(item.step),
              rowPinpointClass(item.step),
            ]"
            @click="goToStep(item.step)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">{{ item.name }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'Si' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'No' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.specifyKey] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Personales No Patológicos Parte 2 -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('noPatologicos')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(25)">Antecedentes Personales No Patológicos</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-left">-</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Sí</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">No</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Especifique</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in antecedentesPersonalesNoPatologicosParte2" :key="index"
            :class="[
              index % 2 === 0 ? 'bg-gray-50 cursor-pointer' : 'bg-white cursor-pointer',
              rowOutlineClass(item.step),
              rowPinpointClass(item.step),
            ]"
            @click="goToStep(item.step)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium">{{ item.name }}</td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'Si' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.key] === 'No' ? 'XX' : '' }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.specifyKey] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Gineco Obstétricos -->
    <div v-if="trabajadores.currentTrabajador?.sexo === 'Femenino'" class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('ginecoObstetricos')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(28)">Antecedentes Gineco Obstétricos</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(28), rowPinpointClass(28)]" @click="goToStep(28)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              MENARCA
            </td>
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.menarca }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(29), rowPinpointClass(29)]" @click="goToStep(29)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              DURACIÓN PROMEDIO
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.duracionPromedio }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(30), rowPinpointClass(30)]" @click="goToStep(30)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              FRECUENCIA
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.frecuencia }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(31), rowPinpointClass(31)]" @click="goToStep(31)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              GESTAS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.gestas }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(32), rowPinpointClass(32)]" @click="goToStep(32)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PARTOS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.partos }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(33), rowPinpointClass(33)]" @click="goToStep(33)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              CESÁREAS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.cesareas }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(34), rowPinpointClass(34)]" @click="goToStep(34)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ABORTOS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.abortos }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Gineco Obstétricos Parte 2 -->
    <div v-if="trabajadores.currentTrabajador?.sexo === 'Femenino'" class="w-full md:w-[calc(50%-0.5rem)]" :class="sectionOutlineClass('ginecoObstetricos')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(35)">Antecedentes Gineco Obstétricos</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(35), rowPinpointClass(35)]" @click="goToStep(35)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              F. U. MENSTRUACIÓN
            </td>
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.fechaUltimaRegla }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(36), rowPinpointClass(36)]" @click="goToStep(36)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              DOLOR MENSTRUAL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.dolorMenstrual }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(37), rowPinpointClass(37)]" @click="goToStep(37)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              EMBARAZO ACTUAL
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.embarazoActual }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(38), rowPinpointClass(38)]" @click="goToStep(38)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              VIDA SEXUAL ACTIVA
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.vidaSexualActiva }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(39), rowPinpointClass(39)]" @click="goToStep(39)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PLANIFICACIÓN FAMILIAR
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.planificacionFamiliar }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(40), rowPinpointClass(40)]" @click="goToStep(40)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ÚLTIMO PAPANICOLAOU
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.fechaUltimoPapanicolaou }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="[rowOutlineClass(41), rowPinpointClass(41)]" @click="goToStep(41)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ÚLTIMA MASTROGRAFÍA
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ historiaClinicaData.fechaUltimaMastografia }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Laborales -->
    <div class="w-full" :class="sectionOutlineClass('laborales')">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(42)">Antecedentes Laborales</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">#</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Empresa</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Puesto</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Antiguedad</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">Agentes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in antecedentesLaborales" :key="index"
            :class="[
              index % 2 === 0 ? 'bg-gray-50 cursor-pointer' : 'bg-white cursor-pointer',
              rowOutlineClass(item.step),
              rowPinpointClass(item.step),
            ]"
            @click="goToStep(item.step)">
            <td class="w-1/10 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-medium text-center">{{ item.number }}</td>
            <td class="w-1/5 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.empresa] }}
            </td>
            <td class="w-1/5 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.puesto] }}
            </td>
            <td class="w-1/5 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.antiguedad] }}
            </td>
            <td class="w-2/5 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ historiaClinicaData[item.agentes] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes de Riesgos de Trabajo -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="[sectionOutlineClass('laborales'), isActiveLegacyStep(45) ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-sm' : '']">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(45)">Antecedentes Laborales</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
      <tbody>
        <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="rowPinpointClass(45)" @click="goToStep(45)">
        <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
          RIESGO DE TRABAJO
        </td>
        <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300">
          {{ historiaClinicaData.accidenteLaboral }}
        </td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="rowPinpointClass(45)" @click="goToStep(45)">
        <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
          DESCRIPCIÓN RIESGO DE TRABAJO
        </td>
        <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
          {{ historiaClinicaData.accidenteLaboralEspecificar }}
        </td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="rowPinpointClass(45)" @click="goToStep(45)">
        <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
          DESCRIPCIÓN DEL DAÑO
        </td>
        <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
          {{ historiaClinicaData.descripcionDelDano }}
        </td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="rowPinpointClass(45)" @click="goToStep(45)">
        <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
          SECUELAS
        </td>
        <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
          {{ historiaClinicaData.secuelas }}
        </td>
        </tr>
      </tbody>
      </table>
    </div>

    <!-- Resumen de Historia Clínica -->
    <div class="w-full md:w-[calc(50%-0.5rem)]" :class="[sectionOutlineClass('resumen'), isActiveLegacyStep(46) ? 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-sm' : '']">
      <h2 class="text-lg font-medium mb-1 text-center cursor-pointer" @click="goToSectionOnly(46)">Resumen de Historia Clínica</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <!-- Encabezado -->
          <tr class="bg-gray-200 cursor-pointer" :class="rowPinpointClass(46)" @click="goToStep(46)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light text-center">
              RESUMEN
            </td>
          </tr>
          <!-- Fila combinada -->
          <tr class="bg-white cursor-pointer" :class="rowPinpointClass(46)" @click="goToStep(46)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center align-middle" rowspan="3"
              style="height: calc(3 * 1.3rem);">
              {{ historiaClinicaData.resumenHistoriaClinica }}
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

/* Tema claro: resaltar fila completa (fondo en celdas; el <tr> solo no basta en tablas). */
.visualizador-historia-clinica div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-historia-clinica div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-historia-clinica tbody tr.cursor-pointer,
.visualizador-historia-clinica thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-historia-clinica tbody tr.cursor-pointer > td,
.visualizador-historia-clinica tbody tr.cursor-pointer > th,
.visualizador-historia-clinica thead tr.cursor-pointer > td,
.visualizador-historia-clinica thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-historia-clinica tbody tr.cursor-pointer:hover,
.visualizador-historia-clinica tbody tr.cursor-pointer:hover > td,
.visualizador-historia-clinica tbody tr.cursor-pointer:hover > th,
.visualizador-historia-clinica thead tr.cursor-pointer:hover,
.visualizador-historia-clinica thead tr.cursor-pointer:hover > td,
.visualizador-historia-clinica thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.visualizador-historia-clinica tbody tr.pinpoint-row > td,
.visualizador-historia-clinica tbody tr.pinpoint-row > th,
.visualizador-historia-clinica thead tr.pinpoint-row > td,
.visualizador-historia-clinica thead tr.pinpoint-row > th {
  background-color: #dbeafe !important; /* blue-100 */
}

.visualizador-historia-clinica .pinpoint-block {
  background-color: #dbeafe !important;
}
</style>

<style>
/* Tema oscuro: mismo efecto hover, más visible y aplicado a celdas y bloques clicables. */
html.dark-mode .visualizador-historia-clinica div.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-historia-clinica tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-historia-clinica tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-historia-clinica tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-historia-clinica thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-historia-clinica thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-historia-clinica thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-historia-clinica tbody tr.pinpoint-row > td,
html.dark-mode .visualizador-historia-clinica tbody tr.pinpoint-row > th,
html.dark-mode .visualizador-historia-clinica thead tr.pinpoint-row > td,
html.dark-mode .visualizador-historia-clinica thead tr.pinpoint-row > th,
html.dark-mode .visualizador-historia-clinica .pinpoint-block {
  background-color: #1e4a7a !important;
}
</style>
