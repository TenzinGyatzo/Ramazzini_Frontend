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

const antecedentes = ref('');

onMounted(() => {
    if (documentos.currentDocument && documentos.currentDocument.antecedentes !== '') {
        antecedentes.value = documentos.currentDocument.antecedentes;
    }

    if (formDataNotaMedica.antecedentes) {
        antecedentes.value = formDataNotaMedica.antecedentes;
    }
});

watch(antecedentes, (newValue) => {
    formDataNotaMedica.antecedentes = newValue;
});
</script>

<template>
    <div class="nota-medica-dark-inputs">
        <h1
            v-if="variant !== 'compact'"
            class="text-2xl font-bold mb-4 text-gray-900"
        >
            ANTECEDENTES
        </h1>
        <TextoCaptura
            id="antecedentes"
            v-model="antecedentes"
            etiqueta="Antecedentes"
            :filas="capturaRapida ? 4 : 6"
            placeholder="Enfermedades previas y cirugías, alergias y medicamentos, hospitalizaciones y traumas"
        />
    </div>
</template>
