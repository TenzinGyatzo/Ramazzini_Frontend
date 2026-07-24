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

const armasFuegoPasatiemposRuidosos = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    armasFuegoPasatiemposRuidosos: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    armasFuegoPasatiemposRuidosos.value = documentos.currentDocument.armasFuegoPasatiemposRuidosos || 'NO';
  } else {
    armasFuegoPasatiemposRuidosos.value = formDataStore.formDataHistoriaOtologica.armasFuegoPasatiemposRuidosos || 'NO';
  }
  syncToStore(armasFuegoPasatiemposRuidosos.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.armasFuegoPasatiemposRuidosos) {
    syncToStore(armasFuegoPasatiemposRuidosos.value);
  }
});

watch(armasFuegoPasatiemposRuidosos, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">ARMAS DE FUEGO O PASATIEMPOS RUIDOSOS</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Exposición a Ruido</h2>
    </template>
    <HoSiNoChips
      v-model="armasFuegoPasatiemposRuidosos"
      label="Armas de fuego / pasatiempos ruidosos"
      question="¿Pasatiempos con armas de fuego o actividades ruidosas?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
