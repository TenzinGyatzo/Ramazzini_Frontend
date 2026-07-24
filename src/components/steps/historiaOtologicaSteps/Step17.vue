<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataHistoriaOtologica } = useFormDataStore();

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);


// Valor local para la pregunta principal
const tiempoExposicionLaboral = ref('NINGUNO');

onMounted(() => {
    // Verificar si formDataHistoriaOtologica.tiempoExposicionLaboral tiene un valor y establecerlo en tiempoExposicionLaboral
    if (formDataHistoriaOtologica.tiempoExposicionLaboral) {
        tiempoExposicionLaboral.value = formDataHistoriaOtologica.tiempoExposicionLaboral;
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para tiempoExposicionLaboral
    if (!formDataHistoriaOtologica.tiempoExposicionLaboral) {
        formDataHistoriaOtologica.tiempoExposicionLaboral = tiempoExposicionLaboral.value;
    }
});

// Sincronizar tiempoExposicionLaboral con formData
watch(tiempoExposicionLaboral, (newValue) => {
    formDataHistoriaOtologica.tiempoExposicionLaboral = newValue;
});

</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">TIEMPO DE EXPOSICIÓN</h1>
        <p v-else class="text-sm font-semibold mb-2 text-gray-800">TIEMPO DE EXPOSICIÓN</p>
        <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-700">Exposición a Ruido</h2>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div :class="variant === 'compact' ? 'mb-3' : 'mb-8'">
            <p :class="variant === 'compact' ? 'text-sm font-semibold mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿Cuánto tiempo ha trabajado en ambientes ruidosos?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card sin iconos -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Opción Ninguno -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        tiempoExposicionLaboral === 'NINGUNO' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="NINGUNO" 
                        v-model="tiempoExposicionLaboral" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            tiempoExposicionLaboral === 'NINGUNO' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        NINGUNO
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="tiempoExposicionLaboral === 'NINGUNO'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Menos de 1 año -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        tiempoExposicionLaboral === 'MENOS DE 1 AÑO' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="MENOS DE 1 AÑO" 
                        v-model="tiempoExposicionLaboral" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-xs transition-colors duration-200',
                            tiempoExposicionLaboral === 'MENOS DE 1 AÑO' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        MENOS DE 1 AÑO
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="tiempoExposicionLaboral === 'MENOS DE 1 AÑO'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 1 - 5 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        tiempoExposicionLaboral === '1 - 5 AÑOS' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="1 - 5 AÑOS" 
                        v-model="tiempoExposicionLaboral" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            tiempoExposicionLaboral === '1 - 5 AÑOS' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        1 - 5 AÑOS
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="tiempoExposicionLaboral === '1 - 5 AÑOS'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 6 - 10 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        tiempoExposicionLaboral === '6 - 10 AÑOS' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="6 - 10 AÑOS" 
                        v-model="tiempoExposicionLaboral" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            tiempoExposicionLaboral === '6 - 10 AÑOS' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        6 - 10 AÑOS
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="tiempoExposicionLaboral === '6 - 10 AÑOS'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 11 - 15 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        tiempoExposicionLaboral === '11 - 15 AÑOS' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="11 - 15 AÑOS" 
                        v-model="tiempoExposicionLaboral" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            tiempoExposicionLaboral === '11 - 15 AÑOS' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        11 - 15 AÑOS
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="tiempoExposicionLaboral === '11 - 15 AÑOS'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción 16 - 20 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        tiempoExposicionLaboral === '16 - 20 AÑOS' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="16 - 20 AÑOS" 
                        v-model="tiempoExposicionLaboral" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-sm transition-colors duration-200',
                            tiempoExposicionLaboral === '16 - 20 AÑOS' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        16 - 20 AÑOS
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="tiempoExposicionLaboral === '16 - 20 AÑOS'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción Más de 20 años -->
                <label 
                    :class="[
                        'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        tiempoExposicionLaboral === 'MÁS DE 20 AÑOS' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="MÁS DE 20 AÑOS" 
                        v-model="tiempoExposicionLaboral" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-xs transition-colors duration-200',
                            tiempoExposicionLaboral === 'MÁS DE 20 AÑOS' ? 'text-emerald-700 font-semibold' : 'text-gray-700'
                        ]"
                    >
                        MÁS DE 20 AÑOS
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="tiempoExposicionLaboral === 'MÁS DE 20 AÑOS'"
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