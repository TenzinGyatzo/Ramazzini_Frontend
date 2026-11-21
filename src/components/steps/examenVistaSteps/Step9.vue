<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

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
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">DIAGNÓSTICO Y RECOMENDACIONES</h1>

    <div class="mb-4">
      <label for="diagnosticoRecomendaciones" class="block text-lg font-normal text-gray-800 mb-3">
        Diagnóstico y Recomendaciones
      </label>
      <textarea
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-64"
        v-model="diagnosticoRecomendaciones"
        placeholder="Especificar diagnóstico y recomendaciones"
      ></textarea>
    </div>
  </div>
</template>

