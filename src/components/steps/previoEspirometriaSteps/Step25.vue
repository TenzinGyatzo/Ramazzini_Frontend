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

const inestabilidadHemodinamicaGrave = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    inestabilidadHemodinamicaGrave: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    inestabilidadHemodinamicaGrave.value = documentos.currentDocument.inestabilidadHemodinamicaGrave || 'NO';
  } else {
    inestabilidadHemodinamicaGrave.value = formDataStore.formDataPrevioEspirometria.inestabilidadHemodinamicaGrave || 'NO';
  }
  syncToStore(inestabilidadHemodinamicaGrave.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.inestabilidadHemodinamicaGrave) {
    syncToStore(inestabilidadHemodinamicaGrave.value);
  }
});

watch(inestabilidadHemodinamicaGrave, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">INESTABILIDAD HEMODINAMICA GRAVE</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Absolutas</h2>
    </template>
    <PeSiNoChips
      v-model="inestabilidadHemodinamicaGrave"
      label="Inestabilidad hemodinámica grave"
      question="¿Inestabilidad hemodinámica grave?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
