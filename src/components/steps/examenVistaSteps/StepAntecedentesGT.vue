<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

import TextoCaptura from '../captura/TextoCaptura.vue';

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const antecedentes = ref('');

onMounted(() => {
  // Priorizar formData (cambios locales) sobre BD: si el usuario ya modificó y regresa al step, mantener sus cambios
  const local = formDataExamenVista.antecedentes;
  const fromDb = documentos.currentDocument?.antecedentes;
  antecedentes.value = (local != null && local !== '') ? local : (fromDb || '');
});

watch(antecedentes, () => {
  formDataExamenVista.antecedentes = antecedentes.value?.trim() || undefined;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes</h1>
    <TextoCaptura id="antecedentes" v-model="antecedentes" etiqueta="Antecedentes (opcional)" placeholder="Registrar antecedentes relevantes" :filas="3" />
  </div>
</template>
