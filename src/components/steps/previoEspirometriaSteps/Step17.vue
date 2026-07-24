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

const medicamentosActuales = ref('NO');
const medicamentosActualesEspecificar = ref('');
const textareaHallazgos = ref(null);

function syncMed(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    medicamentosActuales: value,
  };
}

function syncEspec(value) {
  formDataStore.formDataPrevioEspirometria = {
    ...formDataStore.formDataPrevioEspirometria,
    medicamentosActualesEspecificar: value,
  };
}

onMounted(() => {
  if (documentos.currentDocument) {
    medicamentosActuales.value =
      documentos.currentDocument.medicamentosActuales || 'NO';
    medicamentosActualesEspecificar.value =
      documentos.currentDocument.medicamentosActualesEspecificar || '';
  } else {
    medicamentosActuales.value =
      formDataStore.formDataPrevioEspirometria.medicamentosActuales || 'NO';
    medicamentosActualesEspecificar.value =
      formDataStore.formDataPrevioEspirometria.medicamentosActualesEspecificar ||
      '';
  }
  syncMed(medicamentosActuales.value);
  syncEspec(
    medicamentosActuales.value === 'NO'
      ? 'NINGUNO'
      : medicamentosActualesEspecificar.value || '',
  );
});

onUnmounted(() => {
  if (!formDataStore.formDataPrevioEspirometria.medicamentosActuales) {
    syncMed(medicamentosActuales.value);
  }
  if (!formDataStore.formDataPrevioEspirometria.medicamentosActualesEspecificar) {
    syncEspec(
      medicamentosActuales.value === 'NO'
        ? 'NINGUNO'
        : medicamentosActualesEspecificar.value,
    );
  }
});

watch(medicamentosActuales, async (newValue) => {
  syncMed(newValue);
  if (newValue === 'NO') {
    syncEspec('NINGUNO');
  } else {
    syncEspec(medicamentosActualesEspecificar.value || '');
    await nextTick();
    textareaHallazgos.value?.focus();
  }
});

watch(medicamentosActualesEspecificar, (newValue) => {
  if (medicamentosActuales.value === 'SI') {
    syncEspec(newValue);
  }
});
</script>

<template>
  <div class="pe-step17">
    <template v-if="variant !== 'compact'">
      <h1 class="text-2xl font-bold mb-4 text-gray-900">MEDICAMENTOS ACTUALES</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">Antecedentes Médicos</h2>
    </template>
    <PeSiNoChips
      v-model="medicamentosActuales"
      label="Medicamentos actuales"
      question="¿Toma medicamentos actualmente?"
      borderless
    />
    <div v-if="medicamentosActuales === 'SI'" class="mt-2">
      <p class="text-sm font-semibold text-gray-800 mb-1.5">Especifique</p>
      <textarea
        ref="textareaHallazgos"
        v-model="medicamentosActualesEspecificar"
        class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 min-h-[80px] resize-y"
        placeholder="Liste los medicamentos..."
        required
      />
    </div>
  </div>
</template>
