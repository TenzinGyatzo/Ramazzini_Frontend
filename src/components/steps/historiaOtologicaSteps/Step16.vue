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

const trabajoAmbientesRuidosos = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    trabajoAmbientesRuidosos: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    trabajoAmbientesRuidosos.value = documentos.currentDocument.trabajoAmbientesRuidosos || 'NO';
  } else {
    trabajoAmbientesRuidosos.value = formDataStore.formDataHistoriaOtologica.trabajoAmbientesRuidosos || 'NO';
  }
  syncToStore(trabajoAmbientesRuidosos.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.trabajoAmbientesRuidosos) {
    syncToStore(trabajoAmbientesRuidosos.value);
  }
});

watch(trabajoAmbientesRuidosos, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">TRABAJO EN AMBIENTES RUIDOSOS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Exposición a Ruido</h2>
    </template>
    <HoSiNoChips
      v-model="trabajoAmbientesRuidosos"
      label="Trabajo en ambientes ruidosos"
      question="¿Ha trabajado en ambientes ruidosos?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
