<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import TextoCaptura from '@/components/steps/captura/TextoCaptura.vue';

// Punto 38, un solo diseño para los dos modos (acomodo según el modo): mismo dato, con el estilo común de los cuadros de texto
const capturaRapida = enCapturaRapida();

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

const observaciones = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.observaciones !== '') {
        observaciones.value = documentos.currentDocument.observaciones;
    }

    if (formDataNotaMedica.observaciones) {
        observaciones.value = formDataNotaMedica.observaciones;
    }
});

watch(observaciones, (newValue) => {
    formDataNotaMedica.observaciones = newValue;
});
</script>

<template>
    <div class="nota-medica-dark-inputs">
        <h2
            v-if="variant !== 'compact'"
            class="text-2xl font-bold text-gray-900 mb-4 uppercase"
        >
            Observaciones
        </h2>
        <TextoCaptura
            id="observaciones"
            v-model="observaciones"
            etiqueta="Observaciones"
            :filas="capturaRapida ? 3 : 5"
            placeholder="Información adicional relevante: indicaciones de seguimiento, incapacidad, envío a especialista o pendientes"
        />
    </div>
</template>
