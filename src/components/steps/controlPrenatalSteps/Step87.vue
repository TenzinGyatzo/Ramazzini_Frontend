<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataControlPrenatal } = useFormDataStore();

// Valor local para observacionesFcf
const observacionesFcf = ref('');

onMounted(() => {
    // Restaurar el valor desde el store si existe
    if (formDataControlPrenatal.observacionesFcf) {
        observacionesFcf.value = formDataControlPrenatal.observacionesFcf;
    }
});

onUnmounted(() => {
    // Asegurar que el store tenga el valor actual antes de desmontar
    if (observacionesFcf.value !== undefined) {
        formDataControlPrenatal.observacionesFcf = observacionesFcf.value;
    }
});

// Sincronizar cambios locales con el store
watch(observacionesFcf, (newValue) => {
    formDataControlPrenatal.observacionesFcf = newValue;
});

</script>

<template>
  <h1 class="font-bold mb-4 text-gray-800 leading-5">Observaciones</h1>

  <h2 class="font-semibold mb-3 text-gray-700">Frecuencia Cardíaca Fetal</h2>
  <p class="text-sm text-gray-600 mb-2">
    Registre una observación general sobre la evolución de la frecuencia cardíaca fetal 
    a lo largo del embarazo, con base en las mediciones realizadas en cada control.
  </p>

  <div data-campo="observacionesFcf" class="mb-4">
    <textarea
      class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400
             focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
      v-model="observacionesFcf" 
      placeholder="Ejemplo: La frecuencia cardíaca fetal se mantuvo dentro de rangos normales durante todo el embarazo, sin alteraciones significativas."
      data-skip-validation
      required
    ></textarea>
  </div>
</template>
  
