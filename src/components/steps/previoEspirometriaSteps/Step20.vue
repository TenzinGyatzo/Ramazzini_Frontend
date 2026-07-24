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

const embarazoComplicado = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    embarazoComplicado: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    embarazoComplicado.value = documentos.currentDocument.embarazoComplicado || 'NO';
  } else {
    embarazoComplicado.value = formDataStore.formDataPrevioEspirometria.embarazoComplicado || 'NO';
  }
  syncToStore(embarazoComplicado.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.embarazoComplicado) {
    syncToStore(embarazoComplicado.value);
  }
});

watch(embarazoComplicado, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">EMBARAZO COMPLICADO</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Relativas</h2>
    </template>
    <PeSiNoChips
      v-model="embarazoComplicado"
      label="Embarazo complicado"
      question="¿Embarazo complicado?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
