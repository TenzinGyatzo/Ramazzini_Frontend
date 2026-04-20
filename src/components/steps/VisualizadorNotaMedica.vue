<script setup>
import { useEmpresasStore } from '@/stores/empresas';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { calcularEdad, calcularAntiguedad, formatDateDDMMYYYY } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

const empresas = useEmpresasStore();
const trabajadores = useTrabajadoresStore();
const formData = useFormDataStore();
const steps = useStepsStore();

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// console.log('Datos del store en VisualizadorNotaMedica:', formData.formDataNotaMedica);

</script>

<template>
  <div
    class="visualizador-nota-medica flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

    <!-- Empresa, Fecha y Motivo del Examen -->
    <div class="flex flex-wrap w-full gap-4">
      <!-- Empresa -->
      <div class="w-full md:w-2/5">
        <p class="text-center text-base sm:text-lg">

        </p>
      </div>

      <!-- Fecha y Motivo del Examen -->
      <div
        class="w-full md:w-[calc(60%-1rem)] flex flex-wrap gap-2 justify-start md:justify-end text-sm sm:text-base cursor-pointer"
        :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 1 }"
        @click="goToStep(1)">
        <p class="flex-1 md:flex-none font-light">Inicial ( <span class="font-medium">{{ formData.formDataNotaMedica.tipoNota === 'Inicial' ? 'X' :
          '&nbsp;' }}</span> )</p>
        <p class="flex-1 md:flex-none font-light">Seguimiento ( <span class="font-medium">{{ formData.formDataNotaMedica.tipoNota === 'Seguimiento' ? 'X' :
          '&nbsp;' }}</span> )</p>
        <p class="flex-1 md:flex-none font-light">Alta ( <span class="font-medium">{{ formData.formDataNotaMedica.tipoNota === 'Alta' ?
          'X' : '&nbsp;' }}</span> )</p>
        <p class="w-full md:w-auto ml-4 font-light">Fecha: <span class="font-medium">{{
          formatDateDDMMYYYY(formData.formDataNotaMedica.fechaNotaMedica) }}</span></p>
      </div>
    </div>

    <!-- Nombre y teléfono de trabajador -->
    <div class="w-full flex justify-between items-center">
      <p class="text-justify text-2xl font-medium">
                      {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
      </p>
      <p class="text-justify font-light">
      Teléfono: <span class="font-medium">{{ trabajadores.currentTrabajador.telefono || 'No Disponible' }}</span>
      </p>
    </div>

    <!-- Datos del Trabajador  -->
    <div class="w-full mb-1">
      <p class="text-justify font-light">
        Se trata de <span class="font-medium">{{ trabajadores.currentTrabajador.sexo === 'Masculino' ? 'un trabajador' : 'una trabajadora' }}</span> de 
        <span class="font-medium">{{ calcularEdad(trabajadores.currentTrabajador.fechaNacimiento) }} años</span> de edad, que labora en la empresa 
        <span class="font-medium">{{ empresas.currentEmpresa.nombreComercial }}</span>, ocupando el puesto de 
        <span class="font-medium">{{ trabajadores.currentTrabajador.puesto }}</span>, con escolaridad 
        <span class="font-medium">{{ trabajadores.currentTrabajador.escolaridad }}</span><template v-if="calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) !== '-'"> y una antigüedad de 
        <span class="font-medium">{{ calcularAntiguedad(trabajadores.currentTrabajador.fechaIngreso) }}</span></template>. Estado civil: 
        <span class="font-medium">{{ trabajadores.currentTrabajador.estadoCivil }}</span>.
        <span v-if="trabajadores.currentTrabajador.numeroEmpleado"> Número de empleado: <span class="font-medium">{{ trabajadores.currentTrabajador.numeroEmpleado }}</span></span>.
      </p>

    </div>

    <!-- Motivo de consulta -->
    <div v-if="formData.formDataNotaMedica.motivoConsulta" 
      class="w-full mb-1 cursor-pointer" 
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 2 }" @click="goToStep(2)">
      <p class="text-justify font-medium">
        Motivo de consulta: <span class="font-light">{{ formData.formDataNotaMedica.motivoConsulta }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 2 }" @click="goToStep(2)">
      + Agregar Motivo de Consulta
    </div>

    <!-- Antecedentes -->
    <div v-if="formData.formDataNotaMedica.antecedentes" 
      class="w-full mb-1 cursor-pointer" 
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 3 }" @click="goToStep(3)">
      <p class="text-justify font-medium">
        Antecedentes: <span class="font-light">{{ formData.formDataNotaMedica.antecedentes }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 3 }" @click="goToStep(3)">+ Agregar Antecedentes</div>

    <!-- Exploración Física -->
    <div v-if="formData.formDataNotaMedica.exploracionFisica" class="w-full mb-1 cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 4 }" @click="goToStep(4)">
      <p class="text-justify font-medium">
        Exploración Física: <span class="font-light">{{ formData.formDataNotaMedica.exploracionFisica }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 4 }" @click="goToStep(4)">+ Agregar Exploración Física</div>

    <!-- Signos Vitales -->
    <div v-if="formData.formDataNotaMedica.tensionArterialSistolica || formData.formDataNotaMedica.tensionArterialDiastolica || formData.formDataNotaMedica.frecuenciaCardiaca || formData.formDataNotaMedica.frecuenciaRespiratoria || formData.formDataNotaMedica.temperatura || formData.formDataNotaMedica.saturacionOxigeno" class="w-full mb-1 cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 5 }"
    @click="goToStep(5)">
      <p class="text-justify font-medium">
      Signos Vitales: 
      <template v-if="formData.formDataNotaMedica.tensionArterialSistolica || formData.formDataNotaMedica.tensionArterialDiastolica">
        &nbsp;&nbsp;&nbsp;&nbsp;TA: <span class="font-light">{{ formData.formDataNotaMedica.tensionArterialSistolica }}/{{ formData.formDataNotaMedica.tensionArterialDiastolica }} mm/Hg &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.frecuenciaCardiaca">
        &nbsp;&nbsp;&nbsp;FC: <span class="font-light">{{ formData.formDataNotaMedica.frecuenciaCardiaca }} lpm &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.frecuenciaRespiratoria">
        &nbsp;&nbsp;&nbsp;FR: <span class="font-light">{{ formData.formDataNotaMedica.frecuenciaRespiratoria }} rpm &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.temperatura">
        &nbsp;&nbsp;&nbsp;Temp: <span class="font-light">{{ formData.formDataNotaMedica.temperatura }} °C &nbsp;&nbsp;|</span>
      </template>
      <template v-if="formData.formDataNotaMedica.saturacionOxigeno">
        &nbsp;&nbsp;&nbsp;SatO2: <span class="font-light">{{ formData.formDataNotaMedica.saturacionOxigeno }} %</span>
      </template>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 5 }" @click="goToStep(5)">+ Signos Vitales</div>

    <!-- Diagnóstico -->
    <div v-if="formData.formDataNotaMedica.diagnostico" class="w-full mb-1 cursor-pointer" :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 6 }" @click="goToStep(6)">
      <p class="text-justify font-medium">
        IDX: {{ formData.formDataNotaMedica.diagnostico.toUpperCase() }}
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 6 }" @click="goToStep(6)">+ Agregar Diagnóstico</div>

    <!-- Tratamiento -->
    <div 
      v-if="formData.formDataNotaMedica.tratamiento && formData.formDataNotaMedica.tratamiento.length > 0"
      class="w-full mb-1 cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 7 }"
      @click="goToStep(7)"
    >
      <p class="text-justify font-medium">
        TX:
        <span class="font-light block mt-1">
          <div 
            v-for="(item, index) in formData.formDataNotaMedica.tratamiento" 
            :key="index" 
            class="ml-4 relative"
          >
            <span class="absolute left-0">{{ index + 1 }}.</span>
            <span class="block pl-4 font-medium">{{ item }}</span>
          </div>
        </span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 7 }" @click="goToStep(7)">+ Agregar Tratamiento</div>

    <!-- Recomendaciones -->
    <div 
      v-if="formData.formDataNotaMedica.recomendaciones && formData.formDataNotaMedica.recomendaciones.length > 0"
      class="w-full mb-1 cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 8 }"
      @click="goToStep(8)"
    >
      <p class="text-justify font-medium">
      Recomendaciones:
      <span class="font-light block mt-1">
        <div 
        v-for="(item, index) in formData.formDataNotaMedica.recomendaciones" 
        :key="index" 
        class="ml-4 relative"
        >
        <span class="absolute left-0">{{ String.fromCharCode(97 + index) }}.</span>
        <span class="block pl-4">{{ item }}</span>
        </div>
      </span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 8 }" @click="goToStep(8)">+ Agregar Recomendaciones</div>

    <!-- Observaciones -->
    <div v-if="formData.formDataNotaMedica.observaciones" 
      class="w-full mb-1 cursor-pointer" 
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 9 }" @click="goToStep(9)">
      <p class="text-justify font-medium">
        Observaciones: <span class="font-light">{{ formData.formDataNotaMedica.observaciones }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 9 }" @click="goToStep(9)">+ Agregar Observaciones</div>

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

html.dark-mode .visualizador-nota-medica .cursor-pointer:hover {
  background-color: #475569 !important;
  color: #f8fafc !important;
}
</style>
