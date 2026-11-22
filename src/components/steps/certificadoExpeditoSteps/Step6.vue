<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataCertificadoExpedito } = useFormDataStore();

// Valor local para la gradoSalud principal, inicializado con el valor actual del store
const gradoSalud = ref(formDataCertificadoExpedito.gradoSalud || 'Bueno');

// Sincronizar el valor seleccionado con formDataCertificadoExpedito.gradoSalud
watch(gradoSalud, (newValue) => {
    formDataCertificadoExpedito.gradoSalud = newValue;
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para gradoSalud
    if (!formDataCertificadoExpedito.gradoSalud) {
        formDataCertificadoExpedito.gradoSalud = 'Bueno';
    }
});
</script>

<template>
    <h1 class="font-bold mb-4 text-gray-800 leading-5">Grado de Salud</h1>

    <div class="mb-4">
        <h2 class="text-lg font-semibold mb-4 text-gray-800">Selección de Grado de Salud</h2>
        <div data-campo="gradoSalud" class="grid grid-cols-1 gap-4">

            <label class="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="Óptimo" v-model="gradoSalud"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">ÓPTIMO</p>
                </div>
            </label>

            <label class="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="Bueno" v-model="gradoSalud"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">BUENO</p>
                </div>
            </label>

            <label class="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="Regular" v-model="gradoSalud"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">REGULAR</p>
                </div>
            </label>

            <label class="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="Malo" v-model="gradoSalud"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">MALO</p>
                </div>
            </label>

        </div>


    </div>


</template>
