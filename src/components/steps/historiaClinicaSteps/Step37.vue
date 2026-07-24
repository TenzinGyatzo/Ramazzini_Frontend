<script setup>
import { watch, ref, onUnmounted, nextTick, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import AntecedenteSiNoChips from './AntecedenteSiNoChips.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataHistoriaClinica } = useFormDataStore();
const NEGADO = 'Negado';

const valorInicial = formDataHistoriaClinica.embarazoActual || '';
const embarazoActualPregunta = ref(
  valorInicial && valorInicial !== NEGADO ? 'Si' : 'No',
);
const embarazoActual = ref(valorInicial);
const inputEspecificar = ref(null);

onUnmounted(() => {
  if (!formDataHistoriaClinica.embarazoActual) {
    formDataHistoriaClinica.embarazoActual = NEGADO;
  }
});

watch(embarazoActual, (newValue) => {
  formDataHistoriaClinica.embarazoActual = newValue;
});

watch(embarazoActualPregunta, async (newValue, oldValue) => {
  if (oldValue === undefined || oldValue === newValue) return;
  if (newValue === 'No') {
    formDataHistoriaClinica.embarazoActual = NEGADO;
  }
  if (newValue === 'Si') {
    const cur = (formDataHistoriaClinica.embarazoActual || '').trim();
    if (!cur || cur === NEGADO) {
      formDataHistoriaClinica.embarazoActual = '';
    }
    await nextTick();
    inputEspecificar.value?.focus();
  }
});
</script>

<template>
  <div>
    <template v-if="variant === 'compact'">
      <AntecedenteSiNoChips
        label="EMBARAZO ACTUAL"
        question="¿La trabajadora está actualmente embarazada?"
        v-model="embarazoActualPregunta"
        v-model:especificar="formDataHistoriaClinica.embarazoActual"
        especificar-cuando-no="Negado"
        limpiar-especificar-al-si
        placeholder="Especifique semanas / detalle"
      />
    </template>
    <template v-else>
      <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">EMBARAZO ACTUAL</h2>
      <div class="mb-8">
        <p class="text-lg font-medium mb-4 text-gray-800">¿La trabajadora está actualmente embarazada?</p>
        <div class="grid grid-cols-2 gap-3">
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              embarazoActualPregunta === 'No' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="No" v-model="embarazoActualPregunta" class="sr-only" />
            <span class="text-base font-semibold">No</span>
          </label>
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              embarazoActualPregunta === 'Si' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="Si" v-model="embarazoActualPregunta" class="sr-only" />
            <span class="text-base font-semibold">Sí</span>
          </label>
        </div>
      </div>
      <div v-if="embarazoActualPregunta === 'Si'" class="mt-6">
        <p class="text-lg font-medium mb-3 text-gray-800">Especifique:</p>
        <input
          ref="inputEspecificar"
          type="text"
          class="w-full p-3 border-2 border-gray-300 rounded-lg"
          v-model="formDataHistoriaClinica.embarazoActual"
          placeholder="Especifique"
          required
        >
      </div>
    </template>
  </div>
</template>
