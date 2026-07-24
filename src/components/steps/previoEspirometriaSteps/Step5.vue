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

const exposicionVaporesGasesIrritantes = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    exposicionVaporesGasesIrritantes: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    exposicionVaporesGasesIrritantes.value = documentos.currentDocument.exposicionVaporesGasesIrritantes || 'NO';
  } else {
    exposicionVaporesGasesIrritantes.value = formDataStore.formDataPrevioEspirometria.exposicionVaporesGasesIrritantes || 'NO';
  }
  syncToStore(exposicionVaporesGasesIrritantes.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.exposicionVaporesGasesIrritantes) {
    syncToStore(exposicionVaporesGasesIrritantes.value);
  }
});

watch(exposicionVaporesGasesIrritantes, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">EXPOSICIÓN A VAPORES Y GASES IRRITANTES</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Factores de riesgo respiratorio</h2>
    </template>
    <PeSiNoChips
      v-model="exposicionVaporesGasesIrritantes"
      label="Vapores y gases irritantes"
      question="¿Se expone a vapores y gases irritantes?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
