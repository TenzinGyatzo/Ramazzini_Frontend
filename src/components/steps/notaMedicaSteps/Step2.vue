<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA, CLASE_TEXTAREA } from '@/components/steps/captura/estiloCaptura';

// Punto 38: un solo diseño en los dos modos; los consejos de redacción se abren a petición
const capturaRapida = enCapturaRapida();
const verConsejos = ref(false);
const PLACEHOLDER_MOTIVO =
  'Razón por la que acude: síntoma o molestia principal, desde cuándo y cómo ha evolucionado, o el control o trámite que solicita';

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
    <div class="nota-medica-dark-inputs">
        <h1
            v-if="variant !== 'compact'"
            class="text-2xl font-bold mb-4 text-gray-900"
        >
            MOTIVO DE CONSULTA
        </h1>
        <div data-campo="motivoConsulta">
            <div class="flex items-baseline justify-between gap-3 mb-1">
                <label for="motivoConsulta" :class="[CLASE_ETIQUETA, 'whitespace-nowrap']">
                    Motivo de consulta <span class="text-red-500">*</span>
                </label>
                <button
                    type="button"
                    tabindex="-1"
                    class="shrink-0 whitespace-nowrap text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
                    :aria-expanded="verConsejos"
                    @click="verConsejos = !verConsejos"
                >
                    <i class="fas fa-lightbulb" aria-hidden="true"></i>
                    Consejos
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
                :rows="capturaRapida ? 3 : 6"
                :class="CLASE_TEXTAREA"
                :placeholder="PLACEHOLDER_MOTIVO"
                required
                data-skip-validation
            ></textarea>
        </div>
    </div>
</template>
