<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import PeSiNoChips from './PeSiNoChips.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const formDataStore = useFormDataStore();
const documentos = useDocumentosStore();

const expectoracionFrecuente = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    expectoracionFrecuente: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    expectoracionFrecuente.value = documentos.currentDocument.expectoracionFrecuente || 'NO';
  } else {
    expectoracionFrecuente.value = formDataStore.formDataPrevioEspirometria.expectoracionFrecuente || 'NO';
  }
  syncToStore(expectoracionFrecuente.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.expectoracionFrecuente) {
    syncToStore(expectoracionFrecuente.value);
  }
});

watch(expectoracionFrecuente, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">EXPECTORACIÓN FRECUENTE</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Síntomas Respiratorios</h2>
    </template>
    <PeSiNoChips
      v-model="expectoracionFrecuente"
      label="Expectoración frecuente"
      question="¿Sufre de expectoración frecuente?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
