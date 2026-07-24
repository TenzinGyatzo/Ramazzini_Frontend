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

const musicaFuerteAudifonos = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    musicaFuerteAudifonos: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    musicaFuerteAudifonos.value = documentos.currentDocument.musicaFuerteAudifonos || 'NO';
  } else {
    musicaFuerteAudifonos.value = formDataStore.formDataHistoriaOtologica.musicaFuerteAudifonos || 'NO';
  }
  syncToStore(musicaFuerteAudifonos.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.musicaFuerteAudifonos) {
    syncToStore(musicaFuerteAudifonos.value);
  }
});

watch(musicaFuerteAudifonos, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">MÚSICA FUERTE CON AUDÍFONOS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Exposición a Ruido</h2>
    </template>
    <HoSiNoChips
      v-model="musicaFuerteAudifonos"
      label="Música fuerte con audífonos"
      question="¿Suele escuchar música fuerte con audífonos?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
