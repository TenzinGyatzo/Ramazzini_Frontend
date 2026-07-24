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

const infartoAgudoAnginaInestable = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    infartoAgudoAnginaInestable: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    infartoAgudoAnginaInestable.value = documentos.currentDocument.infartoAgudoAnginaInestable || 'NO';
  } else {
    infartoAgudoAnginaInestable.value = formDataStore.formDataPrevioEspirometria.infartoAgudoAnginaInestable || 'NO';
  }
  syncToStore(infartoAgudoAnginaInestable.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.infartoAgudoAnginaInestable) {
    syncToStore(infartoAgudoAnginaInestable.value);
  }
});

watch(infartoAgudoAnginaInestable, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">INFARTO AGUDO / ANGINA INESTABLE</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Absolutas</h2>
    </template>
    <PeSiNoChips
      v-model="infartoAgudoAnginaInestable"
      label="Infarto agudo / angina inestable"
      question="¿Infarto agudo o angina inestable?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
