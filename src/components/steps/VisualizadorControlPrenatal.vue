<script setup>
import { ref, computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { convertirFechaISOaDDMMYYYY, formatDateDDMMYYYY } from '@/helpers/dates';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import EstadoDocumentoBadgeAlt from '../badges/EstadoDocumentoBadgeAlt.vue';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => formData.formDataControlPrenatal.fechaInicioControlPrenatal);
const steps = useStepsStore();
const proveedorSaludStore = useProveedorSaludStore();
const isMX = computed(() => proveedorSaludStore.isMX);

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

</script>

<template>
  <div
    class="flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa y Fecha -->
    <div class="flex flex-wrap md:flex-nowrap w-full gap-4 items-center">
      <EstadoDocumentoBadgeAlt 
        v-if="isMX"
        :estado="formData.formDataControlPrenatal.estado" 
        :fechaFinalizacion="formData.formDataControlPrenatal.fechaFinalizacion" 
        :finalizadoPor="formData.formDataControlPrenatal.finalizadoPor"
        :fechaAnulacion="formData.formDataControlPrenatal.fechaAnulacion"
        :anuladoPor="formData.formDataControlPrenatal.anuladoPor"
        :razonAnulacion="formData.formDataControlPrenatal.razonAnulacion"
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
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)">
        <p class="w-full md:w-auto text-right">Inicio de Control Prenatal: <span class="font-medium">{{
          formatDateDDMMYYYY(formData.formDataControlPrenatal.fechaInicioControlPrenatal) }}</span></p>
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
              {{ trabajadores.currentTrabajador.numeroEmpleado || 'No asignado' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Gineco Obstétricos -->
    <div v-if="trabajadores.currentTrabajador.sexo === 'Femenino'" class="control-prenatal-gineco w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center">Antecedentes Gineco Obstétricos</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 2 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(2)">
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              MENARCA
            </td>
            <td class="w-1/2 text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.menarca ? formData.formDataControlPrenatal.menarca + ' años' : '-' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 3 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(3)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              GESTAS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.gestas === 0 ? 0 : (formData.formDataControlPrenatal.gestas || '-') }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 4 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(4)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PARTOS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.partos === 0 ? 0 : (formData.formDataControlPrenatal.partos || '-') }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 5 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(5)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              CESÁREAS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.cesareas === 0 ? 0 : (formData.formDataControlPrenatal.cesareas || '-') }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 6 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(6)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              ABORTOS
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.abortos === 0 ? 0 : (formData.formDataControlPrenatal.abortos || '-') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Antecedentes Gineco Obstétricos Parte 2 -->
    <div v-if="trabajadores.currentTrabajador.sexo === 'Femenino'" class="control-prenatal-gineco w-full md:w-[calc(50%-0.5rem)]">
      <h2 class="text-lg font-medium mb-1 text-center">Antecedentes Gineco Obstétricos</h2>
      <table class="table-auto w-full border-collapse border border-gray-200">
        <tbody>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 7 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(7)">
            <td class="w-3/5 text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              CICLOS
            </td>
            <td class="w-2/5 text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.ciclos || '-' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 8 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(8)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              F. U. M.
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ (formData.formDataControlPrenatal.fum && convertirFechaISOaDDMMYYYY(formData.formDataControlPrenatal.fum)) || '-' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 9 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(9)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              I. V. S. A.
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.ivsa ? formData.formDataControlPrenatal.ivsa + ' años' : '-' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 10 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(10)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              PLANIFICACIÓN FAMILIAR
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ formData.formDataControlPrenatal.metodoPlanificacionFamiliar || '-' }}
            </td>
          </tr>
          <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" :class="steps.currentStep === 11 ? 'outline outline-2 outline-yellow-500 rounded-md' : ''" @click="goToStep(11)">
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300 font-light">
              F. P. P.
            </td>
            <td class="text-xs sm:text-sm px-2 py-0 border border-gray-300">
              {{ (formData.formDataControlPrenatal.fpp && convertirFechaISOaDDMMYYYY(formData.formDataControlPrenatal.fpp)) || '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tabla de Control Prenatal Enero a Junio -->
    <div class="w-full">
      <h2 class="text-lg font-medium mb-1 text-center">Control Prenatal - Enero a Junio</h2>
      <div class="overflow-x-auto">
        <table class="control-prenatal-meses table-auto w-full border-collapse border border-gray-300 text-xs">
          <!-- Encabezado de meses -->
          <thead>
            <tr>
              <th class="w-44 bg-gray-600 text-white px-2 py-1 border border-gray-300 text-center font-medium ">
                MES
              </th>
              <th v-for="mes in ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN']" 
                  :key="mes" 
                  class="w-20 bg-gray-600 text-white px-2 py-1 border border-gray-300 text-center font-medium">
                {{ mes }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Fila: FECHA -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                FECHA
              </td>
              <td v-for="(mes, index) in ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']" :key="`fecha-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (12 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(12 + (index * 6))">
                {{ (formData.formDataControlPrenatal[`${mes}Fecha`] && convertirFechaISOaDDMMYYYY(formData.formDataControlPrenatal[`${mes}Fecha`])) || '-' }}
              </td>
            </tr>
            
            <!-- Fila: PESO (Kg) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                PESO (Kg)
              </td>
              <td v-for="(mes, index) in ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']" :key="`peso-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (13 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(13 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Peso`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: ÍNDICE DE MASA CORPORAL -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                ÍNDICE DE MASA CORPORAL
              </td>
              <td v-for="(mes, index) in ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']" :key="`imc-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (13 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(13 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Imc`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: TENSIÓN ARTERIAL (mmHg) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                TENSIÓN ARTERIAL (mmHg)
              </td>
              <td v-for="(mes, index) in ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']" :key="`tension-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (14 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(14 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Tia`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: F. C. FETAL (lat/min) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                F. C. FETAL (lat/min)
              </td>
              <td v-for="(mes, index) in ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']" :key="`fcf-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (15 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(15 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Fcf`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: SEMANAS DE GESTACIÓN -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                SEMANAS DE GESTACIÓN
              </td>
              <td v-for="(mes, index) in ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']" :key="`semanas-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (16 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(16 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Sdg`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: FONDO UTERINO (cm) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                FONDO UTERINO (cm)
              </td>
              <td v-for="(mes, index) in ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio']" :key="`fondo-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (17 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(17 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}FondoUterino`] || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabla de Control Prenatal Julio a Diciembre -->
    <div class="w-full">
      <h2 class="text-lg font-medium mb-1 text-center">Control Prenatal - Julio a Diciembre</h2>
      <div class="overflow-x-auto">
        <table class="control-prenatal-meses table-auto w-full border-collapse border border-gray-300 text-xs">
          <!-- Encabezado de meses -->
          <thead>
            <tr>
              <th class="w-44 bg-gray-600 text-white px-2 py-1 border border-gray-300 text-center font-medium">
                MES
              </th>
              <th v-for="mes in ['JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']" 
                  :key="mes" 
                  class="w-20 bg-gray-600 text-white px-2 py-1 border border-gray-300 text-center font-medium">
                {{ mes }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Fila: FECHA -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                FECHA
              </td>
              <td v-for="(mes, index) in ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']" :key="`fecha-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (48 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(48 + (index * 6))">
                {{ (formData.formDataControlPrenatal[`${mes}Fecha`] && convertirFechaISOaDDMMYYYY(formData.formDataControlPrenatal[`${mes}Fecha`])) || '-' }}
              </td>
            </tr>
            
            <!-- Fila: PESO (Kg) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                PESO (Kg)
              </td>
              <td v-for="(mes, index) in ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']" :key="`peso-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (49 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(49 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Peso`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: ÍNDICE DE MASA CORPORAL -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                ÍNDICE DE MASA CORPORAL
              </td>
              <td v-for="(mes, index) in ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']" :key="`imc-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (49 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(49 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Imc`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: TENSIÓN ARTERIAL (mmHg) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                TENSIÓN ARTERIAL (mmHg)
              </td>
              <td v-for="(mes, index) in ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']" :key="`tension-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (50 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(50 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Tia`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: F. C. FETAL (lat/min) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                F. C. FETAL (lat/min)
              </td>
              <td v-for="(mes, index) in ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']" :key="`fcf-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (51 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(51 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Fcf`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: SEMANAS DE GESTACIÓN -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                SEMANAS DE GESTACIÓN
              </td>
              <td v-for="(mes, index) in ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']" :key="`semanas-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (52 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(52 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}Sdg`] || '-' }}
              </td>
            </tr>
            
            <!-- Fila: FONDO UTERINO (cm) -->
            <tr>
              <td class="bg-gray-100 px-2 py-1 border border-gray-300 font-medium text-center">
                FONDO UTERINO (cm)
              </td>
              <td v-for="(mes, index) in ['julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']" :key="`fondo-${mes}`" 
                  class="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-yellow-100"
                  :class="steps.currentStep === (53 + (index * 6)) ? 'outline outline-2 outline-yellow-500 rounded' : ''"
                  @click="goToStep(53 + (index * 6))">
                {{ formData.formDataControlPrenatal[`${mes}FondoUterino`] || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Conclusión y recomendaciones -->
      <div class="w-full mt-6">
        <table class="table-auto w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr class="bg-gray-200">
              <th class="text-xs sm:text-sm bg-gray-600 text-white px-2 py-1 border border-gray-300 text-center font-medium" colspan="2">
                  OBSERVACIONES
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Observaciones sobre el peso -->
            <div v-if="formData.formDataControlPrenatal.observacionesPeso" 
              class="w-9/10 my-2 mx-2 cursor-pointer" 
              :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 84 }" @click="goToStep(84)">
              <p class="text-justify font-medium">
                PESO: <span class="font-light whitespace-pre">{{ formData.formDataControlPrenatal.observacionesPeso }}</span> 
              </p>
            </div>
            <div v-else 
              class="w-9/10 my-2 mx-2 cursor-pointer text-gray-500 italic" 
              :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 84 }" @click="goToStep(84)">
              +  Agregar observaciones sobre la evolución del peso
            </div>
            <!-- Observaciones sobre el IMC -->
            <div v-if="formData.formDataControlPrenatal.observacionesImc" 
              class="w-9/10 my-2 mx-2 cursor-pointer" 
              :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 85 }" @click="goToStep(85)">
              <p class="text-justify font-medium">
                IMC: <span class="font-light whitespace-pre">{{ formData.formDataControlPrenatal.observacionesImc }}</span> 
              </p>
            </div>
            <div v-else 
              class="w-9/10 my-2 mx-2 cursor-pointer text-gray-500 italic" 
              :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 85 }" @click="goToStep(85)">
              +  Agregar observaciones sobre la evolución del IMC
            </div>
            <!-- Observaciones sobre la tensión arterial -->
            <div v-if="formData.formDataControlPrenatal.observacionesTia" 
              class="w-9/10 my-2 mx-2 cursor-pointer" 
              :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 86 }" @click="goToStep(86)">
              <p class="text-justify font-medium">
                T/A: <span class="font-light whitespace-pre">{{ formData.formDataControlPrenatal.observacionesTia }}</span> 
              </p>
            </div>
            <div v-else 
              class="w-9/10 my-2 mx-2 cursor-pointer text-gray-500 italic" 
              :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 86 }" @click="goToStep(86)">
              +  Agregar observaciones sobre la evolución de la T.A.
            </div>
            <!-- Observaciones sobre el F. C. Fetal -->
            <div v-if="formData.formDataControlPrenatal.observacionesFcf" 
              class="w-9/10 my-2 mx-2 cursor-pointer" 
              :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 87 }" @click="goToStep(87)">
              <p class="text-justify font-medium">
                FCF: <span class="font-light whitespace-pre">{{ formData.formDataControlPrenatal.observacionesFcf }}</span> 
              </p>
            </div>
            <div v-else 
              class="w-9/10 my-2 mx-2 cursor-pointer text-gray-500 italic" 
              :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 87 }" @click="goToStep(87)">
              +  Agregar observaciones sobre la evolución del F.C.F.
            </div>
            <!-- Observaciones sobre la S.D.G. -->
            <div v-if="formData.formDataControlPrenatal.observacionesSdg" 
              class="w-9/10 my-2 mx-2 cursor-pointer" 
              :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 88 }" @click="goToStep(88)">
              <p class="text-justify font-medium">
                SDG: <span class="font-light whitespace-pre">{{ formData.formDataControlPrenatal.observacionesSdg }}</span> 
              </p>
            </div>
            <div v-else 
              class="w-9/10 my-2 mx-2 cursor-pointer text-gray-500 italic" 
              :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 88 }" @click="goToStep(88)">
              +  Agregar observaciones sobre las semanas de gestación
            </div>
            <!-- Observaciones sobre el fondo uterino -->
            <div v-if="formData.formDataControlPrenatal.observacionesFondoUterino" 
              class="w-9/10 my-2 mx-2 cursor-pointer" 
              :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 89 }" @click="goToStep(89)">
              <p class="text-justify font-medium">
                FONDO UTERINO: <span class="font-light whitespace-pre">{{ formData.formDataControlPrenatal.observacionesFondoUterino }}</span> 
              </p>
            </div>
            <div v-else 
              class="w-9/10 my-2 mx-2 cursor-pointer text-gray-500 italic" 
              :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 89 }" @click="goToStep(89)">
              +  Agregar observaciones sobre el fondo uterino
            </div>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: #f0f0f0;
  /* Cambia el color según tu diseño */
}

