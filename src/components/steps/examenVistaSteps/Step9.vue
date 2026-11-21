<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

import TextoCaptura from '../captura/TextoCaptura.vue';

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const diagnosticoRecomendaciones = ref('');

onMounted(() => {
  if (documentos.currentDocument) {
    diagnosticoRecomendaciones.value = documentos.currentDocument.diagnosticoRecomendaciones || '';
  }
});

// Observa los cambios y actualiza el store
watch(diagnosticoRecomendaciones, () => {
  formDataExamenVista.diagnosticoRecomendaciones = diagnosticoRecomendaciones.value || undefined;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Diagnóstico y recomendaciones</h1>
    <TextoCaptura
      id="diagnosticoRecomendaciones"
      v-model="diagnosticoRecomendaciones"
      etiqueta="Diagnóstico y recomendaciones"
      placeholder="Especificar diagnóstico y recomendaciones"
      :filas="5"
    />
  </div>
</template>
