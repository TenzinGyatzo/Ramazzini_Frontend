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

const epocBronquitisCronica = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    epocBronquitisCronica: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    epocBronquitisCronica.value = documentos.currentDocument.epocBronquitisCronica || 'NO';
  } else {
    epocBronquitisCronica.value = formDataStore.formDataPrevioEspirometria.epocBronquitisCronica || 'NO';
  }
  syncToStore(epocBronquitisCronica.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.epocBronquitisCronica) {
    syncToStore(epocBronquitisCronica.value);
  }
});

watch(epocBronquitisCronica, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">EPOC O BRONQUITIS CRONICA</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Médicos</h2>
    </template>
    <PeSiNoChips
      v-model="epocBronquitisCronica"
      label="EPOC / bronquitis crónica"
      question="¿Sufre de EPOC o bronquitis crónica?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
