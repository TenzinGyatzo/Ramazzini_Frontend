<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataNotaAclaratoria } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para el impacto clínico
const impactoClinico = ref('LEVE');

onMounted(() => {
    if (documentos.currentDocument) {
        // Si se está editando un documento, usa los valores existentes
        impactoClinico.value = documentos.currentDocument.impactoClinico || 'LEVE';
    } else {
        // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
        impactoClinico.value = formDataNotaAclaratoria.impactoClinico || 'LEVE';
    }
});

onUnmounted(() => {
    // Asegurar que formData tenga un valor inicial para impactoClinico
    if (!formDataNotaAclaratoria.impactoClinico) {
        formDataNotaAclaratoria.impactoClinico = impactoClinico.value;
    }
});

// Sincronizar impactoClinico con formData
watch(impactoClinico, (newValue) => {
    formDataNotaAclaratoria.impactoClinico = newValue;
});
</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 class="text-2xl font-bold mb-4 text-gray-900">IMPACTO CLÍNICO</h1>
        
        <!-- Pregunta principal con mejor jerarquía -->
        <div data-campo="impactoClinico" class="mb-8">
            <p class="text-lg font-medium mb-4 text-gray-800">¿Cuál es el impacto clínico de esta aclaración?</p>
            
            <!-- Diseño de Radio Buttons más Visual tipo Card -->
            <div class="grid grid-cols-3 gap-3">
                <!-- Opción LEVE -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        impactoClinico === 'LEVE' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="LEVE" 
                        v-model="impactoClinico" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            impactoClinico === 'LEVE' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        LEVE
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="impactoClinico === 'LEVE'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción MODERADO -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        impactoClinico === 'MODERADO' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="MODERADO" 
                        v-model="impactoClinico" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            impactoClinico === 'MODERADO' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        MODERADO
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="impactoClinico === 'MODERADO'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>

                <!-- Opción SEVERO -->
                <label 
                    :class="[
                        'relative flex flex-col items-center justify-center py-4 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
                        impactoClinico === 'SEVERO' 
                            ? 'border-emerald-600 bg-emerald-50 shadow-md' 
                            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
                    ]"
                >
                    <input 
                        type="radio" 
                        value="SEVERO" 
                        v-model="impactoClinico" 
                        class="sr-only" 
                    />
                    <span 
                        :class="[
                            'text-base font-semibold transition-colors duration-200',
                            impactoClinico === 'SEVERO' ? 'text-emerald-700' : 'text-gray-700'
                        ]"
                    >
                        SEVERO
                    </span>
                    <!-- Indicador de selección -->
                    <div 
                        v-if="impactoClinico === 'SEVERO'"
                        class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </label>
            </div>
        </div>

        <!-- Información adicional -->
        <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 class="text-xs font-medium text-blue-900 mb-2">Criterios de evaluación:</h4>
                    <ul class="text-xs text-blue-800 space-y-1">
                        <li>• <strong>LEVE:</strong> La aclaración no afecta significativamente el diagnóstico o tratamiento</li>
                        <li>• <strong>MODERADO:</strong> La aclaración puede tener implicaciones en el seguimiento del paciente</li>
                        <li>• <strong>SEVERO:</strong> La aclaración es crítica para el diagnóstico, tratamiento o pronóstico</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

