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
const frecuencia = ref('Regular');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.frecuencia tiene un valor y establecerlo en frecuencia
    if (formDataHistoriaClinica.frecuencia) {
        frecuencia.value = formDataHistoriaClinica.frecuencia;
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para frecuencia
    if (!formDataHistoriaClinica.frecuencia) {
        formDataHistoriaClinica.frecuencia = frecuencia.value;
    }
});

// Sincronizar frecuencia con formData
watch(frecuencia, (newValue) => {
    formDataHistoriaClinica.frecuencia = newValue;
});

</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
        <h2 :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-700' : 'text-lg font-semibold mb-4 text-gray-700'">FRECUENCIA</h2>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿Cómo describiría la frecuencia de los ciclos menstruales de la trabajadora?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos - 2 columnas en pantallas normales, 1 en xs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Opción Regular -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        frecuencia === 'Regular' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Regular" 
                        v-model="frecuencia" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            frecuencia === 'Regular' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Regular
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="frecuencia === 'Regular'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Oligomenorrea -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        frecuencia === 'Oligomenorrea' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Oligomenorrea" 
                        v-model="frecuencia" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            frecuencia === 'Oligomenorrea' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Oligomenorrea
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="frecuencia === 'Oligomenorrea'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Polimenorrea -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        frecuencia === 'Polimenorrea' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Polimenorrea" 
                        v-model="frecuencia" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            frecuencia === 'Polimenorrea' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Polimenorrea
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="frecuencia === 'Polimenorrea'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Amenorrea -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        frecuencia === 'Amenorrea' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Amenorrea" 
                        v-model="frecuencia" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            frecuencia === 'Amenorrea' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Amenorrea
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="frecuencia === 'Amenorrea'"
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