<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataReceta } = useFormDataStore();
const documentos = useDocumentosStore();

const indicaciones = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.indicaciones !== '') {
        indicaciones.value = documentos.currentDocument.indicaciones;
    }

    if (formDataReceta.indicaciones) {
        indicaciones.value = formDataReceta.indicaciones;
    }
});

onUnmounted(() => {
    if (!formDataReceta.indicaciones) {
        formDataReceta.indicaciones = '';
    }
});

watch(indicaciones, (newValue) => {
    formDataReceta.indicaciones = newValue;
});
</script>

<template>
    <div>
        <h2 class="font-bold mb-4 text-gray-800 leading-5">INDICACIONES:</h2>
        <div data-campo="indicaciones" class="mt-4">
            <div class="font-light">
                <textarea
                    class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
                    v-model="indicaciones"
                    data-skip-validation
                >
                </textarea>
            </div>
        </div>
    </div>
</template>
