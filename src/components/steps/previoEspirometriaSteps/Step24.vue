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

const aneurismaAorticoConocido = ref('NO');

function syncToStore(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    aneurismaAorticoConocido: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    aneurismaAorticoConocido.value = documentos.currentDocument.aneurismaAorticoConocido || 'NO';
  } else {
    aneurismaAorticoConocido.value = formDataStore.formDataPrevioEspirometria.aneurismaAorticoConocido || 'NO';
  }
  syncToStore(aneurismaAorticoConocido.value);
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.aneurismaAorticoConocido) {
    syncToStore(aneurismaAorticoConocido.value);
  }
});

watch(aneurismaAorticoConocido, (newValue) => {
  syncToStore(newValue);
});
</script>

<template>
  <div class="pe-sino-step">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">ANEURISMA AORTICO CONOCIDO</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Contraindicaciones Absolutas</h2>
    </template>
    <PeSiNoChips
      v-model="aneurismaAorticoConocido"
      label="Aneurisma aórtico conocido"
      question="¿Aneurisma aórtico conocido?"
      :borderless="variant === 'compact'"
    />
  </div>
</template>
