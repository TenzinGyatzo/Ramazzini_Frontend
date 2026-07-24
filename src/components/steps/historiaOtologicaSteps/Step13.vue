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

const diabetes = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    diabetes: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    diabetes.value = documentos.currentDocument.diabetes || 'NO';
  } else {
    diabetes.value = formDataStore.formDataHistoriaOtologica.diabetes || 'NO';
  }
  syncToStore(diabetes.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.diabetes) {
    syncToStore(diabetes.value);
  }
});

watch(diabetes, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">DIABETES</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="diabetes"
      label="Diabetes"
      question="¿Antecedentes de diabetes?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