.control-prenatal-gineco tbody tr.cursor-pointer,
.control-prenatal-gineco thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.control-prenatal-gineco tbody tr.cursor-pointer > td,
.control-prenatal-gineco tbody tr.cursor-pointer > th,
.control-prenatal-gineco thead tr.cursor-pointer > td,
.control-prenatal-gineco thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.control-prenatal-gineco tbody tr.cursor-pointer:hover,
.control-prenatal-gineco tbody tr.cursor-pointer:hover > td,
.control-prenatal-gineco tbody tr.cursor-pointer:hover > th,
.control-prenatal-gineco thead tr.cursor-pointer:hover,
.control-prenatal-gineco thead tr.cursor-pointer:hover > td,
.control-prenatal-gineco thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}

.control-prenatal-meses td.cursor-pointer {
  transition: background-color 0.15s ease, color 0.15s ease;
}
</style>

<style>
html.dark-mode .control-prenatal-gineco tbody tr.cursor-pointer:hover,
html.dark-mode .control-prenatal-gineco tbody tr.cursor-pointer:hover > td,
html.dark-mode .control-prenatal-gineco tbody tr.cursor-pointer:hover > th,
html.dark-mode .control-prenatal-gineco thead tr.cursor-pointer:hover,
html.dark-mode .control-prenatal-gineco thead tr.cursor-pointer:hover > td,
html.dark-mode .control-prenatal-gineco thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}

/* En oscuro, evitar hover claro que borra contraste en las celdas mensuales. */
html.dark-mode .control-prenatal-meses td.cursor-pointer:hover {
  background-color: #334155 !important;
  color: #f8fafc !important;
}
</style>
