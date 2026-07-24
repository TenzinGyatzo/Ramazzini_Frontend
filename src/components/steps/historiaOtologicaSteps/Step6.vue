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

const perdidaAudicion = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    perdidaAudicion: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    perdidaAudicion.value = documentos.currentDocument.perdidaAudicion || 'NO';
  } else {
    perdidaAudicion.value = formDataStore.formDataHistoriaOtologica.perdidaAudicion || 'NO';
  }
  syncToStore(perdidaAudicion.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.perdidaAudicion) {
    syncToStore(perdidaAudicion.value);
  }
});

watch(perdidaAudicion, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">PÉRDIDA DE AUDICIÓN</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">En los últimos 2 meses</h2>
    </template>
    <HoSiNoChips
      v-model="perdidaAudicion"
      label="Pérdida de audición"
      question="¿Ha tenido pérdida de audición?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
