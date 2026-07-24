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

const supuracionOido = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    supuracionOido: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    supuracionOido.value = documentos.currentDocument.supuracionOido || 'NO';
  } else {
    supuracionOido.value = formDataStore.formDataHistoriaOtologica.supuracionOido || 'NO';
  }
  syncToStore(supuracionOido.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.supuracionOido) {
    syncToStore(supuracionOido.value);
  }
});

watch(supuracionOido, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">SUPURACIÓN OÍDO</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">En los últimos 2 meses</h2>
    </template>
    <HoSiNoChips
      v-model="supuracionOido"
      label="Supuración de oído"
      question="¿Supuración en algún oído?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
