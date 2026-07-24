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

const oidoTapadoPlenitud = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    oidoTapadoPlenitud: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    oidoTapadoPlenitud.value = documentos.currentDocument.oidoTapadoPlenitud || 'NO';
  } else {
    oidoTapadoPlenitud.value = formDataStore.formDataHistoriaOtologica.oidoTapadoPlenitud || 'NO';
  }
  syncToStore(oidoTapadoPlenitud.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.oidoTapadoPlenitud) {
    syncToStore(oidoTapadoPlenitud.value);
  }
});

watch(oidoTapadoPlenitud, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">OÍDO TAPADO / PLENITUD</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">En los últimos 2 meses</h2>
    </template>
    <HoSiNoChips
      v-model="oidoTapadoPlenitud"
      label="Oído tapado / plenitud"
      question="¿Ha tenido oído tapado o plenitud?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
