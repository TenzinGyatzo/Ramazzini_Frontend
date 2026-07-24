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
const NEGADO = 'Negada';

const valorInicial = formDataHistoriaClinica.vidaSexualActiva || '';
const vidaSexualActivaPregunta = ref(
  valorInicial && valorInicial !== NEGADO ? 'Si' : 'No',
);
const vidaSexualActiva = ref(valorInicial);
const inputEspecificar = ref(null);

onUnmounted(() => {
  if (!formDataHistoriaClinica.vidaSexualActiva) {
    formDataHistoriaClinica.vidaSexualActiva = NEGADO;
  }
});

watch(vidaSexualActiva, (newValue) => {
  formDataHistoriaClinica.vidaSexualActiva = newValue;
});

watch(vidaSexualActivaPregunta, async (newValue, oldValue) => {
  if (oldValue === undefined || oldValue === newValue) return;
  if (newValue === 'No') {
    formDataHistoriaClinica.vidaSexualActiva = NEGADO;
  }
  if (newValue === 'Si') {
    const cur = (formDataHistoriaClinica.vidaSexualActiva || '').trim();
    if (!cur || cur === NEGADO) {
      formDataHistoriaClinica.vidaSexualActiva = '';
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
        label="VIDA SEXUAL ACTIVA"
        question="¿Ha iniciado vida sexual? Si sí, indique edad de inicio."
        v-model="vidaSexualActivaPregunta"
        v-model:especificar="formDataHistoriaClinica.vidaSexualActiva"
        especificar-cuando-no="Negada"
        limpiar-especificar-al-si
        placeholder="Edad de inicio"
      />
    </template>
    <template v-else>
      <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">VIDA SEXUAL ACTIVA</h2>
      <div class="mb-8">
        <p class="text-lg font-medium mb-4 text-gray-800">¿La trabajadora ha iniciado vida sexual?</p>
        <div class="grid grid-cols-2 gap-3">
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              vidaSexualActivaPregunta === 'No' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="No" v-model="vidaSexualActivaPregunta" class="sr-only" />
            <span class="text-base font-semibold">No</span>
          </label>
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer',
              vidaSexualActivaPregunta === 'Si' ? 'border-emerald-600 bg-emerald-50 shadow-md' : 'border-gray-300 bg-white'
            ]"
          >
            <input type="radio" value="Si" v-model="vidaSexualActivaPregunta" class="sr-only" />
            <span class="text-base font-semibold">Sí</span>
          </label>
        </div>
      </div>
      <div v-if="vidaSexualActivaPregunta === 'Si'" class="mt-6">
        <p class="text-lg font-medium mb-3 text-gray-800">En caso afirmativo, ¿a qué edad comenzó su vida sexual activa?</p>
        <input
          ref="inputEspecificar"
          type="text"
          class="w-full p-3 border-2 border-gray-300 rounded-lg"
          v-model="formDataHistoriaClinica.vidaSexualActiva"
          placeholder="Edad"
          required
        >
      </div>
    </template>
  </div>
</template>
