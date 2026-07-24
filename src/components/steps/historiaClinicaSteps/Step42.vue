<script setup>
import { watch, ref, onMounted, toRefs, computed } from 'vue';
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
    ? 'text-sm font-medium mb-1 text-gray-800'
    : 'font-medium mb-1 text-gray-800',
);
const inputClass = computed(() =>
  isCompact.value
    ? 'w-full p-2 text-sm border border-gray-300 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
    : 'w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
);
const fieldClass = computed(() => (isCompact.value ? 'mb-2' : 'mb-4'));

const { formDataHistoriaClinica } = useFormDataStore();

const empresaAnterior1 = ref('');
const puestoAnterior1 = ref('');
const antiguedadAnterior1 = ref('');
const agentesSeleccionados = ref([]);
const agentesOpciones = [
  'Ergonómicos',
  'Ruido',
  'Polvos',
  'Químicos',
  'Psicosociales',
  'Temperaturas elevadas',
  'Temperaturas abatidas',
  'Vibraciones',
  'Biológicos Infecciosos',
];

onMounted(() => {
  if (formDataHistoriaClinica.agentesAnterior1) {
    agentesSeleccionados.value = formDataHistoriaClinica.agentesAnterior1.split(', ');
  }
});

watch(empresaAnterior1, (newValue) => {
  formDataHistoriaClinica.empresaAnterior1 = newValue;
});
watch(puestoAnterior1, (newValue) => {
  formDataHistoriaClinica.puestoAnterior1 = newValue;
});
watch(antiguedadAnterior1, (newValue) => {
  formDataHistoriaClinica.antiguedadAnterior1 = newValue;
});

watch(agentesSeleccionados, (newValue) => {
  formDataHistoriaClinica.agentesAnterior1 = newValue.join(', ');
});
</script>

<template>
  <div>
    <h1 v-if="!isCompact" class="font-bold mb-4 text-gray-800 leading-5">Antecedentes Laborales</h1>
    <h2 :class="isCompact ? 'text-sm font-semibold mb-2 text-gray-800' : 'mb-2'">TRABAJO ANTERIOR 1</h2>

    <div :class="fieldClass">
      <p :class="labelClass">Empresa:</p>
      <input
        type="text"
        :class="inputClass"
        v-model="formDataHistoriaClinica.empresaAnterior1"
        placeholder="Ingrese el nombre de la empresa"
      >
    </div>
    <div :class="fieldClass">
      <p :class="labelClass">Puesto:</p>
      <input
        type="text"
        :class="inputClass"
        v-model="formDataHistoriaClinica.puestoAnterior1"
        placeholder="Ingrese el puesto que ocupó"
      >
    </div>
    <div :class="fieldClass">
      <p :class="labelClass">Antigüedad:</p>
      <input
        type="text"
        :class="inputClass"
        v-model="formDataHistoriaClinica.antiguedadAnterior1"
        placeholder="Duración en años y meses"
      >
    </div>

    <div :class="isCompact ? 'mt-2' : 'mt-4'">
      <p :class="isCompact ? 'text-sm font-medium mb-1.5 text-gray-800' : 'font-medium mb-2 text-gray-800'">Agentes:</p>
      <div :class="['grid grid-cols-1 gap-1', isCompact ? 'text-sm' : 'font-light']">
        <label
          v-for="agente in agentesOpciones"
          :key="agente"
          :class="[
            'flex items-center gap-2 px-2.5 py-1 rounded-md border cursor-pointer transition-colors duration-150',
            agentesSeleccionados.includes(agente)
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
              : 'border-transparent text-gray-700 hover:bg-emerald-50/70 hover:border-emerald-200',
          ]"
        >
          <input
            type="checkbox"
            :value="agente"
            v-model="agentesSeleccionados"
            class="form-checkbox accent-emerald-600 shrink-0"
          />
          <span class="font-medium">{{ agente }}</span>
        </label>
      </div>
    </div>
  </div>
</template>
