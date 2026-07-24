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

const neumotorax = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    neumotorax: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    neumotorax.value = documentos.currentDocument.neumotorax || 'NO';
  } else {
    neumotorax.value = formDataStore.formDataPrevioEspirometria.neumotorax || 'NO';
  }
  syncToStore(neumotorax.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.neumotorax) {
    syncToStore(neumotorax.value);
  }
});

watch(neumotorax, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">NEUMOTORAX</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Relativas</h2>
    </template>
    <PeSiNoChips
      v-model="neumotorax"
      label="Neumotórax"
      question="¿Tiene un neumotórax?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
