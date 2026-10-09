<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

// Lo ya capturado en esta sesión; los valores por defecto solo aplican la primera vez
const placasCorrectas = ref(formDataExamenVista.placasCorrectas ?? 14);
const porcentajeIshihara = ref(formDataExamenVista.porcentajeIshihara ?? 100);
const interpretacionIshihara = ref(formDataExamenVista.interpretacionIshihara ?? 'Normal');

// Computed properties para validaciones y mensajes de error
const mensajeErrorPlacas = computed(() => {
  return placasCorrectas.value < 0 
    ? 'Debe ser mínimo 0' 
    : placasCorrectas.value > 14 
      ? 'Debe ser máximo 14' 
      : '';
});

// Computed property para determinar el color de semaforización de la interpretación
const colorInterpretacion = computed(() => {
  const interpretacion = interpretacionIshihara.value;
  
  if (interpretacion === 'Normal') {
    return 'bg-emerald-50 text-emerald-800';
  } else if (interpretacion === 'Daltonismo') {
    return 'bg-red-100 text-red-900';
  } else {
    return 'bg-gray-50 text-gray-800';
  }
});


onMounted(() => {
  if(documentos.currentDocument) {
    placasCorrectas.value = documentos.currentDocument.placasCorrectas;
    porcentajeIshihara.value = documentos.currentDocument.porcentajeIshihara;
    interpretacionIshihara.value = documentos.currentDocument.interpretacionIshihara;
  }
});

onUnmounted(() => {
  formDataExamenVista.placasCorrectas = placasCorrectas.value;
  formDataExamenVista.porcentajeIshihara = porcentajeIshihara.value;
  formDataExamenVista.interpretacionIshihara = interpretacionIshihara.value;
})

// Observa los cambios y actualiza el store y los campos relacionados
watch([placasCorrectas], () => {
  formDataExamenVista.placasCorrectas = placasCorrectas.value;
  interpretarIshihara();
});

// Función para interpretar la agudeza visual
function interpretarIshihara() {
  porcentajeIshihara.value = Math.round(formDataExamenVista.placasCorrectas * 100 / 14)
  formDataExamenVista.porcentajeIshihara = porcentajeIshihara.value
  if (formDataExamenVista.porcentajeIshihara >= 80) {
    interpretacionIshihara.value = "Normal";
    formDataExamenVista.interpretacionIshihara = interpretacionIshihara.value;
  } else {
    interpretacionIshihara.value = "Daltonismo";
    formDataExamenVista.interpretacionIshihara = interpretacionIshihara.value;
  }
}
</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">VISIÓN CROMÁTICA</h1>
    <h3 class="text-lg font-medium mb-6 text-gray-700">PRUEBA DE ISHIHARA</h3>

    <!-- Campo de Placas Correctas -->
    <div class="mb-6">
      <label for="placasCorrectas" class="block text-lg font-normal text-gray-800 mb-3">
        Placas Correctas
      </label>
      <div class="flex space-x-4 mt-1 mb-4">
        <div class="flex flex-col space-y-1">
          <input 
            type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            v-model="placasCorrectas" 
            step="1" 
            min="0" 
            max="14"
            placeholder="14"
          />
        </div>
        <p class="text-3xl">de 14</p>
      </div>
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 transform -translate-y-1"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform -translate-y-1"
      >
        <p v-if="mensajeErrorPlacas" class="text-red-600 text-sm mt-2 font-medium">
          ⚠️ {{ mensajeErrorPlacas }}
        </p>
      </transition>
    </div>

    <!-- Campos de Resultados con Semaforización -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Porcentaje -->
      <div class="mb-4">
        <label for="porcentajeIshihara" class="block text-lg font-normal text-gray-800 mb-3">
          Porcentaje (%)
        </label>
        <div class="relative">
          <input 
            type="number"
            class="w-full p-3 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
            v-model="porcentajeIshihara" 
            readonly 
            title="Calculado a partir del número de placas correctas"
          />
        </div>
      </div>

      <!-- Interpretación -->
      <div class="mb-4">
        <label for="interpretacionIshihara" class="block text-lg font-normal text-gray-800 mb-3">
          Interpretación
        </label>
        <div
          :class="[
            'w-full p-3 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold min-h-[3rem] flex items-center justify-center',
            colorInterpretacion
          ]"
          :title="interpretacionIshihara"
        >
          <span class="break-words">{{ interpretacionIshihara }}</span>
        </div>
      </div>
    </div>

  </div>
</template>
