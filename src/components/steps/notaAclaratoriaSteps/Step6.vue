<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataNotaAclaratoria } = useFormDataStore();
const documentos = useDocumentosStore();

const descripcionAclaracion = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.descripcionAclaracion !== '') {
        descripcionAclaracion.value = documentos.currentDocument.descripcionAclaracion;
    }

    if (formDataNotaAclaratoria.descripcionAclaracion) {
        descripcionAclaracion.value = formDataNotaAclaratoria.descripcionAclaracion;
    }
});

onUnmounted(() => {
    if (!formDataNotaAclaratoria.descripcionAclaracion) {
        formDataNotaAclaratoria.descripcionAclaracion = '';
    }
});

watch(descripcionAclaracion, (newValue) => {
    formDataNotaAclaratoria.descripcionAclaracion = newValue;
});
</script>

<template>
    <div>
        <!-- Jerarquía Visual Mejorada -->
        <h1 class="text-2xl font-bold mb-4 text-gray-900">DESCRIPCIÓN DE LA ACLARACIÓN</h1>
        
        <!-- Campo de textarea mejorado -->
        <div class="mb-4">
            <label class="block text-base font-medium leading-5 text-gray-800 mb-3">
                Describa en detalle la aclaración que se debe realizar al documento:
            </label>
            <div data-campo="descripcionAclaracion" class="relative">
                <textarea
                    class="w-full p-4 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48 resize-y"
                    v-model="descripcionAclaracion"
                    placeholder=""
                    required
                    data-skip-validation
                >
                </textarea>
            </div>
        </div>

        <!-- Información adicional sobre cómo redactar -->
        <div class="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 class="text-xs font-medium text-blue-900 mb-2">Consejos para una buena redacción:</h4>
                    <ul class="text-xs text-blue-800 space-y-1">
                        <li>• Sea detallado y específico sobre qué se aclara</li>
                        <li>• Incluya la información correcta o complementaria</li>
                        <li>• Mantenga claridad en la explicación</li>
                        <li>• Use lenguaje técnico apropiado cuando sea necesario</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

