<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

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
    <h1 class="text-2xl font-bold mb-4 text-gray-900">ANTECEDENTES</h1>

    <div class="mb-4">
      <label for="antecedentes" class="block text-lg font-normal text-gray-800 mb-3">
        Antecedentes (opcional)
      </label>
      <textarea
        id="antecedentes"
        class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-48"
        v-model="antecedentes"
        placeholder="Registrar antecedentes relevantes"
      ></textarea>
    </div>
  </div>
</template>
