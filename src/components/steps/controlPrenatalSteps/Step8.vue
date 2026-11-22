<script setup>
import CampoFecha from '@/components/fecha/CampoFecha.vue';
import { watch, ref, onMounted, onUnmounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';

const { formDataControlPrenatal } = useFormDataStore();

// Valor local para la pregunta principal
const recuerdaFum = ref('Si');

const fum = ref(''); // Fecha de última menstruación

onMounted(() => {
    // Verificar si formDataControlPrenatal.fum tiene un valor válido y establecerlo en fum
    if (formDataControlPrenatal.fum && formDataControlPrenatal.fum !== 'No recuerda') {
        fum.value = formDataControlPrenatal.fum;
        recuerdaFum.value = 'Si';
    } else if (formDataControlPrenatal.fum === 'No recuerda') {
        recuerdaFum.value = 'No';
        fum.value = '';
    } else {
        // Si no hay valor, mantener por defecto en "Si"
        recuerdaFum.value = 'Si';
        fum.value = '';
        formDataControlPrenatal.fum = '';
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor apropiado para fum
    if (recuerdaFum.value === 'No') {
        formDataControlPrenatal.fum = 'No recuerda';
    } else if (recuerdaFum.value === 'Si') {
        // Si dice que sí recuerda pero no especifica fecha, mantener vacío
        formDataControlPrenatal.fum = fum.value || '';
    }
});

// Sincronizar fum con formData solo cuando recuerdaFum sea 'Si'
watch(fum, (newValue) => {
    if (recuerdaFum.value === 'Si') {
        formDataControlPrenatal.fum = newValue || '';
    }
});

// Watch para establecer 'No recuerda' cuando recuerdaFum sea 'No'
watch(recuerdaFum, (newValue) => {
    if (newValue === 'No') {
        formDataControlPrenatal.fum = 'No recuerda';
        fum.value = ''; // Limpiar el input de fecha
    } else if (newValue === 'Si') {
        // Si cambia a "Si", establecer el valor existente o vacío
        formDataControlPrenatal.fum = fum.value || '';
    }
});

// Computed para el estado actual
const estadoFUM = computed(() => {
    if (recuerdaFum.value === 'No') {
        return 'No recuerda la fecha';
    } else if (recuerdaFum.value === 'Si' && fum.value) {
        return `FUM: ${fum.value}`;
    } else {
        return 'Fecha no especificada';
    }
});
</script>

<template>
    <div>
        <h1 class="font-bold mb-4 text-gray-800 leading-5">Antecedentes Gineco Obstétricos</h1>
        <h2>FECHA DE ÚLTIMA MENSTRUACIÓN</h2>
        <!-- Pregunta principal -->
        <div class="mb-4">
            <p class="font-medium mb-1 text-gray-800 leading-5">¿La trabajadora recuerda la fecha del primer día de su última menstruación?
            </p>
            <div class="flex items-center space-x-6 font-light">
                <label class="flex items-center space-x-2">
                    <input type="radio" value="No" v-model="recuerdaFum" class="form-radio accent-emerald-600" />
                    <span>No</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="radio" value="Si" v-model="recuerdaFum" class="form-radio accent-emerald-600" />
                    <span>Si</span>
                </label>
            </div>
        </div>

        <!-- Opciones adicionales, solo visibles si el resultado es "Sí" -->
        <div v-if="recuerdaFum === 'Si'" class="my-4">
            <p class="font-medium mb-2 text-gray-800">Especifique:</p>
            <div data-campo="fum" class="font-light">
                <CampoFecha
                    class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    v-model="fum"
                    :placeholder="'Seleccione fecha o deje en blanco'"
                    required />

            </div>
            <p class="text-sm text-gray-500 mt-1">
                Puede usar una fecha aproximada si no recuerda la fecha exacta
            </p>
        </div>

        <!-- Resumen de selección -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p class="text-sm text-emerald-800 mb-2">
                <span v-if="recuerdaFum === 'No'" class="font-medium">❌ Estado actual:</span>
                <span v-else-if="recuerdaFum === 'Si' && fum" class="font-medium">✅ FUM  a registrar:</span>
                <span v-else class="font-medium">⚠️ Estado pendiente:</span>
            </p>
            <p class="text-2xl font-bold text-emerald-700 text-center">
                <span v-if="recuerdaFum === 'No'" class="text-red-600 font-semibold">No recuerda la fecha</span>
                <span v-else-if="recuerdaFum === 'Si' && fum" class="text-emerald-700 font-semibold">{{ convertirFechaISOaDDMMYYYY(fum) }}</span>
                <span v-else class="text-orange-600 font-semibold">Fecha no especificada</span>
            </p>
        </div>
    </div>
</template>