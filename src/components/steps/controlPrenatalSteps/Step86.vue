<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataControlPrenatal } = useFormDataStore();

// Valor local para observacionesTia
const observacionesTia = ref('');

onMounted(() => {
    // Restaurar el valor desde el store si existe
    if (formDataControlPrenatal.observacionesTia) {
        observacionesTia.value = formDataControlPrenatal.observacionesTia;
    }
});

onUnmounted(() => {
    // Asegurar que el store tenga el valor actual antes de desmontar
    if (observacionesTia.value !== undefined) {
        formDataControlPrenatal.observacionesTia = observacionesTia.value;
    }
});

// Sincronizar cambios locales con el store
watch(observacionesTia, (newValue) => {
    formDataControlPrenatal.observacionesTia = newValue;
});

</script>

<template>
  <h1 class="font-bold mb-4 text-gray-800 leading-5">Observaciones</h1>

  <h2 class="font-semibold mb-3 text-gray-700">T.A. durante el embarazo</h2>
  <p class="text-sm text-gray-600 mb-2">
    Escriba una observación general sobre la evolución de la Tensión Arterial de la trabajadora 
    considerando todas las mediciones registradas durante el embarazo.
  </p>

  <div data-campo="observacionesTia" class="mb-4">
    <textarea
      class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400
              focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
      v-model="observacionesTia" 
      placeholder="Ejemplo: La TA se mantuvo estable durante el embarazo, con valores normales sin presentar hipertensión gestacional. Comportamiento fisiológico esperado."
      data-skip-validation
      required
    ></textarea>
  </div>
</template>
  
