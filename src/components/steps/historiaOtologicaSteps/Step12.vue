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

const meningitisInfeccionGraveInfancia = ref('NO');

function syncToStore(value) {
  formDataStore.formDataHistoriaOtologica = {
    ...formDataStore.formDataHistoriaOtologica,
    meningitisInfeccionGraveInfancia: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    meningitisInfeccionGraveInfancia.value = documentos.currentDocument.meningitisInfeccionGraveInfancia || 'NO';
  } else {
    meningitisInfeccionGraveInfancia.value = formDataStore.formDataHistoriaOtologica.meningitisInfeccionGraveInfancia || 'NO';
  }
  syncToStore(meningitisInfeccionGraveInfancia.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataHistoriaOtologica.meningitisInfeccionGraveInfancia) {
    syncToStore(meningitisInfeccionGraveInfancia.value);
  }
});

watch(meningitisInfeccionGraveInfancia, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="ho-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">MENINGITIS U OTRAS INFECCIONES GRAVES EN INFANCIA</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Personales</h2>
    </template>
    <HoSiNoChips
      v-model="meningitisInfeccionGraveInfancia"
      label="Meningitis / infecciones graves"
      question="¿Ha tenido meningitis u otras infecciones graves en infancia?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
