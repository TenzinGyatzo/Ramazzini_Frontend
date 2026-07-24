<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import PeSiNoChips from './PeSiNoChips.vue';

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

const cirugiaReciente = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    cirugiaReciente: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    cirugiaReciente.value = documentos.currentDocument.cirugiaReciente || 'NO';
  } else {
    cirugiaReciente.value = formDataStore.formDataPrevioEspirometria.cirugiaReciente || 'NO';
  }
  syncToStore(cirugiaReciente.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.cirugiaReciente) {
    syncToStore(cirugiaReciente.value);
  }
});

watch(cirugiaReciente, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">CIRUGÍA RECENTE</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Relativas</h2>
    </template>
    <PeSiNoChips
      v-model="cirugiaReciente"
      label="Cirugía reciente"
      question="¿Ha tenido alguna cirugía reciente?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
