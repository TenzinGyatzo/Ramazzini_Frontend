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

const sibilancias = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    sibilancias: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    sibilancias.value = documentos.currentDocument.sibilancias || 'NO';
  } else {
    sibilancias.value = formDataStore.formDataPrevioEspirometria.sibilancias || 'NO';
  }
  syncToStore(sibilancias.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.sibilancias) {
    syncToStore(sibilancias.value);
  }
});

watch(sibilancias, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">SIBILANCIAS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Síntomas Respiratorios</h2>
    </template>
    <PeSiNoChips
      v-model="sibilancias"
      label="Sibilancias"
      question="¿Sufre de sibilancias?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
