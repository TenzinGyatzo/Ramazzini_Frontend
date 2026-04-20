<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const diagnostico = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.diagnostico !== '') {
        diagnostico.value = documentos.currentDocument.diagnostico;
    }

    if (formDataNotaMedica.diagnostico) {
        diagnostico.value = formDataNotaMedica.diagnostico;
    }
});

onUnmounted(() => {
    if (!formDataNotaMedica.diagnostico) {
        formDataNotaMedica.diagnostico = '';
    }
});

watch(diagnostico, (newValue) => {
    formDataNotaMedica.diagnostico = newValue;
});
</script>

<template>
    <div class="nota-medica-dark-inputs">
        <h2 class="font-bold mb-4 text-gray-800 leading-5">IDX:</h2>
        <div class="mt-4">
            <div class="font-light">
                <input
                    class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    v-model="diagnostico"
                    required
                    data-skip-validation
                >
            </div>
        </div>
    </div>
</template>
