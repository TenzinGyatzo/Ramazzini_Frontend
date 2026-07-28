<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

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
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Recomendaciones
    </h2>
    <p
      v-else
      class="text-sm font-semibold text-gray-800 mb-2"
    >
      Recomendaciones
    </p>
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
