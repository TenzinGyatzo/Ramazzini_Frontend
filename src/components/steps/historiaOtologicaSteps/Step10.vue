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

const traumatismoCranealBarotrauma = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    traumatismoCranealBarotrauma: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    traumatismoCranealBarotrauma.value = documentos.currentDocument.traumatismoCranealBarotrauma || 'NO';
  } else {
    traumatismoCranealBarotrauma.value = formDataStore.formDataHistoriaOtologica.traumatismoCranealBarotrauma || 'NO';
  }
  syncToStore(traumatismoCranealBarotrauma.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.traumatismoCranealBarotrauma) {
    syncToStore(traumatismoCranealBarotrauma.value);
  }
});

watch(traumatismoCranealBarotrauma, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">TRAUMATISMO CRANEAL</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="traumatismoCranealBarotrauma"
      label="Traumatismo craneal / barotrauma"
      question="¿Antecedentes de traumatismo craneal o barotrauma?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
