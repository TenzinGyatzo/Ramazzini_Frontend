<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataHistoriaClinica } = useFormDataStore();

// Valor local para la pregunta principal
const cesareas = ref('0 (Ninguna)');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.cesareas tiene un valor y establecerlo en cesareas
    if (formDataHistoriaClinica.cesareas) {
        cesareas.value = formDataHistoriaClinica.cesareas;
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para cesareas
    if (!formDataHistoriaClinica.cesareas) {
        formDataHistoriaClinica.cesareas = cesareas.value;
    }
});

// Sincronizar cesareas con formData
watch(cesareas, (newValue) => {
    formDataHistoriaClinica.cesareas = newValue;
});

</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
        <h2 :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-700' : 'text-lg font-semibold mb-4 text-gray-700'">CESÁREAS</h2>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿Cuántas cesáreas ha tenido la paciente como método de parto?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos - 2 columnas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Opción 0 (Ninguna) -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        cesareas === '0 (Ninguna)' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="0 (Ninguna)" 
                        v-model="cesareas" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            cesareas === '0 (Ninguna)' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        0 (Ninguna)
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="cesareas === '0 (Ninguna)'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 1 cesarea -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        cesareas === '1 cesarea' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="1 cesarea" 
                        v-model="cesareas" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            cesareas === '1 cesarea' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        1 cesárea
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="cesareas === '1 cesarea'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 2 cesareas -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        cesareas === '2 cesareas' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="2 cesareas" 
                        v-model="cesareas" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            cesareas === '2 cesareas' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        2 cesáreas
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="cesareas === '2 cesareas'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 3 cesareas -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        cesareas === '3 cesareas' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="3 cesareas" 
                        v-model="cesareas" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            cesareas === '3 cesareas' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        3 cesáreas
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="cesareas === '3 cesareas'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Más de 3 cesareas -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        cesareas === 'Más de 3 cesareas' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Más de 3 cesareas" 
                        v-model="cesareas" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-xs transition-colors duration-200',
                            cesareas === 'Más de 3 cesareas' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Más de 3 cesáreas
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="cesareas === 'Más de 3 cesareas'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>
            </div>
        </div>
    </div>
</template>