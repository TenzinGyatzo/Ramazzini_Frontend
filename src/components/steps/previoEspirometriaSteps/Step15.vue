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

const fibrosisPulmonar = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    fibrosisPulmonar: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    fibrosisPulmonar.value = documentos.currentDocument.fibrosisPulmonar || 'NO';
  } else {
    fibrosisPulmonar.value = formDataStore.formDataPrevioEspirometria.fibrosisPulmonar || 'NO';
  }
  syncToStore(fibrosisPulmonar.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.fibrosisPulmonar) {
    syncToStore(fibrosisPulmonar.value);
  }
});

watch(fibrosisPulmonar, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">FIBROSIS PULMONAR</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Médicos</h2>
    </template>
    <PeSiNoChips
      v-model="fibrosisPulmonar"
      label="Fibrosis pulmonar"
      question="¿Sufre de fibrosis pulmonar?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
