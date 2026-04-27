<script setup>
import { watch, ref, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataAudiometria } = useFormDataStore();
const documentos = useDocumentosStore();

const recomendacionesDefault = [
  'Vigilancia audiométrica periódica',
  'Control en Programa de Conservación de la Audición',
  'Uso de equipo adecuado de protección auditiva'
];

const recomendacionesAudiometria = ref([...recomendacionesDefault]);

onMounted(() => {
  if (documentos.currentDocument && documentos.currentDocument.recomendacionesAudiometria) {
    recomendacionesAudiometria.value = Array.isArray(documentos.currentDocument.recomendacionesAudiometria)
      ? documentos.currentDocument.recomendacionesAudiometria
      : [documentos.currentDocument.recomendacionesAudiometria];
  } else if (formDataAudiometria.recomendacionesAudiometria && formDataAudiometria.recomendacionesAudiometria.length > 0) {
    recomendacionesAudiometria.value = Array.isArray(formDataAudiometria.recomendacionesAudiometria)
      ? formDataAudiometria.recomendacionesAudiometria
      : [formDataAudiometria.recomendacionesAudiometria];
  } else {
    // Si no hay datos guardados, establecer las recomendaciones por defecto
    formDataAudiometria.recomendacionesAudiometria = [...recomendacionesDefault];
  }
});

onUnmounted(() => {
  if (!formDataAudiometria.recomendacionesAudiometria || recomendacionesAudiometria.value.length === 0) {
    formDataAudiometria.recomendacionesAudiometria = [];
  }
});

watch(recomendacionesAudiometria, (newValue) => {
  formDataAudiometria.recomendacionesAudiometria = newValue;
}, { deep: true });

// Funciones para agregar o eliminar entradas
function addRecomendacion() {
  recomendacionesAudiometria.value.push('');
  // Esperar a que el DOM se actualice y luego establecer el focus
  setTimeout(() => {
    const inputs = document.querySelectorAll('input');
    const lastInput = inputs[inputs.length - 1];
    lastInput.focus();
  }, 0);
}

function removeRecomendacion(index) {
  recomendacionesAudiometria.value.splice(index, 1);
}

function limpiarRecomendaciones() {
  recomendacionesAudiometria.value = [];
}

function reestablecerRecomendacionesDefault() {
  recomendacionesAudiometria.value = [...recomendacionesDefault];
}
</script>

<template>
  <div>
    <h2 class="font-bold mb-4 text-gray-800 leading-5">Recomendaciones:</h2>
    <div class="space-y-2">
      <div v-for="(item, index) in recomendacionesAudiometria" :key="index" class="flex gap-2 items-center">
        <input
          class="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="recomendacionesAudiometria[index]"
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
    </div>
    <div class="mt-3 flex gap-2 flex-wrap">
      <button
        type="button"
        class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-base"
        @click="addRecomendacion"
      >
        Agregar recomendación
      </button>
    </div>
    <div class="flex gap-2 mt-4 w-full">
      <button
        type="button"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs"
        @click="reestablecerRecomendacionesDefault"
      >
        Reestablecer por defecto
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs"
        @click="limpiarRecomendaciones"
      >
        Limpiar todas
      </button>
    </div>
  </div>
</template>
