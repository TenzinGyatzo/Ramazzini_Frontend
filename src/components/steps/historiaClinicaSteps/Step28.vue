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
const menarca = ref('12-14 años');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.menarca tiene un valor y establecerlo en menarca
    if (formDataHistoriaClinica.menarca) {
        menarca.value = formDataHistoriaClinica.menarca;
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para menarca
    if (!formDataHistoriaClinica.menarca) {
        formDataHistoriaClinica.menarca = menarca.value;
    }
});

// Sincronizar menarca con formData
watch(menarca, (newValue) => {
    formDataHistoriaClinica.menarca = newValue;
});

</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
        <h2 :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-700' : 'text-lg font-semibold mb-4 text-gray-700'">MENARCA</h2>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿A qué edad experimentó la trabajadora su primera menstruación?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Opción Menos de 9 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        menarca === 'Menos de 9 años' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="Menos de 9 años" 
                        v-model="menarca" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-xs transition-colors duration-200',
                            menarca === 'Menos de 9 años' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        Menos de 9 años
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="menarca === 'Menos de 9 años'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 9-11 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        menarca === '9-11 años' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="9-11 años" 
                        v-model="menarca" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            menarca === '9-11 años' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        9-11 años
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="menarca === '9-11 años'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 12-14 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        menarca === '12-14 años' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="12-14 años" 
                        v-model="menarca" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            menarca === '12-14 años' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        12-14 años
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="menarca === '12-14 años'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 15-17 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        menarca === '15-17 años' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="15-17 años" 
                        v-model="menarca" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            menarca === '15-17 años' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        15-17 años
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="menarca === '15-17 años'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 18-20 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        menarca === '18-20 años' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="18-20 años" 
                        v-model="menarca" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            menarca === '18-20 años' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        18-20 años
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="menarca === '18-20 años'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 21-24 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        menarca === '21-24 años' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="21-24 años" 
                        v-model="menarca" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            menarca === '21-24 años' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        21-24 años
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="menarca === '21-24 años'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 25 años o más -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        menarca === '25 años o más' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="25 años o más" 
                        v-model="menarca" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            menarca === '25 años o más' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        25 años o más
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="menarca === '25 años o más'"
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