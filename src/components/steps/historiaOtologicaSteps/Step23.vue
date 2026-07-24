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

const resfriadoDiaPrueba = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    resfriadoDiaPrueba: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    resfriadoDiaPrueba.value = documentos.currentDocument.resfriadoDiaPrueba || 'NO';
  } else {
    resfriadoDiaPrueba.value = formDataStore.formDataHistoriaOtologica.resfriadoDiaPrueba || 'NO';
  }
  syncToStore(resfriadoDiaPrueba.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.resfriadoDiaPrueba) {
    syncToStore(resfriadoDiaPrueba.value);
  }
});

watch(resfriadoDiaPrueba, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">RESFRIADO DÍA PRUEBA</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Otros</h2>
    </template>
    <HoSiNoChips
      v-model="resfriadoDiaPrueba"
      label="Resfriado el día de la prueba"
      question="¿Está resfriado el día de la prueba?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
