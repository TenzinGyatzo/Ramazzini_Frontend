<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const trabajadores = useTrabajadoresStore();
const { formDataCertificadoExpedito } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para la pregunta principal
const impedimentosFisicosPregunta = ref('No');
const impedimentosFisicos = ref ('');

const TEXTO_SIN_IMPEDIMENTO = 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita';

// Punto 52: el «Sí» sin descripción se conserva (antes, al cerrarse el paso, se escribía «no
// presenta impedimento…»); al guardar se pide la descripción. Se lee del formulario o del
// documento guardado.
onMounted(() => {
    const actual = formDataCertificadoExpedito.impedimentosFisicos ?? documentos.currentDocument?.impedimentosFisicos;
    if (actual === undefined || actual === null || actual === TEXTO_SIN_IMPEDIMENTO) {
        impedimentosFisicosPregunta.value = 'No';
        formDataCertificadoExpedito.impedimentosFisicos = TEXTO_SIN_IMPEDIMENTO;
    } else {
        impedimentosFisicosPregunta.value = 'Si';
        impedimentosFisicos.value = actual;
    }
});

onUnmounted(() => {
    if (impedimentosFisicosPregunta.value === 'No') {
        formDataCertificadoExpedito.impedimentosFisicos = TEXTO_SIN_IMPEDIMENTO;
    }
});


// Sincronizar valores con formData
watch(impedimentosFisicos, (newValue) => {
    formDataCertificadoExpedito.impedimentosFisicos = newValue;
});

// Watch para establecer 'Default' cuando impedimentosFisicos sea 'No'
watch(impedimentosFisicosPregunta, (newValue) => {
    if (newValue === 'No') {
        formDataCertificadoExpedito.impedimentosFisicos =
            trabajadores.currentTrabajador.sexo === 'Femenino'
            ? 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita'
            : 'no presenta impedimento físico para desarrollar el puesto que actualmente solicita';
    }
    if (newValue === 'Si') {
        formDataCertificadoExpedito.impedimentosFisicos = impedimentosFisicos.value;
    }
});
</script>

<template>
    <div>
        <h1 class="font-bold mb-4 text-gray-800 leading-5">Certificado de Salud</h1>
        <h2>IMPEDIMENTOS FÍSICOS</h2>
        <!-- Pregunta principal -->
        <div class="mb-4">
            <p class="font-medium mb-1 text-gray-800 leading-5">¿Hay impedimentos físicos que se deban mencionar en el certificado?
            </p>
            <div class="flex items-center space-x-6 font-light">
                <label class="flex items-center space-x-2">
                    <input type="radio" value="No" v-model="impedimentosFisicosPregunta" class="form-radio accent-emerald-600" />
                    <span>No</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="radio" value="Si" v-model="impedimentosFisicosPregunta" class="form-radio accent-emerald-600" />
                    <span>Si</span>
                </label>
            </div>
        </div>

        <!-- Opciones adicionales, solo visibles si el resultado es "Sí" -->
        <div v-if="impedimentosFisicosPregunta === 'Si'" class="mt-4">
            <p class="font-medium mb-2 text-gray-800">Resumen:</p>
            <div data-campo="impedimentosFisicos" class="font-light">
                <textarea
                    class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    v-model="formDataCertificadoExpedito.impedimentosFisicos"
                    required
                >
                </textarea>
            </div>
        </div>
    </div>
</template>