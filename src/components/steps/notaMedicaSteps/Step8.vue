<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const recomendaciones = ref([]);

onMounted(() => {
  if (documentos.currentDocument && documentos.currentDocument.recomendaciones) {
    recomendaciones.value = Array.isArray(documentos.currentDocument.recomendaciones)
      ? documentos.currentDocument.recomendaciones
      : [documentos.currentDocument.recomendaciones];
  }

  if (formDataNotaMedica.recomendaciones) {
    recomendaciones.value = Array.isArray(formDataNotaMedica.recomendaciones)
      ? formDataNotaMedica.recomendaciones
      : [formDataNotaMedica.recomendaciones];
  }
});

onUnmounted(() => {
  if (!formDataNotaMedica.recomendaciones || recomendaciones.value.length === 0) {
    formDataNotaMedica.recomendaciones = [];
  }
});

watch(recomendaciones, (newValue) => {
  formDataNotaMedica.recomendaciones = newValue;
}, { deep: true });

// Funciones para agregar o eliminar entradas
function addRecomendacion() {
  recomendaciones.value.push('');
  // Esperar a que el DOM se actualice y luego establecer el focus
  setTimeout(() => {
    const inputs = document.querySelectorAll('input');
    const lastInput = inputs[inputs.length - 1];
    lastInput.focus();
  }, 0);
}

function removeRecomendacion(index) {
  recomendaciones.value.splice(index, 1);
}
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h2 class="font-bold mb-4 text-gray-800 leading-5">Recomendaciones:</h2>
    <div class="space-y-2">
      <div v-for="(item, index) in recomendaciones" :key="index" class="flex gap-2 items-center">
        <input
          class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="recomendaciones[index]"
          :placeholder="`Recomendación #${index + 1}`"
        />
        <button
          type="button"
          class="text-red-500 font-bold px-2"
          @click="removeRecomendacion(index)"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        class="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm"
        @click="addRecomendacion"
      >
        Agregar recomendación
      </button>
    </div>
  </div>
</template>
