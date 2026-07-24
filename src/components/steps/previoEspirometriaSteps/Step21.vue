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

const derramePleural = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    derramePleural: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    derramePleural.value = documentos.currentDocument.derramePleural || 'NO';
  } else {
    derramePleural.value = formDataStore.formDataPrevioEspirometria.derramePleural || 'NO';
  }
  syncToStore(derramePleural.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.derramePleural) {
    syncToStore(derramePleural.value);
  }
});

watch(derramePleural, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">DERRAME PLEURAL</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Relativas</h2>
    </template>
    <PeSiNoChips
      v-model="derramePleural"
      label="Derrame pleural"
      question="¿Tiene un derrame pleural?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
