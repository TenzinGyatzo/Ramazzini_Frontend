<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataNotaAclaratoria } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para el alcance de aclaración
const alcanceAclaracion = ref('ACLARA');

onMounted(() => {
    if (documentos.currentDocument) {
        // Si se está editando un documento, usa los valores existentes
        alcanceAclaracion.value = documentos.currentDocument.alcanceAclaracion || 'ACLARA';
    } else {
        // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
        alcanceAclaracion.value = formDataNotaAclaratoria.alcanceAclaracion || 'ACLARA';
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para alcanceAclaracion
    if (!formDataNotaAclaratoria.alcanceAclaracion) {
        formDataNotaAclaratoria.alcanceAclaracion = alcanceAclaracion.value;
    }
});

// Sincronizar alcanceAclaracion con formData
watch(alcanceAclaracion, (newValue) => {
    formDataNotaAclaratoria.alcanceAclaracion = newValue;
});
</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 class="text-2xl font-bold mb-4 text-gray-900">ALCANCE DE LA ACLARACIÓN</h1>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div data-campo="alcanceAclaracion" class="mb-8">
            <p class="text-lg font-medium mb-4 text-gray-800">¿Qué tipo de aclaración se realizará?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Opción ACLARA -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        alcanceAclaracion === 'ACLARA' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="ACLARA" 
                        v-model="alcanceAclaracion" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200 mb-1',
                            alcanceAclaracion === 'ACLARA' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        ACLARA
                    </span>
                    <span class="text-xs text-center text-gray-600">
                        Precisa información
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="alcanceAclaracion === 'ACLARA'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción CORRIGE -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        alcanceAclaracion === 'CORRIGE' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="CORRIGE" 
                        v-model="alcanceAclaracion" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200 mb-1',
                            alcanceAclaracion === 'CORRIGE' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        CORRIGE
                    </span>
                    <span class="text-xs text-center text-gray-600">
                        Corrige error clínico
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="alcanceAclaracion === 'CORRIGE'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción COMPLEMENTA -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        alcanceAclaracion === 'COMPLEMENTA' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="COMPLEMENTA" 
                        v-model="alcanceAclaracion" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200 mb-1',
                            alcanceAclaracion === 'COMPLEMENTA' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        COMPLEMENTA
                    </span>
                    <span class="text-xs text-center text-gray-600">
                        Agrega información omitida
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="alcanceAclaracion === 'COMPLEMENTA'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción INVALIDA -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        alcanceAclaracion === 'INVALIDA' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="INVALIDA" 
                        v-model="alcanceAclaracion" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200 mb-1',
                            alcanceAclaracion === 'INVALIDA' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        INVALIDA
                    </span>
                    <span class="text-xs text-center text-gray-600">
                        Declara no válida una parte
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="alcanceAclaracion === 'INVALIDA'"
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

