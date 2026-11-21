<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const testEstereopsis = ref('');
const testCampoVisual = ref('');
const coverTest = ref('');

onMounted(() => {
  if (documentos.currentDocument) {
    testEstereopsis.value = documentos.currentDocument.testEstereopsis || '';
    testCampoVisual.value = documentos.currentDocument.testCampoVisual || '';
    coverTest.value = documentos.currentDocument.coverTest || '';
  }
});


// Observa los cambios y actualiza el store
watch([testEstereopsis, testCampoVisual, coverTest], () => {
  formDataExamenVista.testEstereopsis = testEstereopsis.value || undefined;
  formDataExamenVista.testCampoVisual = testCampoVisual.value || undefined;
  formDataExamenVista.coverTest = coverTest.value || undefined;
});
</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">PRUEBAS DE FUNCIÓN OCULAR</h1>

    <!-- Test de Estereopsis -->
    <div class="mb-6">
      <label for="testEstereopsis" class="block text-lg font-normal text-gray-800 mb-3">
        Test de Estereopsis
      </label>
      <input 
        type="text"
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        v-model="testEstereopsis"
        placeholder="Resultado"
      />
    </div>

    <!-- Campos Visuales por Confrontación -->
    <div class="mb-6">
      <label for="testCampoVisual" class="block text-lg font-normal text-gray-800 mb-3">
        Campos Visuales por Confrontación
      </label>
      <input 
        type="text"
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        v-model="testCampoVisual"
        placeholder="Resultado"
      />
    </div>

    <!-- Cover Test -->
    <div class="mb-6">
      <label for="coverTest" class="block text-lg font-normal text-gray-800 mb-3">
        Cover Test
      </label>
      <input 
        type="text"
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        v-model="coverTest"
        placeholder="Resultado"
      />
    </div>
  </div>
</template>

