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

const enfermedadRenal = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    enfermedadRenal: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    enfermedadRenal.value = documentos.currentDocument.enfermedadRenal || 'NO';
  } else {
    enfermedadRenal.value = formDataStore.formDataHistoriaOtologica.enfermedadRenal || 'NO';
  }
  syncToStore(enfermedadRenal.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.enfermedadRenal) {
    syncToStore(enfermedadRenal.value);
  }
});

watch(enfermedadRenal, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">ENFERMEDAD RENAL</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="enfermedadRenal"
      label="Enfermedad renal"
      question="¿Antecedentes de enfermedad renal?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
