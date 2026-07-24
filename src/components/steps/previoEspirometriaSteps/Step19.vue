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

const infeccionRespiratoriaActiva = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    infeccionRespiratoriaActiva: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    infeccionRespiratoriaActiva.value = documentos.currentDocument.infeccionRespiratoriaActiva || 'NO';
  } else {
    infeccionRespiratoriaActiva.value = formDataStore.formDataPrevioEspirometria.infeccionRespiratoriaActiva || 'NO';
  }
  syncToStore(infeccionRespiratoriaActiva.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.infeccionRespiratoriaActiva) {
    syncToStore(infeccionRespiratoriaActiva.value);
  }
});

watch(infeccionRespiratoriaActiva, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">INFECCIÓN RESPIRATORIA ACTIVA</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Relativas</h2>
    </template>
    <PeSiNoChips
      v-model="infeccionRespiratoriaActiva"
      label="Infección respiratoria activa"
      question="¿Tiene alguna infección respiratoria activa?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
