<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataControlPrenatal } = useFormDataStore();

// Valor local para observacionesSdg
const observacionesSdg = ref('');

onMounted(() => {
    // Restaurar el valor desde el store si existe
    if (formDataControlPrenatal.observacionesSdg) {
        observacionesSdg.value = formDataControlPrenatal.observacionesSdg;
    }
});

onUnmounted(() => {
    // Asegurar que el store tenga el valor actual antes de desmontar
    if (observacionesSdg.value !== undefined) {
        formDataControlPrenatal.observacionesSdg = observacionesSdg.value;
    }
});

// Sincronizar cambios locales con el store
watch(observacionesSdg, (newValue) => {
    formDataControlPrenatal.observacionesSdg = newValue;
});

</script>

<template>
  <h1 class="font-bold mb-4 text-gray-800 leading-5">Observaciones</h1>

  <h2 class="font-semibold mb-3 text-gray-700">Semana de Gestación</h2>
  <p class="text-sm text-gray-600 mb-2">
    Registre una observación médica general sobre la evolución de la edad gestacional, 
    señalando si las semanas calculadas concuerdan con la FUM, la FPP y los hallazgos clínicos 
    o de ultrasonido.
  </p>

  <div data-campo="observacionesSdg" class="mb-4">
    <textarea
      class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400
             focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
      v-model="observacionesSdg" 
      placeholder="Ejemplo: La edad gestacional se mantuvo acorde a la FUM y la FPP, sin discrepancias en controles clínicos ni ultrasonográficos."
      data-skip-validation
      required
    ></textarea>
  </div>
</template>

  
