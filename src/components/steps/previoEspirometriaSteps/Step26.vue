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

const hipertensionIntracraneal = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    hipertensionIntracraneal: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    hipertensionIntracraneal.value = documentos.currentDocument.hipertensionIntracraneal || 'NO';
  } else {
    hipertensionIntracraneal.value = formDataStore.formDataPrevioEspirometria.hipertensionIntracraneal || 'NO';
  }
  syncToStore(hipertensionIntracraneal.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.hipertensionIntracraneal) {
    syncToStore(hipertensionIntracraneal.value);
  }
});

watch(hipertensionIntracraneal, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">HIPERTENSION INTRACRANEAL</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Absolutas</h2>
    </template>
    <PeSiNoChips
      v-model="hipertensionIntracraneal"
      label="Hipertensión intracraneal"
      question="¿Hipertensión intracraneal?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
