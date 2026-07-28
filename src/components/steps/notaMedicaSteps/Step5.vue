<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const exploracionFisica = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.exploracionFisica !== '') {
        exploracionFisica.value = documentos.currentDocument.exploracionFisica;
    }

    if (formDataNotaMedica.exploracionFisica) {
        exploracionFisica.value = formDataNotaMedica.exploracionFisica;
    }
});

onUnmounted(() => {
    if (!formDataNotaMedica.exploracionFisica) {
        formDataNotaMedica.exploracionFisica = '';
    }
});

watch(exploracionFisica, (newValue) => {
    formDataNotaMedica.exploracionFisica = newValue;
});
</script>

<template>
    <div class="nota-medica-dark-inputs">
        <h1
            v-if="variant !== 'compact'"
            class="text-2xl font-bold mb-4 text-gray-900"
        >
            EXPLORACIÓN FÍSICA
        </h1>
        <p
            v-else
            class="text-sm font-semibold text-gray-800 mb-2"
        >
            Exploración física
        </p>
        
        <!-- Campo de textarea mejorado -->
        <div class="mb-4">
            <label
                v-if="variant !== 'compact'"
                class="block text-base font-medium leading-5 text-gray-800 mb-3"
            >
                Describa los hallazgos de la exploración física:
            </label>
            <div class="relative">
                <textarea
                    :class="variant === 'compact'
                        ? 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-32 resize-y'
                        : 'w-full p-4 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48 resize-y'"
                    v-model="exploracionFisica"
                    placeholder="Incluya:
• Estado general del paciente
• Hallazgos relevantes observados 
"
                    required
                    data-skip-validation
                >
                </textarea>
            </div>
        </div>

        <!-- Información adicional sobre cómo redactar -->
        <div
            v-if="variant !== 'compact'"
            class="nota-medica-tip mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        >
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
