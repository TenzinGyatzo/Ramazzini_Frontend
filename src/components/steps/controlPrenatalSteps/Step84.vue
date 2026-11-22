<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataControlPrenatal } = useFormDataStore();

// Valor local para observacionesPeso
const observacionesPeso = ref('');

onMounted(() => {
    // Restaurar el valor desde el store si existe
    if (formDataControlPrenatal.observacionesPeso) {
        observacionesPeso.value = formDataControlPrenatal.observacionesPeso;
    }
});

onUnmounted(() => {
    // Asegurar que el store tenga el valor actual antes de desmontar
    if (observacionesPeso.value !== undefined) {
        formDataControlPrenatal.observacionesPeso = observacionesPeso.value;
    }
});

// Sincronizar cambios locales con el store
watch(observacionesPeso, (newValue) => {
    formDataControlPrenatal.observacionesPeso = newValue;
});

</script>

<template>
    <h1 class="font-bold mb-4 text-gray-800 leading-5">Observaciones</h1>

    <h2 class="font-semibold mb-3 text-gray-700">Peso durante el embarazo</h2>
    <p class="text-sm text-gray-600 mb-2">
        Escriba una observación general sobre la evolución del peso de la trabajadora 
        considerando todas las mediciones registradas durante el embarazo.
    </p>

    <div data-campo="observacionesPeso" class="mb-4">
        <textarea
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400
                focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
        v-model="observacionesPeso" 
        placeholder="Ejemplo: La evolución del peso fue adecuada, con incrementos mensuales acordes a lo esperado."
        data-skip-validation
        required
        ></textarea>
    </div>
</template>
  
