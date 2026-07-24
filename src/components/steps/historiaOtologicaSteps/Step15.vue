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

const medicamentosOtotoxicos = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    medicamentosOtotoxicos: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    medicamentosOtotoxicos.value = documentos.currentDocument.medicamentosOtotoxicos || 'NO';
  } else {
    medicamentosOtotoxicos.value = formDataStore.formDataHistoriaOtologica.medicamentosOtotoxicos || 'NO';
  }
  syncToStore(medicamentosOtotoxicos.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.medicamentosOtotoxicos) {
    syncToStore(medicamentosOtotoxicos.value);
  }
});

watch(medicamentosOtotoxicos, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">MEDICAMENTOS OTOTOXICOS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="medicamentosOtotoxicos"
      label="Medicamentos ototóxicos"
      question="¿Uso de medicamentos ototóxicos?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
