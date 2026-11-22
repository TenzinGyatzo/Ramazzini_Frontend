<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataControlPrenatal } = useFormDataStore();

// Valor local para observacionesFondoUterino
const observacionesFondoUterino = ref('');

onMounted(() => {
    // Restaurar el valor desde el store si existe
    if (formDataControlPrenatal.observacionesFondoUterino) {
        observacionesFondoUterino.value = formDataControlPrenatal.observacionesFondoUterino;
    }
});

onUnmounted(() => {
    // Asegurar que el store tenga el valor actual antes de desmontar
    if (observacionesFondoUterino.value !== undefined) {
        formDataControlPrenatal.observacionesFondoUterino = observacionesFondoUterino.value;
    }
});

// Sincronizar cambios locales con el store
watch(observacionesFondoUterino, (newValue) => {
    formDataControlPrenatal.observacionesFondoUterino = newValue;
});

</script>

<template>
  <h1 class="font-bold mb-4 text-gray-800 leading-5">Observaciones</h1>

  <h2 class="font-semibold mb-3 text-gray-700">Fondo Uterino</h2>
  <p class="text-sm text-gray-600 mb-2">
    Registre una observación médica general sobre la evolución del fondo uterino, 
    señalando si las mediciones corresponden con la edad gestacional esperada y si se 
    detectaron variaciones relevantes.
  </p>

  <div data-campo="observacionesFondoUterino" class="mb-4">
    <textarea
      class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400
             focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
      v-model="observacionesFondoUterino" 
      placeholder="Ejemplo: La altura uterina evolucionó conforme a la edad gestacional, sin discrepancias significativas."
      data-skip-validation
      required
    ></textarea>
  </div>
</template>

