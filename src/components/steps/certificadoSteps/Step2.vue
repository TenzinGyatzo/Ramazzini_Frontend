<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import SiNoChips from './SiNoChips.vue';

const TEXTO_SIN_IMPEDIMENTO =
  'no presenta impedimento físico para desarrollar el puesto que actualmente solicita';

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

const impedimentosFisicosPregunta = ref('No');
const impedimentosFisicos = ref('');

function syncToStore(texto) {
  formDataStore.formDataCertificado = {
    ...formDataStore.formDataCertificado,
    impedimentosFisicos: texto,
  };
}

// Punto 52: el «Sí» sin descripción se conserva (antes, al cerrarse el paso, se escribía «no
// presenta impedimento…» y se guardaba lo contrario de lo contestado); al guardar se pide la
// descripción. Se lee del formulario (lo capturado en esta sesión) o del documento guardado.
onMounted(() => {
  const actual = formDataStore.formDataCertificado?.impedimentosFisicos ?? documentos.currentDocument?.impedimentosFisicos;
  if (actual === undefined || actual === null || actual === TEXTO_SIN_IMPEDIMENTO) {
    impedimentosFisicosPregunta.value = 'No';
    syncToStore(TEXTO_SIN_IMPEDIMENTO);
  } else {
    impedimentosFisicosPregunta.value = 'Si';
    impedimentosFisicos.value = actual;
    syncToStore(actual);
  }
});

onUnmounted(() => {
  if (impedimentosFisicosPregunta.value === 'No') syncToStore(TEXTO_SIN_IMPEDIMENTO);
});

watch(impedimentosFisicos, (newValue) => {
  if (impedimentosFisicosPregunta.value === 'Si') {
    syncToStore(newValue);
  }
});

watch(impedimentosFisicosPregunta, (newValue) => {
  if (newValue === 'No') {
    syncToStore(TEXTO_SIN_IMPEDIMENTO);
  }
  if (newValue === 'Si') {
    syncToStore(impedimentosFisicos.value || '');
  }
});
</script>

<template>
  <div class="certificado-step2">
    <h1
      v-if="variant !== 'compact'"
      class="font-bold mb-4 text-gray-800 leading-5"
    >
      Certificado de Salud
    </h1>

    <SiNoChips
      v-model="impedimentosFisicosPregunta"
      label="Impedimentos físicos"
      question="¿Hay impedimentos físicos que se deban mencionar en el certificado?"
      borderless
    />

    <div data-campo="impedimentosFisicos" v-if="impedimentosFisicosPregunta === 'Si'" class="mt-2">
      <p class="text-sm font-semibold text-gray-800 mb-1.5">Resumen</p>
      <textarea
        class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-h-[96px] resize-y"
        v-model="impedimentosFisicos"
        placeholder="Describa los impedimentos físicos..."
        required
      />
    </div>
  </div>
</template>
