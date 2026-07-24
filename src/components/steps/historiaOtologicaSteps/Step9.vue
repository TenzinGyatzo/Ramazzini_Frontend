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

const cirugiasOido = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    cirugiasOido: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    cirugiasOido.value = documentos.currentDocument.cirugiasOido || 'NO';
  } else {
    cirugiasOido.value = formDataStore.formDataHistoriaOtologica.cirugiasOido || 'NO';
  }
  syncToStore(cirugiasOido.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.cirugiasOido) {
    syncToStore(cirugiasOido.value);
  }
});

watch(cirugiasOido, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">CIRUGÍAS OIDO</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="cirugiasOido"
      label="Cirugías de oído"
      question="¿Ha tenido cirugías de oído?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
