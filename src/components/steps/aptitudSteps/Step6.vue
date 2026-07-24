<script setup>
import { onMounted, toRefs, computed } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { useFormDataStore } from '@/stores/formDataStore';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);
const isCompact = computed(() => variant.value === 'compact');

const labelClass = computed(() =>
  isCompact.value
    ? 'block text-sm font-medium text-gray-800 mb-1'
    : 'block text-base font-medium leading-5 text-gray-800 mb-1',
);
const inputClass = computed(() =>
  isCompact.value
    ? 'w-full p-2 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
    : 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
);
const fieldClass = computed(() => (isCompact.value ? 'mb-2' : 'mb-6'));

const { formDataAptitud } = useFormDataStore();
const today = format(new Date(), 'yyyy-MM-dd');

const evaluacionSugerencias = [
  'Tipo de Sangre',
  'Audiometría',
  'Espirometría',
  'Estudios de laboratorio',
  'Rx simple de tórax',
  'Rx columna lumbar',
  'Rx rodillas',
  'Electrocardiograma',
];

onMounted(() => {
  const nombre = (formDataAptitud.evaluacionAdicional5 || '').trim();
  const resultados = (formDataAptitud.resultadosEvaluacionAdicional5 || '').trim();
  const fechaRaw = formDataAptitud.fechaEvaluacionAdicional5;

  if (fechaRaw) {
    formDataAptitud.fechaEvaluacionAdicional5 = formatDateYYYYMMDD(fechaRaw);
  } else if (!isCompact.value) {
    // V1 fullscreen: al visitar el paso, fecha = hoy (comportamiento legacy).
    formDataAptitud.fechaEvaluacionAdicional5 = today;
  } else if (nombre || resultados) {
    // Compact/V2: solo si el slot ya tiene datos; slots vacíos no revelados no se contaminan.
    formDataAptitud.fechaEvaluacionAdicional5 = today;
  }
});
</script>

<template>
  <div>
    <h1
      v-if="!isCompact"
      class="text-2xl font-bold mb-4 text-gray-900"
    >EVALUACIÓN ADICIONAL 5</h1>
    <h2
      v-else
      class="text-sm font-semibold mb-2 text-gray-800"
    >EVALUACIÓN ADICIONAL 5</h2>

    <div :class="isCompact ? 'space-y-2' : 'space-y-6'">
      <div :class="fieldClass">
        <label :class="labelClass">
          Nombre de evaluación, prueba o estudio
        </label>
        <input
          type="text"
          name="nombreEvaluacion5"
          data-skip-validation
          :class="inputClass"
          v-model="formDataAptitud.evaluacionAdicional5"
          :list="'evaluaciones-sugerencias-5'"
          placeholder="Selecciona o escribe"
        />
        <datalist :id="'evaluaciones-sugerencias-5'">
          <option v-for="sugerencia in evaluacionSugerencias" :key="sugerencia" :value="sugerencia" />
        </datalist>
      </div>

      <div :class="fieldClass">
        <label :class="labelClass">
          Fecha de resultados
        </label>
        <input
          type="date"
          name="fechaEvaluacion5"
          :class="inputClass"
          v-model="formDataAptitud.fechaEvaluacionAdicional5"
        />
      </div>

      <div :class="isCompact ? 'mb-1' : 'mb-6'">
        <label :class="labelClass">
          Resumen de resultados y/o alteraciones encontradas
        </label>
        <input
          type="text"
          name="resultadosEvaluacion5"
          data-skip-validation
          :class="inputClass"
          v-model="formDataAptitud.resultadosEvaluacionAdicional5"
          placeholder="Describe el resultado"
        />
      </div>
    </div>
  </div>
</template>
