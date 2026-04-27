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

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// Obtener el país del proveedor de salud
const proveedorSalud = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('proveedorSalud')) || null;
  } catch {
    return null;
  }
});

const paisProveedor = computed(() => proveedorSalud.value?.pais || '');
const esGuatemala = computed(() => paisProveedor.value === 'GT');

function formatearAgudezaVisual(valor, cegueraTotal) {
  if (cegueraTotal) return 'Ceguera Total';
  if (valor == null || valor === '') return 'NA';
  return `20/${valor}`;
}

const ciegaOI = computed(() => formData.formDataExamenVista.ojoIzquierdoCegueraTotal ?? formData.formDataExamenVista.ojoIzquierdoLejanaCegueraTotal ?? formData.formDataExamenVista.ojoIzquierdoCercanaCegueraTotal ?? false);
const ciegaOD = computed(() => formData.formDataExamenVista.ojoDerechoCegueraTotal ?? formData.formDataExamenVista.ojoDerechoLejanaCegueraTotal ?? formData.formDataExamenVista.ojoDerechoCercanaCegueraTotal ?? false);
const avLejanaOI = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoIzquierdoLejanaSinCorreccion, ciegaOI.value));
const avLejanaOD = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoDerechoLejanaSinCorreccion, ciegaOD.value));
const avCercanaOI = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoIzquierdoCercanaSinCorreccion, ciegaOI.value));
const avCercanaOD = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoDerechoCercanaSinCorreccion, ciegaOD.value));
const avLejanaConOI = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoIzquierdoLejanaConCorreccion, ciegaOI.value));
const avLejanaConOD = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoDerechoLejanaConCorreccion, ciegaOD.value));
const avCercanaConOI = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoIzquierdoCercanaConCorreccion, ciegaOI.value));
const avCercanaConOD = computed(() => formatearAgudezaVisual(formData.formDataExamenVista.ojoDerechoCercanaConCorreccion, ciegaOD.value));

// Mapping de steps según país: Guatemala tiene Fecha primero, luego 3 steps GT, luego el resto
const stepFecha = computed(() => 1);
const stepAntecedentes = computed(() => 2);
const stepAnamnesis = computed(() => 3);
const stepUtilizaAnteojos = computed(() => 4);
const stepAVLejana = computed(() => (esGuatemala.value ? 5 : 2));
const stepAVCercana = computed(() => (esGuatemala.value ? 6 : 3));
const stepAVConLejana = computed(() => (esGuatemala.value ? 7 : 4));
const stepAVConCercana = computed(() => (esGuatemala.value ? 8 : 5));
const stepIshihara = computed(() => (esGuatemala.value ? 9 : 6));
const stepFuncionOcular = computed(() => 10);
const stepReceta = computed(() => 11);
const stepDiagnostico = computed(() => 12);
</script>

