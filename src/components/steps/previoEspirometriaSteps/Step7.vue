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

const tosCronica = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    tosCronica: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    tosCronica.value = documentos.currentDocument.tosCronica || 'NO';
  } else {
    tosCronica.value = formDataStore.formDataPrevioEspirometria.tosCronica || 'NO';
  }
  syncToStore(tosCronica.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.tosCronica) {
    syncToStore(tosCronica.value);
  }
});

watch(tosCronica, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">TOS CRÓNICA</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Síntomas Respiratorios</h2>
    </template>
    <PeSiNoChips
      v-model="tosCronica"
      label="Tos crónica"
      question="¿Sufre de tos crónica?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
