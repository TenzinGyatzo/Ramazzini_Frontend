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

const zumbidoTinnitus = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    zumbidoTinnitus: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    zumbidoTinnitus.value = documentos.currentDocument.zumbidoTinnitus || 'NO';
  } else {
    zumbidoTinnitus.value = formDataStore.formDataHistoriaOtologica.zumbidoTinnitus || 'NO';
  }
  syncToStore(zumbidoTinnitus.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.zumbidoTinnitus) {
    syncToStore(zumbidoTinnitus.value);
  }
});

watch(zumbidoTinnitus, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">ZUMBIDO (TINNITUS)</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">En los últimos 2 meses</h2>
    </template>
    <HoSiNoChips
      v-model="zumbidoTinnitus"
      label="Zumbido (tinnitus)"
      question="¿Presencia de tinnitus?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
