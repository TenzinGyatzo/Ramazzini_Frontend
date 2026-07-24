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

const valorInicial = formDataHistoriaClinica.fechaUltimaRegla || '';
const recuerdaFechaUltimaRegla = ref(
  valorInicial && valorInicial !== NEGADO ? 'Si' : 'No',
);
const fechaUltimaRegla = ref(valorInicial);
const inputEspecificar = ref(null);

onUnmounted(() => {
  if (!formDataHistoriaClinica.fechaUltimaRegla) {
    formDataHistoriaClinica.fechaUltimaRegla = NEGADO;
  }
});

watch(fechaUltimaRegla, (newValue) => {
  formDataHistoriaClinica.fechaUltimaRegla = newValue;
});

watch(recuerdaFechaUltimaRegla, async (newValue, oldValue) => {
  if (oldValue === undefined || oldValue === newValue) return;
  if (newValue === 'No') {
    formDataHistoriaClinica.fechaUltimaRegla = NEGADO;
  }
  if (newValue === 'Si') {
    const cur = (formDataHistoriaClinica.fechaUltimaRegla || '').trim();
    if (!cur || cur === NEGADO) {
      formDataHistoriaClinica.fechaUltimaRegla = '';
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
        label="FECHA DE ÚLTIMA MENSTRUACIÓN"
        question="¿Recuerda la fecha del primer día de su última menstruación?"
        v-model="recuerdaFechaUltimaRegla"
        v-model:especificar="formDataHistoriaClinica.fechaUltimaRegla"
        especificar-cuando-no="No recuerda"
        limpiar-especificar-al-si
        placeholder="Ej: Fecha de primer día de última menstruación"
      />
    </template>
    <template v-else>
      <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">FECHA DE ÚLTIMA MENSTRUACIÓN</h2>
      <div class="mb-8">
        <p class="text-lg font-medium mb-4 text-gray-800">¿La trabajadora recuerda la fecha del primer día de su última menstruación?</p>
        <div class="grid grid-cols-2 gap-3">
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              recuerdaFechaUltimaRegla === 'No'
                ? 'border-emerald-600 bg-emerald-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
            ]"
          >
            <input type="radio" value="No" v-model="recuerdaFechaUltimaRegla" class="sr-only" />
            <span :class="['text-base font-semibold', recuerdaFechaUltimaRegla === 'No' ? 'text-emerald-700' : 'text-gray-700']">No</span>
          </label>
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              recuerdaFechaUltimaRegla === 'Si'
                ? 'border-emerald-600 bg-emerald-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
            ]"
          >
            <input type="radio" value="Si" v-model="recuerdaFechaUltimaRegla" class="sr-only" />
            <span :class="['text-base font-semibold', recuerdaFechaUltimaRegla === 'Si' ? 'text-emerald-700' : 'text-gray-700']">Sí</span>
          </label>
        </div>
      </div>
      <div v-if="recuerdaFechaUltimaRegla === 'Si'" class="mt-6">
        <p class="text-lg font-medium mb-3 text-gray-800">Especifique:</p>
        <input
          ref="inputEspecificar"
          type="text"
          class="w-full p-3 border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          v-model="formDataHistoriaClinica.fechaUltimaRegla"
          placeholder="Ej: Fecha de primer día de última menstruación"
          required
        >
      </div>
    </template>
  </div>
</template>
