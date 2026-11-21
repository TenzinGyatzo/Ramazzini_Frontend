<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import ListaCaptura from '@/components/steps/captura/ListaCaptura.vue';

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

watch(recomendaciones, (newValue) => {
  formDataNotaMedica.recomendaciones = newValue;
}, { deep: true });

// Funciones para agregar o eliminar entradas
function addRecomendacion() {
  // El cursor lo pone ListaCaptura en el renglón nuevo de su lista
  recomendaciones.value.push('');
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
    <ListaCaptura
      id="recomendaciones"
      v-model="recomendaciones"
      etiqueta="Recomendaciones"
      nombre-renglon="Recomendación"
      texto-agregar="Agregar recomendación"
      @agregar="addRecomendacion"
      @quitar="removeRecomendacion"
    />
  </div>
</template>
