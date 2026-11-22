<script setup>
import { ref, watch } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataCertificadoExpedito } = useFormDataStore();

// Sin opción preseleccionada: la aptitud se elige de forma explícita (es obligatoria y al
// guardar se pide si falta). Al editar se muestra la guardada.
const aptitudPuesto = ref(formDataCertificadoExpedito.aptitudPuesto || '');

// Sincronizar el valor seleccionado con formDataCertificadoExpedito.aptitudPuesto
watch(aptitudPuesto, (newValue) => {
    formDataCertificadoExpedito.aptitudPuesto = newValue;
});

</script>

<template>
    <h1 class="font-bold mb-4 text-gray-800 leading-5">Aptitud al Puesto</h1>

    <div class="mb-4">
        <h2 class="text-lg font-semibold mb-4 text-gray-800">Selección de Aptitud</h2>
        <div data-campo="aptitudPuesto" class="grid grid-cols-1 gap-2">
            <label class="flex items-center gap-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="Apto Sin Restricciones" v-model="aptitudPuesto"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">Apto sin restricciones</p>
                    <p class="text-sm text-gray-600 italic">
                        No tiene impedimentos para el puesto al que aspira o desempeña.
                    </p>
                </div>
            </label>

            <label class="flex items-center gap-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="Apto Con Precaución" v-model="aptitudPuesto"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">Apto con precaución</p>
                    <p class="text-sm text-gray-600 italic">
                        Requiere vigilancia médica más frecuente.
                    </p>
                </div>
            </label>

            <label class="flex items-center gap-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="Apto Con Restricciones" v-model="aptitudPuesto"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">Apto con restricciones</p>
                    <p class="text-sm text-gray-600 italic">
                        Requiere adaptaciones razonables para asegurar la seguridad y salud.
                    </p>
                </div>
            </label>

            <label class="flex items-center gap-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors duration-150 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer shadow-sm">
                <input type="radio" value="No Apto" v-model="aptitudPuesto"
                    class="form-radio mt-1 accent-emerald-600" />
                <div>
                    <p class="font-semibold block text-gray-800">No apto</p>
                    <p class="text-sm text-gray-600 italic">
                        No está permitido el desempeño del puesto al que aspira.
                    </p>
                </div>
            </label>

        </div>
    </div>

    <div class="font-light mb-4">
        <textarea
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 custom-height"
            v-model="formDataCertificadoExpedito.descripcionSobreAptitud"
            placeholder="Descripción sobre la aptitud"
            >
        </textarea>
    </div>


</template>
