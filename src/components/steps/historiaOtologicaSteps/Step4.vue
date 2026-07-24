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

const mareoVertigo = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    mareoVertigo: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    mareoVertigo.value = documentos.currentDocument.mareoVertigo || 'NO';
  } else {
    mareoVertigo.value = formDataStore.formDataHistoriaOtologica.mareoVertigo || 'NO';
  }
  syncToStore(mareoVertigo.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.mareoVertigo) {
    syncToStore(mareoVertigo.value);
  }
});

watch(mareoVertigo, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">MAREO O VERTIGO</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">En los últimos 2 meses</h2>
    </template>
    <HoSiNoChips
      v-model="mareoVertigo"
      label="Mareo o vértigo"
      question="¿Presencia de mareo o vertigo?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
