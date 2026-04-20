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

// console.log('Datos del store en VisualizadorNotaMedica:', formData.formDataReceta);

</script>

<template>
  <div
    class="visualizador-receta flex flex-wrap justify-start gap-4 border-shadow w-full text-left rounded-lg p-5 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-6xl mx-auto max-h-[66vh] sm:max-h-[68vh] md:max-h-[67vh] lg:max-h-[67vh] xl:max-h-[81vh] overflow-y-auto">

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
        <p class="w-full md:w-auto ml-4 font-light">Fecha: <span class="font-medium">{{
          formatDateDDMMYYYY(formData.formDataReceta.fechaReceta) }}</span></p>
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

    <!-- Tratamiento -->
    <div 
      v-if="formData.formDataReceta.tratamiento && formData.formDataReceta.tratamiento.length > 0"
      class="w-full mb-1 cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 2 }"
      @click="goToStep(2)"
    >
      <p class="text-justify font-medium">
        Tratamiento:
        <span class="font-light block mt-1">
          <div 
            v-for="(item, index) in formData.formDataReceta.tratamiento" 
            :key="index" 
            class="ml-4 relative"
          >
            <span class="absolute left-0">{{ index + 1 }}.</span>
            <span class="block pl-4 font-medium">{{ item }}</span>
          </div>
        </span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 2 }" @click="goToStep(2)">+ Agregar Tratamiento</div>

    <!-- Recomendaciones -->
    <div 
      v-if="formData.formDataReceta.recomendaciones && formData.formDataReceta.recomendaciones.length > 0"
      class="w-full mb-1 cursor-pointer"
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md': steps.currentStep === 3 }"
      @click="goToStep(3)"
    >
      <p class="text-justify font-medium">
      Recomendaciones:
      <span class="font-light block mt-1">
        <div 
        v-for="(item, index) in formData.formDataReceta.recomendaciones" 
        :key="index" 
        class="ml-4 relative"
        >
        <span class="absolute left-0">{{ String.fromCharCode(97 + index) }}.</span>
        <span class="block pl-4">{{ item }}</span>
        </div>
      </span>
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 8 }" @click="goToStep(3)">+ Agregar Recomendaciones</div>

    <!-- Indicaciones -->
    <div v-if="formData.formDataReceta.indicaciones" 
      class="w-full mb-1 cursor-pointer" 
      :class="{ 'outline outline-2 outline-offset-2 outline-yellow-500 rounded-md' : steps.currentStep === 4 }" @click="goToStep(4)">
      <p class="text-justify font-medium">
        Indicaciones: <span class="font-light">{{ formData.formDataReceta.indicaciones }}</span> 
      </p>
    </div>
    <div v-else class="w-full cursor-pointer text-gray-500 italic" :class="{ 'outline outline-1 outline-offset-1 outline-yellow-500 rounded-md': steps.currentStep === 4 }" @click="goToStep(4)">+ Agregar Indicaciones</div>

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

html.dark-mode .visualizador-receta .cursor-pointer:hover {
  background-color: #475569 !important;
  color: #f8fafc !important;
}
</style>
