<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import InsumosSuministrados from '@/components/inventario/InsumosSuministrados.vue';
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

const tratamiento = ref([]);

onMounted(() => {
  if (documentos.currentDocument && documentos.currentDocument.tratamiento) {
    tratamiento.value = Array.isArray(documentos.currentDocument.tratamiento)
      ? documentos.currentDocument.tratamiento
      : [documentos.currentDocument.tratamiento];
  }

  if (formDataNotaMedica.tratamiento) {
    tratamiento.value = Array.isArray(formDataNotaMedica.tratamiento)
      ? formDataNotaMedica.tratamiento
      : [formDataNotaMedica.tratamiento];
  }
});

watch(tratamiento, (newValue) => {
  formDataNotaMedica.tratamiento = newValue;
}, { deep: true });

// Funciones para agregar o eliminar entradas
function addTratamiento() {
  // El cursor lo pone ListaCaptura en el renglón nuevo de su lista
  tratamiento.value.push('');
}

function removeTratamiento(index) {
  tratamiento.value.splice(index, 1);
}
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Tratamiento
    </h2>
    <ListaCaptura
      id="tratamiento"
      v-model="tratamiento"
      etiqueta="Tratamiento"
      nombre-renglon="Tratamiento"
      texto-agregar="Agregar tratamiento"
      @agregar="addTratamiento"
      @quitar="removeTratamiento"
    />
    <InsumosSuministrados />
  </div>
</template>
