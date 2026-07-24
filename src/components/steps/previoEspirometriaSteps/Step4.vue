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

const exposicionLaboralPolvos = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    exposicionLaboralPolvos: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    exposicionLaboralPolvos.value = documentos.currentDocument.exposicionLaboralPolvos || 'NO';
  } else {
    exposicionLaboralPolvos.value = formDataStore.formDataPrevioEspirometria.exposicionLaboralPolvos || 'NO';
  }
  syncToStore(exposicionLaboralPolvos.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.exposicionLaboralPolvos) {
    syncToStore(exposicionLaboralPolvos.value);
  }
});

watch(exposicionLaboralPolvos, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">EXPOSICIÓN A POLVOS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Factores de riesgo respiratorio</h2>
    </template>
    <PeSiNoChips
      v-model="exposicionLaboralPolvos"
      label="Exposición a polvos"
      question="¿Se expone a polvos?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
