<script setup>
import CampoFecha from '@/components/fecha/CampoFecha.vue';
import { watch, ref, onMounted, onUnmounted, computed } from 'vue';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataControlPrenatal } = useFormDataStore();

const fpp = ref(''); // Fecha probable de parto (valor editable por el médico)
const fppCalculada = ref(''); // FPP calculada automáticamente (siempre basada en FUM)

// Función para calcular la FPP usando la Fórmula de Näegele
const calcularFPP = (fum) => {
    if (!fum || fum === 'No recuerda') return '';
    
    const fechaFUM = new Date(fum);
    if (isNaN(fechaFUM.getTime())) return '';
    
    // Fórmula de Näegele: FUM + 7 días + 9 meses
    const fpp = new Date(fechaFUM);
    fpp.setDate(fpp.getDate() + 7);
    fpp.setMonth(fpp.getMonth() + 9);
    
    // Formatear la fecha como YYYY-MM-DD para el input
    return fpp.toISOString().split('T')[0];
};

onMounted(() => {
    // Si ya existe FUM válida, calcular automáticamente la FPP
    if (formDataControlPrenatal.fum && formDataControlPrenatal.fum !== 'No recuerda') {
        fppCalculada.value = calcularFPP(formDataControlPrenatal.fum);
        // Si no hay FPP registrada, usar la calculada
        if (!formDataControlPrenatal.fpp) {
            fpp.value = fppCalculada.value;
            formDataControlPrenatal.fpp = fpp.value;
        } else {
            // Si ya hay FPP registrada, mantenerla pero mostrar la calculada
            fpp.value = formDataControlPrenatal.fpp;
        }
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga el valor calculado o vacío
    formDataControlPrenatal.fpp = fpp.value || '';
});

// Sincronizar fpp con formData
watch(fpp, (newValue) => {
    formDataControlPrenatal.fpp = newValue || '';
});

// Watch para recalcular FPP cuando cambie la FUM
watch(() => formDataControlPrenatal.fum, (newFum) => {
    if (newFum && newFum !== 'No recuerda') {
        fppCalculada.value = calcularFPP(newFum);
        // Solo actualizar fpp.value si no hay un valor manual previo
        if (!formDataControlPrenatal.fpp || formDataControlPrenatal.fpp === fpp.value) {
            fpp.value = fppCalculada.value;
            formDataControlPrenatal.fpp = fpp.value;
        }
    } else {
        fppCalculada.value = '';
        fpp.value = '';
        formDataControlPrenatal.fpp = '';
    }
});

// Computed para determinar si se puede calcular FPP
const puedeCalcularFPP = computed(() => {
    return formDataControlPrenatal.fum && 
           formDataControlPrenatal.fum !== 'No recuerda' && 
           formDataControlPrenatal.fum !== '';
});

// Computed para el texto de estado
const estadoFPP = computed(() => {
    if (!puedeCalcularFPP.value) {
        return 'No disponible - requiere FUM válida';
    }
    if (fpp.value) {
        return `FPP a registrar: ${fpp.value}`;
    }
    return 'Pendiente de cálculo';
});

// Computed para determinar si la FPP ha sido modificada manualmente
const fppModificada = computed(() => {
    return fpp.value && fppCalculada.value && fpp.value !== fppCalculada.value;
});
</script>

<template>
    <div>
        <h1 class="font-bold mb-4 text-gray-800 leading-5">Antecedentes Gineco Obstétricos</h1>
        <h2>FECHA PROBABLE DE PARTO (FPP)</h2>
        
        <div class="mb-2">         
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                <p class="text-sm text-blue-800 mb-2">
                    <span class="font-medium">Fórmula de Näegele:</span> FUM + 7 días + 9 meses
                </p>
                <p class="text-sm text-blue-700">
                    FUM registrada: 
                    <span v-if="formDataControlPrenatal.fum && formDataControlPrenatal.fum !== 'No recuerda'" class="font-semibold text-emerald-700">
                        {{ convertirFechaISOaDDMMYYYY(formDataControlPrenatal.fum) }}
                    </span>
                    <span v-else class="font-semibold text-orange-600">
                        {{ formDataControlPrenatal.fum || 'No disponible' }}
                    </span>
                </p>
            </div>
        </div>

        <div class="mt-2">
            <div v-if="!puedeCalcularFPP" class="mt-1 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p class="text-sm text-orange-700">
                    ⚠️ Para calcular la FPP, primero debe capturar una FUM válida en el paso anterior.
                </p>
            </div>
            
            <!-- FPP Calculada automáticamente -->
            <div v-else-if="fppCalculada" class="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p class="text-sm text-blue-700">
                    📅 FPP calculada (Fórmula de Näegele):
                </p>
                <p class="text-sm text-blue-800 text-center mt-1 font-semibold">
                    {{ convertirFechaISOaDDMMYYYY(fppCalculada) }}
                </p>
            </div>

            <!-- FPP a registrar (puede ser la calculada o modificada manualmente) -->
            <div v-if="fpp" class="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p class="text-sm text-emerald-800 mb-2">
                    <span>✅ FPP a registrar:</span>
                </p>    
                <p class="text-2xl font-bold text-emerald-700 text-center">
                    <span class="font-semibold text-emerald-800">{{ convertirFechaISOaDDMMYYYY(fpp) }}</span>
                </p>
                <p v-if="fppModificada" class="text-xs text-emerald-600 mt-1 text-center">
                    (Valor original calculado: {{ convertirFechaISOaDDMMYYYY(fppCalculada) }})
                </p>
            </div>

            <p class="font-medium my-4 text-gray-800">Modificar Fecha Probable de Parto:</p>
            <div class="font-light">
                <CampoFecha
                    class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    v-model="fpp"
                    :placeholder="puedeCalcularFPP ? 'Puede usar la calculada o modificar manualmente' : 'Requiere FUM válida del paso anterior'" />
            </div>
            
            <p v-if="puedeCalcularFPP" class="text-xs text-gray-500 mt-1">
                💡 Puede usar la FPP calculada automáticamente o modificarla manualmente según su criterio médico.
            </p>
        </div>


    </div>
</template>