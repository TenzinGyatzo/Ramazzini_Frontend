<script setup>
import { watch, ref, onMounted, onUnmounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import OpcionChipsRow from './OpcionChipsRow.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataHistoriaClinica } = useFormDataStore();
const dolorMenstrual = ref('Eumenorrea');

const opcionesDolor = [
  { value: 'Eumenorrea', label: 'Eumenorrea', hint: '' },
  { value: 'Dismenorrea', label: 'Dismenorrea', hint: '' },
];

onMounted(() => {
  if (formDataHistoriaClinica.dolorMenstrual) {
    dolorMenstrual.value = formDataHistoriaClinica.dolorMenstrual;
  }
});

onUnmounted(() => {
  if (!formDataHistoriaClinica.dolorMenstrual) {
    formDataHistoriaClinica.dolorMenstrual = dolorMenstrual.value;
  }
});

watch(dolorMenstrual, (newValue) => {
  formDataHistoriaClinica.dolorMenstrual = newValue;
});
</script>

<template>
  <div>
    <template v-if="variant === 'compact'">
      <OpcionChipsRow
        label="DOLOR DURANTE LA MENSTRUACIÓN"
        question="¿Cómo clasifica el nivel de dolor menstrual?"
        v-model="dolorMenstrual"
        :options="opcionesDolor"
      />
    </template>
    <template v-else>
      <h1 class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
      <h2 class="text-lg font-semibold mb-4 text-gray-700">DOLOR DURANTE LA MENSTRUACIÓN</h2>
      <div class="mb-8">
        <p class="text-lg font-medium mb-4 text-gray-800">De acuerdo a la descripción de la trabajadora, ¿Cómo clasifica el nivel de dolor durante su período menstrual?</p>
        <div class="grid grid-cols-2 gap-3">
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              dolorMenstrual === 'Eumenorrea'
                ? 'border-emerald-600 bg-emerald-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
            ]"
          >
            <input type="radio" value="Eumenorrea" v-model="dolorMenstrual" class="sr-only" />
            <span :class="['text-base font-semibold', dolorMenstrual === 'Eumenorrea' ? 'text-emerald-700' : 'text-gray-700']">Eumenorrea</span>
            <span :class="['text-xs text-center mt-1', dolorMenstrual === 'Eumenorrea' ? 'text-emerald-600' : 'text-gray-500']">(Sin dolor)</span>
          </label>
          <label
            :class="[
              'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
              dolorMenstrual === 'Dismenorrea'
                ? 'border-emerald-600 bg-emerald-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
            ]"
          >
            <input type="radio" value="Dismenorrea" v-model="dolorMenstrual" class="sr-only" />
            <span :class="['text-base font-semibold', dolorMenstrual === 'Dismenorrea' ? 'text-emerald-700' : 'text-gray-700']">Dismenorrea</span>
            <span :class="['text-xs text-center mt-1', dolorMenstrual === 'Dismenorrea' ? 'text-emerald-600' : 'text-gray-500']">(Con dolor)</span>
          </label>
        </div>
      </div>
    </template>
  </div>
</template>
