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
const abortos = ref('0 (Ninguno)');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.abortos tiene un valor y establecerlo en abortos
    if (formDataHistoriaClinica.abortos) {
        abortos.value = formDataHistoriaClinica.abortos;
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para abortos
    if (!formDataHistoriaClinica.abortos) {
        formDataHistoriaClinica.abortos = abortos.value;
    }
});

// Sincronizar abortos con formData
watch(abortos, (newValue) => {
    formDataHistoriaClinica.abortos = newValue;
});

</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
        <h2 :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-700' : 'text-lg font-semibold mb-4 text-gray-700'">ABORTOS</h2>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿La trabajadora ha experimentado pérdidas de embarazo antes de las 20 semanas? En caso afirmativo, ¿cuántas?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos - 2 columnas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Opción 0 (Ninguno) -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        abortos === '0 (Ninguno)' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="0 (Ninguno)" 
                        v-model="abortos" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            abortos === '0 (Ninguno)' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        0 (Ninguno)
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="abortos === '0 (Ninguno)'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 1 aborto -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        abortos === '1 aborto' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="1 aborto" 
                        v-model="abortos" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            abortos === '1 aborto' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        1 aborto
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="abortos === '1 aborto'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 2 abortos -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        abortos === '2 abortos' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="2 abortos" 
                        v-model="abortos" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            abortos === '2 abortos' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        2 abortos
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="abortos === '2 abortos'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 3 abortos -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        abortos === '3 abortos' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="3 abortos" 
                        v-model="abortos" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            abortos === '3 abortos' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        3 abortos
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="abortos === '3 abortos'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Más de 3 abortos -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        abortos === 'Más de 3 abortos' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Más de 3 abortos" 
                        v-model="abortos" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-xs transition-colors duration-200',
                            abortos === 'Más de 3 abortos' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Más de 3 abortos
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="abortos === 'Más de 3 abortos'"
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