<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import TextoCaptura from '@/components/steps/captura/TextoCaptura.vue';

// Punto 38, un solo diseño para los dos modos (acomodo según el modo): mismo dato, con el estilo común de los cuadros de texto
const capturaRapida = enCapturaRapida();
const CONSEJOS_EXPLORACION = [
  'Describa hallazgos normales y anormales.',
  'Sea objetivo y específico en las observaciones.',
];

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
        <TextoCaptura
            id="exploracionFisica"
            v-model="exploracionFisica"
            etiqueta="Exploración física"
            :filas="capturaRapida ? 4 : 6"
            :consejos="CONSEJOS_EXPLORACION"
            placeholder="Estado general del paciente y hallazgos relevantes observados"
        />
    </div>
</template>
