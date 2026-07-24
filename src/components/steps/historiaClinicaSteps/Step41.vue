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
const NEGADO = 'No recuerda';

const valorInicial = formDataHistoriaClinica.fechaUltimaMastografia || '';
const fechaUltimaMastografiaPregunta = ref(
  valorInicial && valorInicial !== NEGADO ? 'Si' : 'No',
);
const fechaUltimaMastografia = ref(valorInicial);
const inputEspecificar = ref(null);

onUnmounted(() => {
  if (!formDataHistoriaClinica.fechaUltimaMastografia) {
    formDataHistoriaClinica.fechaUltimaMastografia = NEGADO;
  }
});

watch(fechaUltimaMastografia, (newValue) => {
  formDataHistoriaClinica.fechaUltimaMastografia = newValue;
});

watch(fechaUltimaMastografiaPregunta, async (newValue, oldValue) => {
  if (oldValue === undefined || oldValue === newValue) return;
  if (newValue === 'No') {
    formDataHistoriaClinica.fechaUltimaMastografia = NEGADO;
  }
  if (newValue === 'Si') {
    const cur = (formDataHistoriaClinica.fechaUltimaMastografia || '').trim();
    if (!cur || cur === NEGADO) {
      formDataHistoriaClinica.fechaUltimaMastografia = '';
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
        label="ÚLTIMA MASTOGRAFÍA"
        question="¿Recuerda la fecha exacta o aproximada de la última mastografía?"
        v-model="fechaUltimaMastografiaPregunta"
        v-model:especificar="formDataHistoriaClinica.fechaUltimaMastografia"
        especificar-cuando-no="No recuerda"
        limpiar-especificar-al-si
        placeholder="Fecha exacta o aproximada"
      />
    </template>
    <template v-else>
      <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">ÚLTIMA MASTOGRAFÍA</h2>
      <div class="mb-8">
        <p class="text-lg font-medium mb-4 text-gray-800">¿Recuerda la fecha exacta o aproximada de la última mastografía?</p>
        <div class="grid grid-cols-2 gap-3">
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              fechaUltimaMastografiaPregunta === 'No' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="No" v-model="fechaUltimaMastografiaPregunta" class="sr-only" />
            <span class="text-base font-semibold">No</span>
          </label>
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              fechaUltimaMastografiaPregunta === 'Si' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="Si" v-model="fechaUltimaMastografiaPregunta" class="sr-only" />
            <span class="text-base font-semibold">Sí</span>
          </label>
        </div>
      </div>
      <div v-if="fechaUltimaMastografiaPregunta === 'Si'" class="mt-6">
        <p class="text-lg font-medium mb-3 text-gray-800">Especifique:</p>
        <input
          ref="inputEspecificar"
          type="text"
          class="w-full p-3 border-2 border-gray-300 rounded-lg"
          v-model="formDataHistoriaClinica.fechaUltimaMastografia"
          placeholder="Fecha"
          required
        >
      </div>
    </template>
  </div>
</template>
