<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';


const { formDataControlPrenatal } = useFormDataStore();

// Valor local para la pregunta principal
const ivsaPregunta = ref('Si');

const ivsa = ref(''); // Edad de inicio de vida sexual activa

onMounted(() => {
    // Verificar si formDataControlPrenatal.ivsa tiene un valor y establecerlo en ivsa
    if (formDataControlPrenatal.ivsa !== undefined && formDataControlPrenatal.ivsa !== null) {
        ivsa.value = formDataControlPrenatal.ivsa;
        ivsaPregunta.value = 'Si';
    } else if (formDataControlPrenatal.ivsaPregunta === 'No') {
        // Punto 52: se contestó «No» en esta sesión (sin edad no se distinguía de «Sí» vacío)
        ivsaPregunta.value = 'No';
    }
});

// Punto 52: la respuesta va al formulario para que al guardar se pida la edad si es «Sí» (el
// servidor no la guarda: solo la edad)
watch(ivsaPregunta, (valor) => {
    formDataControlPrenatal.ivsaPregunta = valor;
}, { immediate: true });

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para ivsa
    if (!formDataControlPrenatal.ivsa && ivsaPregunta.value === 'No') {
        formDataControlPrenatal.ivsa = null;
    }
});

// Sincronizar ivsa con formData
watch(ivsa, (newValue) => {
    if (ivsaPregunta.value === 'Si') {
        formDataControlPrenatal.ivsa = newValue === '' ? null : Number(newValue);
    }
});

// Watch para establecer null cuando ivsa sea 'No'
watch(ivsaPregunta, (newValue) => {
    if (newValue === 'No') {
        formDataControlPrenatal.ivsa = null;
        ivsa.value = '';
    }
});

// Watch para limpiar ivsa cuando cambie la pregunta
watch(ivsaPregunta, (newValue) => {
    if (newValue === 'Si') {
        // Restaurar el valor si existía
        if (formDataControlPrenatal.ivsa) {
            ivsa.value = formDataControlPrenatal.ivsa;
        }
    }
});
</script>

<template>
    <div>
        <h1 class="font-bold mb-4 text-gray-800 leading-5">Antecedentes Gineco Obstétricos</h1>
        <h2>VIDA SEXUAL ACTIVA</h2>
        
        <!-- Pregunta principal -->
        <div class="mb-4">
            <p class="font-medium mb-2 text-gray-800 leading-5">
                ¿La trabajadora ha iniciado vida sexual activa?
            </p>
            <div class="flex items-center space-x-6 font-light">
                <label class="flex items-center space-x-2">
                    <input type="radio" value="No" v-model="ivsaPregunta" class="form-radio accent-emerald-600" />
                    <span>No</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="radio" value="Si" v-model="ivsaPregunta" class="form-radio accent-emerald-600" />
                    <span>Si</span>
                </label>
            </div>
        </div>

        <!-- Opciones adicionales, solo visibles si el resultado es "Sí" -->
        <div v-if="ivsaPregunta === 'Si'" class="my-4">
            <p class="font-medium mb-2 text-gray-800">En caso afirmativo, ¿a qué edad comenzó su vida sexual activa?</p>
            <div class="font-light">
                <div data-campo="ivsa" class="flex items-center gap-3">
                    <input type="number"
                        class="w-24 p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-center"
                        v-model="ivsa"
                        min="12"
                        max="60"
                        placeholder="Edad"
                        required>
                    <span class="text-gray-600 text-sm">años</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                    Rango válido: 12 - 60 años
                </p>
            </div>
        </div>

        <!-- Resumen de selección -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p class="text-sm text-emerald-800 mb-2">
                <span v-if="ivsaPregunta === 'No'" class="font-medium">Estado actual:</span>
                <span v-else-if="ivsaPregunta === 'Si' && ivsa" class="font-medium">✅ Edad de inicio de vida sexual activa:</span>
                <span v-else class="font-medium">⚠️ Estado pendiente:</span>
            </p>
            <p class="text-2xl font-bold text-emerald-700 text-center">
                <span v-if="ivsaPregunta === 'No'" class="text-xl text-red-600 font-semibold">No ha iniciado vida sexual activa</span>
                <span v-else-if="ivsaPregunta === 'Si' && ivsa" class="text-emerald-700 font-semibold">{{ ivsa }} años</span>
                <span v-else class="text-orange-600 font-semibold">Fecha no especificada</span>
            </p>
        </div>
    </div>
</template>