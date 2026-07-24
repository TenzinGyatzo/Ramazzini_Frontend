<script setup>
import { ref, watch, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataAptitud } = useFormDataStore();

// Valor local para la aptitudPuesto principal, inicializado con el valor actual del store
const aptitudPuesto = ref(formDataAptitud.aptitudPuesto || 'Apto Sin Restricciones');

// Sincronizar el valor seleccionado con formDataAptitud.aptitudPuesto
watch(aptitudPuesto, (newValue) => {
    formDataAptitud.aptitudPuesto = newValue;
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para aptitudPuesto
    if (!formDataAptitud.aptitudPuesto) {
        formDataAptitud.aptitudPuesto = 'Apto Sin Restricciones';
    }
});
</script>

<template>
    <div>
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">APTITUD AL PUESTO</h1>
        <h3 v-if="variant !== 'compact'" class="text-lg font-medium mb-6 text-gray-700">APTITUD AL PUESTO</h3>
        
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            
            <!-- Diseño de Radio Buttons más Visual tipo Card - Una sola columna -->
            <div class="grid grid-cols-1 gap-3">
                <!-- Opción Apto Sin Restricciones -->
                <label 
                    :class="[
                        'relative flex flex-col items-start justify-start py-2 px-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        aptitudPuesto === 'Apto Sin Restricciones' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Apto Sin Restricciones" 
                        v-model="aptitudPuesto" 
                        class="sr-only" 
                    />
                    <div class="flex items-start justify-between w-full">
                        <div class="flex-1">
                            <h4 
                                :class="[
                                    'text-base font-semibold mb-1 transition-colors duration-200',
                                    aptitudPuesto === 'Apto Sin Restricciones' ? 'text-emerald-800' : 'text-gray-800'
                                ]"
                            >
                                Apto sin restricciones
                            </h4>
                            <p 
                                :class="[
                                    'text-sm transition-colors duration-200 italic',
                                    aptitudPuesto === 'Apto Sin Restricciones' ? 'text-emerald-700' : 'text-gray-600'
                                ]"
                            >
                                No tiene impedimentos para el puesto al <br>que aspira o desempeña.
                            </p>
                        </div>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="aptitudPuesto === 'Apto Sin Restricciones'"
                            class="flex-shrink-0 ml-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </label>

                <!-- Opción Apto Con Precaución -->
                <label 
                    :class="[
                        'relative flex flex-col items-start justify-start py-2 px-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        aptitudPuesto === 'Apto Con Precaución' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Apto Con Precaución" 
                        v-model="aptitudPuesto" 
                        class="sr-only" 
                    />
                    <div class="flex items-start justify-between w-full">
                        <div class="flex-1">
                            <h4 
                                :class="[
                                    'text-base font-semibold mb-1 transition-colors duration-200',
                                    aptitudPuesto === 'Apto Con Precaución' ? 'text-emerald-800' : 'text-gray-800'
                                ]"
                            >
                                Apto con precaución
                            </h4>
                            <p 
                                :class="[
                                    'text-sm transition-colors duration-200 italic',
                                    aptitudPuesto === 'Apto Con Precaución' ? 'text-emerald-700' : 'text-gray-600'
                                ]"
                            >
                                Requiere una vigilancia médica más <br>frecuente.
                            </p>
                        </div>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="aptitudPuesto === 'Apto Con Precaución'"
                            class="flex-shrink-0 ml-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </label>

                <!-- Opción Apto Con Restricciones -->
                <label 
                    :class="[
                        'relative flex flex-col items-start justify-start py-2 px-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        aptitudPuesto === 'Apto Con Restricciones' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Apto Con Restricciones" 
                        v-model="aptitudPuesto" 
                        class="sr-only" 
                    />
                    <div class="flex items-start justify-between w-full">
                        <div class="flex-1">
                            <h4 
                                :class="[
                                    'text-base font-semibold mb-1 transition-colors duration-200',
                                    aptitudPuesto === 'Apto Con Restricciones' ? 'text-emerald-800' : 'text-gray-800'
                                ]"
                            >
                                Apto con restricciones
                            </h4>
                            <p 
                                :class="[
                                    'text-sm transition-colors duration-200 italic',
                                    aptitudPuesto === 'Apto Con Restricciones' ? 'text-emerald-700' : 'text-gray-600'
                                ]"
                            >
                                Requiere adaptaciones razonables para asegurar la seguridad y salud.
                            </p>
                        </div>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="aptitudPuesto === 'Apto Con Restricciones'"
                            class="flex-shrink-0 ml-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </label>

                <!-- Opción No Apto -->
                <label 
                    :class="[
                        'relative flex flex-col items-start justify-start py-2 px-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        aptitudPuesto === 'No Apto' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="No Apto" 
                        v-model="aptitudPuesto" 
                        class="sr-only" 
                    />
                    <div class="flex items-start justify-between w-full">
                        <div class="flex-1">
                            <h4 
                                :class="[
                                    'text-base font-semibold mb-1 transition-colors duration-200',
                                    aptitudPuesto === 'No Apto' ? 'text-emerald-800' : 'text-gray-800'
                                ]"
                            >
                                No apto
                            </h4>
                            <p 
                                :class="[
                                    'text-sm transition-colors duration-200 italic',
                                    aptitudPuesto === 'No Apto' ? 'text-emerald-700' : 'text-gray-600'
                                ]"
                            >
                                No está permitido el desempeño <br>del puesto al que aspira.
                            </p>
                        </div>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="aptitudPuesto === 'No Apto'"
                            class="flex-shrink-0 ml-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </label>

                <!-- Opción Evaluación No Completada -->
                <label 
                    :class="[
                        'relative flex flex-col items-start justify-start py-2 px-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        aptitudPuesto === 'Evaluación No Completada' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Evaluación No Completada" 
                        v-model="aptitudPuesto" 
                        class="sr-only" 
                    />
                    <div class="flex items-start justify-between w-full">
                        <div class="flex-1">
                            <h4 
                                :class="[
                                    'text-base font-semibold mb-1 transition-colors duration-200',
                                    aptitudPuesto === 'Evaluación No Completada' ? 'text-emerald-800' : 'text-gray-800'
                                ]"
                            >
                                Evaluación no completada
                            </h4>
                            <p 
                                :class="[
                                    'text-sm transition-colors duration-200 italic',
                                    aptitudPuesto === 'Evaluación No Completada' ? 'text-emerald-700' : 'text-gray-600'
                                ]"
                            >
                                Para concluir, requiere evaluaciones adicionales o tratamiento médico.
                            </p>
                        </div>
                        <!-- Indicador de selección -->
                        <div 
                            v-if="aptitudPuesto === 'Evaluación No Completada'"
                            class="flex-shrink-0 ml-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </label>
            </div>
        </div>
    </div>
</template>
