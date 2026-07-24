<script setup>
import { watch, ref, onMounted, onUnmounted, nextTick, toRefs } from 'vue';
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

const otrosSintomasPregunta = ref('NO');
const otrosSintomas = ref('');
const textareaHallazgos = ref(null);

function syncPregunta(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    otrosSintomasPregunta: value,
  };
}

function syncTexto(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    otrosSintomas: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    otrosSintomasPregunta.value =
      documentos.currentDocument.otrosSintomasPregunta || 'NO';
    otrosSintomas.value = documentos.currentDocument.otrosSintomas || '';
  } else {
    otrosSintomasPregunta.value =
      formDataStore.formDataPrevioEspirometria.otrosSintomasPregunta || 'NO';
    otrosSintomas.value =
      formDataStore.formDataPrevioEspirometria.otrosSintomas || '';
  }
  syncPregunta(otrosSintomasPregunta.value);
  syncTexto(
    otrosSintomasPregunta.value === 'NO' ? 'NO' : otrosSintomas.value || '',
  );
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.otrosSintomasPregunta) {
    syncPregunta(otrosSintomasPregunta.value);
  }
  if (!formDataStore.formDataPrevioEspirometria.otrosSintomas) {
    syncTexto(otrosSintomasPregunta.value === 'NO' ? 'NO' : otrosSintomas.value);
  }
});

watch(otrosSintomasPregunta, async (newValue) => {
  syncPregunta(newValue);
  if (newValue === 'NO') {
    syncTexto('NO');
  } else {
    syncTexto(otrosSintomas.value || '');
    await nextTick();
    textareaHallazgos.value?.focus();
  }
});

watch(otrosSintomas, (newValue) => {
  if (otrosSintomasPregunta.value === 'SI') {
    syncTexto(newValue);
  }
});
</script>

<template>
  <div class="pe-step12">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">OTROS SINTOMAS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Síntomas Respiratorios</h2>
    </template>
    <PeSiNoChips
      v-model="otrosSintomasPregunta"
      label="Otros síntomas"
      question="¿Sufre de otros síntomas?"
      borderless
    />
    <div v-if="otrosSintomasPregunta === 'SI'" class="mt-2">
      <p class="text-sm font-semibold text-gray-800 mb-1.5">Especifique</p>
      <textarea
        ref="textareaHallazgos"
        v-model="otrosSintomas"
        class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-h-[80px] resize-y"
        placeholder="Describa los síntomas..."
        required
      />
    </div>
  </div>
</template>
