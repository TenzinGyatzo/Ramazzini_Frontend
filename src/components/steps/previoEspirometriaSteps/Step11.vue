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

const hemoptisis = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    hemoptisis: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    hemoptisis.value = documentos.currentDocument.hemoptisis || 'NO';
  } else {
    hemoptisis.value = formDataStore.formDataPrevioEspirometria.hemoptisis || 'NO';
  }
  syncToStore(hemoptisis.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.hemoptisis) {
    syncToStore(hemoptisis.value);
  }
});

watch(hemoptisis, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">HEMOPTISIS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Síntomas Respiratorios</h2>
    </template>
    <PeSiNoChips
      v-model="hemoptisis"
      label="Hemoptisis"
      question="¿Sufre de hemoptisis?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
