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

const antecedentesTuberculosisInfeccionesRespiratorias = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    antecedentesTuberculosisInfeccionesRespiratorias: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    antecedentesTuberculosisInfeccionesRespiratorias.value = documentos.currentDocument.antecedentesTuberculosisInfeccionesRespiratorias || 'NO';
  } else {
    antecedentesTuberculosisInfeccionesRespiratorias.value = formDataStore.formDataPrevioEspirometria.antecedentesTuberculosisInfeccionesRespiratorias || 'NO';
  }
  syncToStore(antecedentesTuberculosisInfeccionesRespiratorias.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.antecedentesTuberculosisInfeccionesRespiratorias) {
    syncToStore(antecedentesTuberculosisInfeccionesRespiratorias.value);
  }
});

watch(antecedentesTuberculosisInfeccionesRespiratorias, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">TUBERCULOSIS O INFECCIONES RESPIRATORIAS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Factores de riesgo respiratorio</h2>
    </template>
    <PeSiNoChips
      v-model="antecedentesTuberculosisInfeccionesRespiratorias"
      label="TB / infecciones respiratorias"
      question="¿Antecedentes de tuberculosis o infecciones respiratorias?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
