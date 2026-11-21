<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA, CLASE_TEXTAREA } from '@/components/steps/captura/estiloCaptura';

// Captura rápida (punto 38): los consejos de redacción se abren a petición
const capturaRapida = enCapturaRapida();
const verConsejos = ref(false);
const PLACEHOLDER_MOTIVO = `Consulta médica por motivo de...
El trabajador presenta...
Solicita evaluación médica debido a...
Acude para seguimiento de...
`;

// Al abrir el paso, si el motivo de consulta está vacío, el cursor va a él
useAutofocoPrimerVacio(['motivoConsulta']);

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

const motivoConsulta = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.motivoConsulta !== '') {
        motivoConsulta.value = documentos.currentDocument.motivoConsulta;
    }

    if (formDataNotaMedica.motivoConsulta) {
        motivoConsulta.value = formDataNotaMedica.motivoConsulta;
    }
});

watch(motivoConsulta, (newValue) => {
    formDataNotaMedica.motivoConsulta = newValue;
});
</script>

<template>
    <div v-if="capturaRapida" class="nota-medica-dark-inputs">
        <div data-campo="motivoConsulta">
            <div class="flex items-baseline justify-between gap-3 mb-1">
                <label for="motivoConsulta" :class="CLASE_ETIQUETA">
                    Motivo de consulta <span class="text-red-500">*</span>
                </label>
                <button
                    type="button"
                    tabindex="-1"
                    class="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
                    :aria-expanded="verConsejos"
                    @click="verConsejos = !verConsejos"
                >
                    <i class="fas fa-lightbulb" aria-hidden="true"></i>
                    Consejos de redacción
                </button>
            </div>
            <ul v-if="verConsejos" class="mb-2 text-xs text-gray-600 list-disc pl-5 space-y-0.5">
                <li>Sea específico y detallado en la descripción.</li>
                <li>Incluya síntomas, duración y gravedad.</li>
                <li>Evite abreviaciones médicas complejas.</li>
            </ul>
            <textarea
                id="motivoConsulta"
                v-model="motivoConsulta"
                rows="4"
                :class="CLASE_TEXTAREA"
                :placeholder="PLACEHOLDER_MOTIVO"
                required
                data-skip-validation
            ></textarea>
        </div>
    </div>

    <div v-else class="nota-medica-dark-inputs">
        <h1
            v-if="variant !== 'compact'"
            class="text-2xl font-bold mb-4 text-gray-900"
        >
            MOTIVO DE CONSULTA
        </h1>
        <p
            v-else
            class="text-sm font-semibold text-gray-800 mb-2"
        >
            Motivo de consulta <span class="text-red-500">*</span>
        </p>
        
        <!-- Campo de textarea mejorado -->
        <div data-campo="motivoConsulta" class="mb-4">
            <label
                v-if="variant !== 'compact'"
                class="block text-base font-medium leading-5 text-gray-800 mb-3"
            >
                Describa el motivo de la consulta médica: <span class="text-red-500">*</span>
            </label>
            <div class="relative">
                <textarea
                    :class="variant === 'compact'
                        ? 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48 resize-y'
                        : 'w-full p-4 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-64 resize-y'"
                    v-model="motivoConsulta"
                    placeholder="Consulta médica por motivo de...
El trabajador presenta...
Solicita evaluación médica debido a...
Acude para seguimiento de...
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
                    <h4 class="text-xs font-medium text-blue-900 mb-2">Consejos para una buena redacción:</h4>
                    <ul class="text-xs text-blue-800 space-y-1">
                        <li>• Sea específico y detallado en la descripción</li>
                        <li>• Incluya síntomas, duración y gravedad</li>
                        <li>• Evite abreviaciones médicas complejas</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>
