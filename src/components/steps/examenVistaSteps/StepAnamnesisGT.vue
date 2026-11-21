<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

import TextoCaptura from '../captura/TextoCaptura.vue';

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const anamnesis = ref('');

onMounted(() => {
  // Priorizar formData (cambios locales) sobre BD: si el usuario ya modificó y regresa al step, mantener sus cambios
  const local = formDataExamenVista.anamnesis;
  const fromDb = documentos.currentDocument?.anamnesis;
  anamnesis.value = (local != null && local !== '') ? local : (fromDb || '');
});

watch(anamnesis, () => {
  formDataExamenVista.anamnesis = anamnesis.value?.trim() || undefined;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Anamnesis</h1>
    <TextoCaptura id="anamnesis" v-model="anamnesis" etiqueta="Anamnesis (opcional)" placeholder="Registrar anamnesis" :filas="3" />
  </div>
</template>
