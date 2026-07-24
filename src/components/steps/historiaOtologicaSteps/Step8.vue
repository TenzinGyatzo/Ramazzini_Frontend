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

const otitisFrecuentesInfancia = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    otitisFrecuentesInfancia: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    otitisFrecuentesInfancia.value = documentos.currentDocument.otitisFrecuentesInfancia || 'NO';
  } else {
    otitisFrecuentesInfancia.value = formDataStore.formDataHistoriaOtologica.otitisFrecuentesInfancia || 'NO';
  }
  syncToStore(otitisFrecuentesInfancia.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.otitisFrecuentesInfancia) {
    syncToStore(otitisFrecuentesInfancia.value);
  }
});

watch(otitisFrecuentesInfancia, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">OTITIS FRECUENTES EN INFANCIA</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="otitisFrecuentesInfancia"
      label="Otitis frecuentes en infancia"
      question="¿Antecedentes de otitis frecuentes en infancia?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
