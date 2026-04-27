<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataReceta } = useFormDataStore();
const documentos = useDocumentosStore();

const tratamiento = ref([]);

onMounted(() => {
  if (documentos.currentDocument && documentos.currentDocument.tratamiento) {
    tratamiento.value = Array.isArray(documentos.currentDocument.tratamiento)
      ? documentos.currentDocument.tratamiento
      : [documentos.currentDocument.tratamiento];
  }

  if (formDataReceta.tratamiento) {
    tratamiento.value = Array.isArray(formDataReceta.tratamiento)
      ? formDataReceta.tratamiento
      : [formDataReceta.tratamiento];
  }
});

onUnmounted(() => {
  if (!formDataReceta.tratamiento || tratamiento.value.length === 0) {
    formDataReceta.tratamiento = [];
  }
});

watch(tratamiento, (newValue) => {
  formDataReceta.tratamiento = newValue;
}, { deep: true });

// Funciones para agregar o eliminar entradas
function addTratamiento() {
  tratamiento.value.push('');
  // Esperar a que el DOM se actualice y luego establecer el focus
  setTimeout(() => {
    const inputs = document.querySelectorAll('input');
    const lastInput = inputs[inputs.length - 1];
    lastInput.focus();
  }, 0);
}

function removeTratamiento(index) {
  tratamiento.value.splice(index, 1);
}
</script>

<template>
  <div class="dark-mode-input-surface">
    <h2 class="font-bold mb-4 text-gray-800 leading-5">Tratamiento:</h2>
    <div class="space-y-2">
      <div v-for="(item, index) in tratamiento" :key="index" class="flex gap-2 items-center">
        <input
          class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="tratamiento[index]"
          :placeholder="`Tratamiento #${index + 1}`"
        />
        <button
          type="button"
          class="text-red-500 font-bold px-2"
          @click="removeTratamiento(index)"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        class="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm"
        @click="addTratamiento"
      >
        Agregar tratamiento
      </button>
    </div>
  </div>
</template>
