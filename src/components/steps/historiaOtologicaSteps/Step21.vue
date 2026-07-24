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

const servicioMilitar = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    servicioMilitar: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    servicioMilitar.value = documentos.currentDocument.servicioMilitar || 'NO';
  } else {
    servicioMilitar.value = formDataStore.formDataHistoriaOtologica.servicioMilitar || 'NO';
  }
  syncToStore(servicioMilitar.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.servicioMilitar) {
    syncToStore(servicioMilitar.value);
  }
});

watch(servicioMilitar, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">SERVICIO MILITAR</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Exposición a Ruido</h2>
    </template>
    <HoSiNoChips
      v-model="servicioMilitar"
      label="Servicio militar"
      question="¿Ha estado en el servicio militar?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
