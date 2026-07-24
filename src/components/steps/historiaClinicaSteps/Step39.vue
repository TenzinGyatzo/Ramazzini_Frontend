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
const NEGADO = 'Ninguno';

const valorInicial = formDataHistoriaClinica.planificacionFamiliar || '';
const planificacionFamiliarPregunta = ref(
  valorInicial && valorInicial !== NEGADO ? 'Si' : 'No',
);
const planificacionFamiliar = ref(valorInicial);
const inputEspecificar = ref(null);

onUnmounted(() => {
  if (!formDataHistoriaClinica.planificacionFamiliar) {
    formDataHistoriaClinica.planificacionFamiliar = NEGADO;
  }
});

watch(planificacionFamiliar, (newValue) => {
  formDataHistoriaClinica.planificacionFamiliar = newValue;
});

watch(planificacionFamiliarPregunta, async (newValue, oldValue) => {
  if (oldValue === undefined || oldValue === newValue) return;
  if (newValue === 'No') {
    formDataHistoriaClinica.planificacionFamiliar = NEGADO;
  }
  if (newValue === 'Si') {
    const cur = (formDataHistoriaClinica.planificacionFamiliar || '').trim();
    if (!cur || cur === NEGADO) {
      formDataHistoriaClinica.planificacionFamiliar = '';
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
        label="PLANIFICACIÓN FAMILIAR"
        question="¿Ha utilizado métodos de planificación familiar?"
        v-model="planificacionFamiliarPregunta"
        v-model:especificar="formDataHistoriaClinica.planificacionFamiliar"
        especificar-cuando-no="Ninguno"
        limpiar-especificar-al-si
        placeholder="Método utilizado"
      />
    </template>
    <template v-else>
      <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">PLANIFICACIÓN FAMILIAR</h2>
      <div class="mb-8">
        <p class="text-lg font-medium mb-4 text-gray-800">¿Ha utilizado la trabajadora métodos específicos para controlar el número y espaciamiento de sus hijos?</p>
        <div class="grid grid-cols-2 gap-3">
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              planificacionFamiliarPregunta === 'No' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="No" v-model="planificacionFamiliarPregunta" class="sr-only" />
            <span class="text-base font-semibold">No</span>
          </label>
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              planificacionFamiliarPregunta === 'Si' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="Si" v-model="planificacionFamiliarPregunta" class="sr-only" />
            <span class="text-base font-semibold">Sí</span>
          </label>
        </div>
      </div>
      <div v-if="planificacionFamiliarPregunta === 'Si'" class="mt-6">
        <p class="text-lg font-medium mb-3 text-gray-800">Especifique:</p>
        <input
          ref="inputEspecificar"
          type="text"
          class="w-full p-3 border-2 border-gray-300 rounded-lg"
          v-model="formDataHistoriaClinica.planificacionFamiliar"
          placeholder="Especifique"
          required
        >
      </div>
    </template>
  </div>
</template>
