<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const antecedentes = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.antecedentes !== '') {
        antecedentes.value = documentos.currentDocument.antecedentes;
    }

    if (formDataNotaMedica.antecedentes) {
        antecedentes.value = formDataNotaMedica.antecedentes;
    }
});

onUnmounted(() => {
    if (!formDataNotaMedica.antecedentes) {
        formDataNotaMedica.antecedentes = '';
    }
});

watch(antecedentes, (newValue) => {
    formDataNotaMedica.antecedentes = newValue;
});
</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 class="text-2xl font-bold mb-4 text-gray-900">ANTECEDENTES</h1>
        
        <!-- Campo de textarea mejorado -->
        <div class="mb-4">
            <label class="block text-base font-medium leading-5 text-gray-800 mb-3">
                Describa los antecedentes médicos relevantes:
            </label>
            <div class="relative">
                <textarea
                    class="w-full p-4 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48 resize-y"
                    v-model="antecedentes"
                    placeholder="Mencione:

• 'Enfermedades previas y cirugías'
• 'Alergias y medicamentos'
• 'Hospitalizaciones y traumas'
"
                    required
                    data-skip-validation
                >
                </textarea>
            </div>
        </div>

        <!-- Información adicional sobre cómo redactar -->
        <div class="nota-medica-tip mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 class="text-xs font-medium text-blue-900 mb-2">Consejos para describir la exploración:</h4>
                    <ul class="text-xs text-blue-800 space-y-1">
                        <li>• Describa hallazgos normales y anormales</li>
                        <li>• Sea objetivo y específico en las observaciones</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>