<template>
  <div
    class="visualizador-examen-vista flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataExamenVista.estado" 
        :fechaFinalizacion="formData.formDataExamenVista.fechaFinalizacion" 
        :finalizadoPor="formData.formDataExamenVista.finalizadoPor"
        :fechaAnulacion="formData.formDataExamenVista.fechaAnulacion"
        :anuladoPor="formData.formDataExamenVista.anuladoPor"
        :razonAnulacion="formData.formDataExamenVista.razonAnulacion"
        class="mt-1 flex-shrink-0"
      />
      <!-- Empresa -->
      <div class="w-full md:w-auto md:flex-1 text-center">
        <p class="text-center text-base sm:text-lg">
          {{ empresas.currentEmpresa.nombreComercial }}
        </p>
      </div>

      <!-- Fecha -->
      <div class="w-full md:w-[calc(25%-0.5rem)] flex flex-wrap gap-2 justify-end text-sm sm:text-base cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepFecha }"
        @click="goToStep(stepFecha)">
        <p class="w-full md:w-auto">Fecha: <span class="font-medium">{{
          formatDateDDMMYYYY(formData.formDataExamenVista.fechaExamenVista) }}</span></p>
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
              {{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Secciones Guatemala (después de Trabajador) -->
    <template v-if="esGuatemala">
      <!-- Antecedentes y Anamnesis: misma fila, dos columnas (siempre visibles para GT) -->
      <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="w-full">
          <h2 class="text-lg font-medium mb-1 text-center">Antecedentes</h2>
          <div class="border border-gray-200 rounded-md p-3 cursor-pointer min-h-[3rem]"
            @click="goToStep(stepAntecedentes)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAntecedentes }">
            <p class="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
              {{ formData.formDataExamenVista.antecedentes || ' ' }}
            </p>
          </div>
        </div>
        <div class="w-full">
          <h2 class="text-lg font-medium mb-1 text-center">Anamnesis</h2>
          <div class="border border-gray-200 rounded-md p-3 cursor-pointer min-h-[3rem]"
            @click="goToStep(stepAnamnesis)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAnamnesis }">
            <p class="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
              {{ formData.formDataExamenVista.anamnesis || ' ' }}
            </p>
          </div>
        </div>
      </div>
      <!-- Utiliza anteojos: siempre visible para GT -->
      <div class="w-full flex flex-wrap gap-0 md:gap-8 justify-start xl:justify-evenly text-sm sm:text-base">
        <p class="w-full md:w-auto cursor-pointer" @click="goToStep(stepUtilizaAnteojos)"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepUtilizaAnteojos }">
          Utiliza Lentes: (
          <span class="font-medium">{{ formData.formDataExamenVista.utilizaAnteojos || 'No' }}</span> )
        </p>
      </div>
    </template>

    <!-- Agudeza Visual Sin Corrección -->
    <div class="w-full">
      <h2 class="text-lg font-medium mb-1 text-center">Agudeza Visual Sin Corrección</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">-</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">OJO IZQUIERDO</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">OJO DERECHO</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">INTERPRETACIÓN</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepAVLejana)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAVLejana }">
            <td class="w-1/6 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">LEJANA</td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avLejanaOI }}
            </td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avLejanaOD }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExamenVista.sinCorreccionLejanaInterpretacion }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepAVCercana)"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAVCercana }">
            <td class="w-1/6 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">CERCANA</td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avCercanaOI }}
            </td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avCercanaOD }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExamenVista.sinCorreccionCercanaInterpretacion }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Requiere Lentes -->
    <div class="w-full flex flex-wrap gap-0 md:gap-8 justify-start xl:justify-evenly text-sm sm:text-base">
      <p class="w-full md:w-auto cursor-pointer" @click="goToStep(stepAVLejana)"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAVLejana }">
        Requiere Lentes para Uso General: (
        <span class="font-medium">{{ formData.formDataExamenVista.requiereLentesUsoGeneral }}</span> )
      </p>
      <p class="w-full md:w-auto cursor-pointer" @click="goToStep(stepAVCercana)"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAVCercana }">
        Requiere Lentes para Lectura: (
        <span class="font-medium">{{ formData.formDataExamenVista.requiereLentesParaLectura }}</span> )
      </p>
    </div>

    <!-- Agudeza Visual Con Corrección -->
    <div class="w-full">
      <h2 class="text-lg font-medium mb-1 text-center">Agudeza Visual Con Corrección</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">-</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">OJO IZQUIERDO</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">OJO DERECHO</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">INTERPRETACIÓN</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepAVConLejana)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAVConLejana }">
            <td class="w-1/6 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">LEJANA</td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avLejanaConOI }}
            </td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avLejanaConOD }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExamenVista.conCorreccionLejanaInterpretacion ? 
                formData.formDataExamenVista.conCorreccionLejanaInterpretacion : 'NA' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepAVConCercana)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepAVConCercana }">
            <td class="w-1/6 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">CERCANA</td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avCercanaConOI }}
            </td>
            <td class="w-1/6 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ avCercanaConOD }}
            </td>
            <td class="text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExamenVista.conCorreccionCercanaInterpretacion ?
                formData.formDataExamenVista.conCorreccionCercanaInterpretacion : 'NA' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Prueba de Ishihara -->
    <div class="w-full">
      <h2 class="text-lg font-medium mb-1 text-center">Prueba de Ishihara</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <thead>
          <tr class="bg-gray-200">
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">PLACAS CORRECTAS</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">PORCENTAJE</th>
            <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">INTERPRETACIÓN</th>
          </tr>
        </thead>
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepIshihara)"
            :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepIshihara }">
            <td class="w-1/3 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">
              {{ formData.formDataExamenVista.placasCorrectas ?
                formData.formDataExamenVista.placasCorrectas + ' de 14': '&nbsp;' }}
            </td>
            <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExamenVista.porcentajeIshihara ?
                formData.formDataExamenVista.porcentajeIshihara + ' %': '' }}
            </td>
            <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
              {{ formData.formDataExamenVista.interpretacionIshihara }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Secciones adicionales solo para Guatemala -->
    <template v-if="esGuatemala">
      <!-- Pruebas de función ocular -->
      <div class="w-full">
        <h2 class="text-lg font-medium mb-1 text-center">Pruebas de Función Ocular</h2>
        <table class="table-auto w-full border-collapse border border-gray-200">
          <thead>
            <tr class="bg-gray-200">
              <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">TEST DE ESTEREOPSIS</th>
              <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">CAMPOS VISUALES</th>
              <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">COVER TEST</th>
            </tr>
          </thead>
          <tbody>
            <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepFuncionOcular)"
              :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepFuncionOcular }">
              <td class="w-1/3 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300">
                {{ formData.formDataExamenVista.testEstereopsis || '\u00A0' }}
              </td>
              <td class="w-1/3 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300">
                {{ formData.formDataExamenVista.testCampoVisual || '\u00A0' }}
              </td>
              <td class="w-1/3 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300">
                {{ formData.formDataExamenVista.coverTest || '\u00A0' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Receta Final -->
      <div class="w-full">
        <h2 class="text-lg font-medium mb-1 text-center">Receta Final</h2>
        <table class="table-auto w-full border-collapse border border-gray-200"
        @click="goToStep(stepReceta)"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepReceta }">
          <thead>
            <tr class="bg-gray-200">
              <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">-</th>
              <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">OJO IZQUIERDO</th>
              <th class="text-xs sm:text-sm px-2 py-0 border border-gray-300 text-center">OJO DERECHO</th>
            </tr>
          </thead>
          <tbody>
            <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepReceta)">
              <td class="w-1/6 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">ESFERA</td>
              <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                {{ formData.formDataExamenVista.esferaOjoIzquierdo || ' ' }}
              </td>
              <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                {{ formData.formDataExamenVista.esferaOjoDerecho || ' ' }}
              </td>
            </tr>
            <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepReceta)">
              <td class="w-1/6 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">CILINDRO</td>
              <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                {{ formData.formDataExamenVista.cilindroOjoIzquierdo || ' ' }}
              </td>
              <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                {{ formData.formDataExamenVista.cilindroOjoDerecho || ' ' }}
              </td>
            </tr>
            <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(stepReceta)">
              <td class="w-1/6 text-xs sm:text-sm px-2 py-0 text-center border border-gray-300 font-medium">ADICIÓN</td>
              <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                {{ formData.formDataExamenVista.adicionOjoIzquierdo || ' ' }}
              </td>
              <td class="w-1/3 text-xs sm:text-sm text-center px-2 py-0 border border-gray-300">
                {{ formData.formDataExamenVista.adicionOjoDerecho || ' ' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Diagnóstico y Recomendaciones -->
      <div class="w-full">
        <h2 class="text-lg font-medium mb-1 text-center">Diagnóstico y Recomendaciones</h2>
        <div class="border border-gray-200 rounded-md p-3 cursor-pointer" @click="goToStep(stepDiagnostico)"
          :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === stepDiagnostico }">
          <p class="text-xs sm:text-sm text-center text-gray-700 whitespace-pre-wrap">
            {{ formData.formDataExamenVista.diagnosticoRecomendaciones || ' ' }}
          </p>
        </div>
      </div>
    </template>
  </div>
  <div class="w-full flex justify-end gap-4 mt-4">
    <a 
      href="/img/assets/Carta-Jaeger.pdf" 
      download 
      class="px-4 py-2 bg-sky-500 text-white rounded-lg shadow hover:bg-sky-600 transition">
      📄 Carta Jaeger PDF
    </a>
    <a 
      href="/img/assets/Test-Ishihara.pdf" 
      download 
      class="px-4 py-2 bg-rose-500 text-white rounded-lg shadow hover:bg-rose-600 transition">
      📄 Test de Ishihara PDF
    </a>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.visualizador-examen-vista div.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-examen-vista div.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-examen-vista p.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-examen-vista p.cursor-pointer:hover {
  background-color: #f0f0f0;
}

.visualizador-examen-vista tbody tr.cursor-pointer,
.visualizador-examen-vista thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-examen-vista tbody tr.cursor-pointer > td,
.visualizador-examen-vista tbody tr.cursor-pointer > th,
.visualizador-examen-vista thead tr.cursor-pointer > td,
.visualizador-examen-vista thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-examen-vista tbody tr.cursor-pointer:hover,
.visualizador-examen-vista tbody tr.cursor-pointer:hover > td,
.visualizador-examen-vista tbody tr.cursor-pointer:hover > th,
.visualizador-examen-vista thead tr.cursor-pointer:hover,
.visualizador-examen-vista thead tr.cursor-pointer:hover > td,
.visualizador-examen-vista thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}
</style>

<style>
html.dark-mode .visualizador-examen-vista div.cursor-pointer:hover,
html.dark-mode .visualizador-examen-vista p.cursor-pointer:hover {
  background-color: #475569 !important;
}

html.dark-mode .visualizador-examen-vista tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-examen-vista tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-examen-vista tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-examen-vista thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-examen-vista thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-examen-vista thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}
</style>
