<script setup>
import { formatDateDDMMYYYY } from '@/helpers/dates';
import { useFormDataStore } from '@/stores/formDataStore';
import { useStepsStore } from '@/stores/steps';
import { computed } from 'vue';

const formData = useFormDataStore();
const steps = useStepsStore();

const goToStep = (stepNumber) => {
  steps.goToStep(stepNumber);
};

// Función para determinar si un campo debe mostrarse
const shouldShowField = (fieldName) => {
  const tipoPrueba = formData.formDataAntidoping.tipoPrueba;
  
  // Si no hay tipo de prueba definido, mostrar por defecto
  if (!tipoPrueba) {
    return true;
  }
  
  // Si es tipo 2 parámetros, solo mostrar marihuana y cocaína
  if (tipoPrueba === '2') {
    return fieldName === 'marihuana' || fieldName === 'cocaina';
  }
  
  // Si es tipo 3 parámetros, mostrar marihuana, cocaína y anfetaminas
  if (tipoPrueba === '3') {
    return fieldName === 'marihuana' || fieldName === 'cocaina' || fieldName === 'anfetaminas';
  }
  
  // Para todos los demás tipos (5, 6, 10), mostrar por defecto
  return true;
};

// Computed para determinar si mostrar anfetaminas
const showAnfetaminas = computed(() => {
  return shouldShowField('anfetaminas');
});

// Computed para determinar si mostrar metanfetaminas
const showMetanfetaminas = computed(() => {
  return shouldShowField('metanfetaminas');
});

// Computed para determinar si mostrar opiaceos
const showOpiaceos = computed(() => {
  return shouldShowField('opiaceos');
});

</script>

<template>
  <div
    class="visualizador-antidoping border-shadow w-full col-span-1 2xl:col-span-9 text-left rounded-lg p-7 2xl:p-7 transition-all duration-300 ease-in-out transform shadow-md bg-white max-w-lg mx-auto">
    <h2 class="text-lg font-medium mb-4">Información del Documento</h2>
    <table class="table-auto w-full border-collapse border border-gray-200">
      <thead>
        <tr class="bg-gray-200">
          <th class="px-2 py-1 border border-gray-300 text-left whitespace-nowrap">Campo</th>
          <th class="px-2 py-1 border border-gray-300 text-left">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(1)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Fecha Antidoping</td>
          <td class="px-2 py-1 border border-gray-300">{{ formatDateDDMMYYYY(formData.formDataAntidoping.fechaAntidoping) }}</td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Marihuana (THC)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.marihuana }}</td>
        </tr>
        <tr class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Cocaína (COC)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.cocaina }}</td>
        </tr>
        <tr v-if="showAnfetaminas" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Anfetaminas (AMP)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.anfetaminas || '' }}</td>
        </tr>
        <tr v-if="showMetanfetaminas" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Metanfetaminas (MET)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.metanfetaminas || '' }}</td>
        </tr>
        <tr v-if="showOpiaceos" class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Opiáceos (OPI)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.opiaceos || '' }}</td>
        </tr>
        <tr v-if="formData.formDataAntidoping.benzodiacepinas" 
          class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Benzodiacepinas (BZO)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.benzodiacepinas }}</td>
        </tr>
        <tr v-if="formData.formDataAntidoping.fenciclidina" 
          class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Fenciclidina (PCP)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.fenciclidina }}</td>
        </tr>
        <tr v-if="formData.formDataAntidoping.metadona" 
          class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Metadona (MTD)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.metadona }}</td>
        </tr>
        <tr v-if="formData.formDataAntidoping.barbituricos" 
          class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Barbituricos (BAR)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.barbituricos }}</td>
        </tr>
        <tr v-if="formData.formDataAntidoping.antidepresivosTriciclicos" 
          class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Antidepresivos T. (TCA)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.antidepresivosTriciclicos }}</td>
        </tr>
        <tr v-if="formData.formDataAntidoping.metilendioximetanfetamina" 
          class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Metilendioximetanfetamina</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.metilendioximetanfetamina }}</td>
        </tr>
        <tr v-if="formData.formDataAntidoping.ketamina" 
          class="odd:bg-white even:bg-gray-50 cursor-pointer" @click="goToStep(2)">
          <td class="px-2 py-1 border border-gray-300 font-medium whitespace-nowrap">Ketamina (KET)</td>
          <td class="px-2 py-1 border border-gray-300">{{ formData.formDataAntidoping.ketamina }}</td>
        </tr>
      </tbody>

    </table>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.visualizador-antidoping tbody tr.cursor-pointer,
.visualizador-antidoping thead tr.cursor-pointer {
  transition: background-color 0.15s ease;
}

.visualizador-antidoping tbody tr.cursor-pointer > td,
.visualizador-antidoping tbody tr.cursor-pointer > th,
.visualizador-antidoping thead tr.cursor-pointer > td,
.visualizador-antidoping thead tr.cursor-pointer > th {
  transition: background-color 0.15s ease;
}

.visualizador-antidoping tbody tr.cursor-pointer:hover,
.visualizador-antidoping tbody tr.cursor-pointer:hover > td,
.visualizador-antidoping tbody tr.cursor-pointer:hover > th,
.visualizador-antidoping thead tr.cursor-pointer:hover,
.visualizador-antidoping thead tr.cursor-pointer:hover > td,
.visualizador-antidoping thead tr.cursor-pointer:hover > th {
  background-color: #f0f0f0;
}
</style>

<style>
html.dark-mode .visualizador-antidoping tbody tr.cursor-pointer:hover,
html.dark-mode .visualizador-antidoping tbody tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-antidoping tbody tr.cursor-pointer:hover > th,
html.dark-mode .visualizador-antidoping thead tr.cursor-pointer:hover,
html.dark-mode .visualizador-antidoping thead tr.cursor-pointer:hover > td,
html.dark-mode .visualizador-antidoping thead tr.cursor-pointer:hover > th {
  background-color: #475569 !important;
}
</style>