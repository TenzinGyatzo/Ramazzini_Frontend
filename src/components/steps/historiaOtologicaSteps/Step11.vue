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

const usoAudifonos = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    usoAudifonos: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    usoAudifonos.value = documentos.currentDocument.usoAudifonos || 'NO';
  } else {
    usoAudifonos.value = formDataStore.formDataHistoriaOtologica.usoAudifonos || 'NO';
  }
  syncToStore(usoAudifonos.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.usoAudifonos) {
    syncToStore(usoAudifonos.value);
  }
});

watch(usoAudifonos, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">USO DE AUDÍFONOS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="usoAudifonos"
      label="Uso de audífonos"
      question="¿Ha utilizado audífonos?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
