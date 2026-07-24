<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import HoSiNoChips from './HoSiNoChips.vue';

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

const alergias = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    alergias: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    alergias.value = documentos.currentDocument.alergias || 'NO';
  } else {
    alergias.value = formDataStore.formDataHistoriaOtologica.alergias || 'NO';
  }
  syncToStore(alergias.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.alergias) {
    syncToStore(alergias.value);
  }
});

watch(alergias, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">ALERGIAS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Otros</h2>
    </template>
    <HoSiNoChips
      v-model="alergias"
      label="Alergias"
      question="¿Tiene alergias conocidas?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
