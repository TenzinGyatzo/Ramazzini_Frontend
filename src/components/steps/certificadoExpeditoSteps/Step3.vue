<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  SOMATOMETRIA_SIGNOS_RANGES,
  mensajeErrorSomatometriaSignosField,
} from '@/helpers/somatometriaSignosRanges';

const { formDataCertificadoExpedito } = useFormDataStore();
const documentos = useDocumentosStore();

const tensionArterialSistolica = ref(120);
const tensionArterialDiastolica = ref(80);
const categoriaTensionArterial = ref('Óptima');
const frecuenciaCardiaca = ref(80);
const categoriaFrecuenciaCardiaca = ref('Buena');
const frecuenciaRespiratoria = ref(17);
const categoriaFrecuenciaRespiratoria = ref('Normal');
const temperaturaCorporal = ref(36.5);
const categoriaTemperaturaCorporal = ref('Normal');

onMounted(() => {
  // Prioridad: formData > documentos.currentDocument > valores por defecto
  if (formDataCertificadoExpedito.tensionArterialSistolica !== undefined) {
    tensionArterialSistolica.value = formDataCertificadoExpedito.tensionArterialSistolica;
    tensionArterialDiastolica.value = formDataCertificadoExpedito.tensionArterialDiastolica;
    categoriaTensionArterial.value = formDataCertificadoExpedito.categoriaTensionArterial;
    frecuenciaCardiaca.value = formDataCertificadoExpedito.frecuenciaCardiaca;
    categoriaFrecuenciaCardiaca.value = formDataCertificadoExpedito.categoriaFrecuenciaCardiaca;
    frecuenciaRespiratoria.value = formDataCertificadoExpedito.frecuenciaRespiratoria;
    categoriaFrecuenciaRespiratoria.value = formDataCertificadoExpedito.categoriaFrecuenciaRespiratoria;
    temperaturaCorporal.value = formDataCertificadoExpedito.temperaturaCorporal;
    categoriaTemperaturaCorporal.value = formDataCertificadoExpedito.categoriaTemperaturaCorporal;
  } else if (documentos.currentDocument) {
    tensionArterialSistolica.value = documentos.currentDocument.tensionArterialSistolica;
    tensionArterialDiastolica.value = documentos.currentDocument.tensionArterialDiastolica;
    frecuenciaCardiaca.value = documentos.currentDocument.frecuenciaCardiaca;
    frecuenciaRespiratoria.value = documentos.currentDocument.frecuenciaRespiratoria;
    temperaturaCorporal.value = documentos.currentDocument.temperaturaCorporal;
  }
  // Si no hay formData ni currentDocument, se mantienen los valores por defecto
});

onUnmounted(() => {
  formDataCertificadoExpedito.tensionArterialSistolica = tensionArterialSistolica.value;
  formDataCertificadoExpedito.tensionArterialDiastolica = tensionArterialDiastolica.value;
  formDataCertificadoExpedito.frecuenciaCardiaca = frecuenciaCardiaca.value;
  formDataCertificadoExpedito.frecuenciaRespiratoria = frecuenciaRespiratoria.value;
  formDataCertificadoExpedito.temperaturaCorporal = temperaturaCorporal.value;
});

watch([tensionArterialSistolica, tensionArterialDiastolica, frecuenciaCardiaca, frecuenciaRespiratoria, temperaturaCorporal], () => {
  formDataCertificadoExpedito.tensionArterialSistolica = tensionArterialSistolica.value;
  formDataCertificadoExpedito.tensionArterialDiastolica = tensionArterialDiastolica.value;
  setCategoriaTensionArterial();
  formDataCertificadoExpedito.frecuenciaCardiaca = frecuenciaCardiaca.value;
  setCategoriaFrecuenciaCardiaca();
  formDataCertificadoExpedito.frecuenciaRespiratoria = frecuenciaRespiratoria.value;
  setCategoriaFrecuenciaRespiratoria();
  formDataCertificadoExpedito.temperaturaCorporal = temperaturaCorporal.value;
  setCategoriaTemperaturaCorporal();
});

function setCategoriaTensionArterial() {
  let sistolica = formDataCertificadoExpedito.tensionArterialSistolica;
  let diastolica = formDataCertificadoExpedito.tensionArterialDiastolica;
  let categoriaSistolica = '';
  let categoriaDiastolica = '';
  let categoria = '';

  if (sistolica <= 120) {
    categoriaSistolica = 'Óptima';
  } else if (sistolica >= 121 && sistolica <= 130) {
    categoriaSistolica = 'Normal';
  } else if (sistolica >= 131 && sistolica <= 139) {
    categoriaSistolica = 'Alta';
  } else if (sistolica >= 140 && sistolica <= 159) {
    categoriaSistolica = 'Hipertensión ligera';
  } else if (sistolica >= 160 && sistolica <= 179) {
    categoriaSistolica = 'Hipertensión moderada';
  } else {
    categoriaSistolica = 'Hipertensión severa';
  }

  if (diastolica <= 80) {
    categoriaDiastolica = 'Óptima';
  } else if (diastolica >= 81 && diastolica <= 85) {
    categoriaDiastolica = 'Normal';
  } else if (diastolica >= 86 && diastolica <= 89) {
    categoriaDiastolica = 'Alta';
  } else if (diastolica >= 90 && diastolica <= 99) {
    categoriaDiastolica = 'Hipertensión ligera';
  } else if (diastolica >= 100 && diastolica <= 109) {
    categoriaDiastolica = 'Hipertensión moderada';
  } else {
    categoriaDiastolica = 'Hipertensión severa';
  }

  if (categoriaSistolica === 'Hipertensión severa' || categoriaDiastolica === 'Hipertensión severa') {
    categoria = 'Hipertensión severa';
  } else if (categoriaSistolica === 'Hipertensión moderada' || categoriaDiastolica === 'Hipertensión moderada') {
    categoria = 'Hipertensión moderada';
  } else if (categoriaSistolica === 'Hipertensión ligera' || categoriaDiastolica === 'Hipertensión ligera') {
    categoria = 'Hipertensión ligera';
  } else if (categoriaSistolica === 'Alta' || categoriaDiastolica === 'Alta') {
    categoria = 'Alta';
  } else if (categoriaSistolica === 'Normal' || categoriaDiastolica === 'Normal') {
    categoria = 'Normal';
  } else {
    categoria = 'Óptima';
  }

  categoriaTensionArterial.value = categoria;
}

function setCategoriaFrecuenciaCardiaca() {
  let frecuencia = formDataCertificadoExpedito.frecuenciaCardiaca;
  let categoria = '';

  if (frecuencia < 60) {
    categoria = 'Excelente';
  } else if (frecuencia >= 60 && frecuencia <= 80) {
    categoria = 'Buena';
  } else if (frecuencia >= 81 && frecuencia <= 100) {
    categoria = 'Normal';
  } else if (frecuencia >= 101 && frecuencia <= 120) {
    categoria = 'Elevada';
  } else if (frecuencia >= 121 && frecuencia <= 140) {
    categoria = 'Alta';
  } else {
    categoria = 'Muy Alta';
  }

  categoriaFrecuenciaCardiaca.value = categoria;
}

function setCategoriaFrecuenciaRespiratoria() {
  let frecuencia = formDataCertificadoExpedito.frecuenciaRespiratoria;
  let categoria = '';

  if (frecuencia < 12) {
    categoria = 'Bradipnea';
  } else if (frecuencia >= 12 && frecuencia <= 20) {
    categoria = 'Normal';
  } else if (frecuencia >= 21 && frecuencia <= 24) {
    categoria = 'Taquipnea';
  } else {
    categoria = 'Hiperventilación';
  }

  categoriaFrecuenciaRespiratoria.value = categoria;
}

function setCategoriaTemperaturaCorporal() {
  let temperatura = formDataCertificadoExpedito.temperaturaCorporal;
  let categoria = '';

  if (temperatura >= 35.0 && temperatura <= 37.9) {
    categoria = 'Normal';
  } else if (temperatura >= 38.0) {
    categoria = 'Fiebre';
  } 

  categoriaTemperaturaCorporal.value = categoria;
}

// Computed para mostrar mensajes de error
const mensajeErrorTensionSistolica = computed(() =>
  mensajeErrorSomatometriaSignosField('tensionArterialSistolica', tensionArterialSistolica.value),
);

const mensajeErrorTensionDiastolica = computed(() =>
  mensajeErrorSomatometriaSignosField('tensionArterialDiastolica', tensionArterialDiastolica.value),
);

const mensajeErrorFrecuenciaCardiaca = computed(() =>
  mensajeErrorSomatometriaSignosField('frecuenciaCardiaca', frecuenciaCardiaca.value),
);

const mensajeErrorFrecuenciaRespiratoria = computed(() =>
  mensajeErrorSomatometriaSignosField('frecuenciaRespiratoria', frecuenciaRespiratoria.value),
);

const mensajeErrorTemperaturaCorporal = computed(() =>
  mensajeErrorSomatometriaSignosField('temperaturaCorporal', temperaturaCorporal.value),
);

</script>

<template>
  <div>
    <h1 class="font-bold mb-4 text-gray-800 ">Mediciones de las funciones más básicas del cuerpo</h1>
    <h2 class="mb-4">SIGNOS VITALES</h2>

    <h2>Tensión Arterial</h2>
    <div class="flex gap-4 mb-1">
      <div>
        <label for="tensionArterialSistolica">Sistólica (mmHg)</label>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="tensionArterialSistolica" :min="SOMATOMETRIA_SIGNOS_RANGES.tensionArterialSistolica.min" :max="SOMATOMETRIA_SIGNOS_RANGES.tensionArterialSistolica.max">
        <p v-if="mensajeErrorTensionSistolica" class="text-red-500 text-sm mt-1">
        {{ mensajeErrorTensionSistolica }}
        </p>
      </div>
      <div>
        <label for="tensionArterialDiastolica">Diastólica (mmHg)</label>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="tensionArterialDiastolica" :min="SOMATOMETRIA_SIGNOS_RANGES.tensionArterialDiastolica.min" :max="SOMATOMETRIA_SIGNOS_RANGES.tensionArterialDiastolica.max" />
        <p v-if="mensajeErrorTensionDiastolica" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorTensionDiastolica }}
        </p>
      </div>
    </div>
    <input type="text"
      class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-4 bg-gray-100 cursor-default"
      v-model="categoriaTensionArterial" readonly title="Se determina automáticamente según los valores de presión arterial" />

    <label for="frecuenciaCardiaca">Frecuencia Cardiáca (lpm)</label>
    <div class="flex gap-4 mb-4">
      <div>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="frecuenciaCardiaca" :min="SOMATOMETRIA_SIGNOS_RANGES.frecuenciaCardiaca.min" :max="SOMATOMETRIA_SIGNOS_RANGES.frecuenciaCardiaca.max" />
        <p v-if="mensajeErrorFrecuenciaCardiaca" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorFrecuenciaCardiaca }}
        </p>
      </div>
      <div>
        <input type="text"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
          v-model="categoriaFrecuenciaCardiaca" readonly title="Se determina automáticamente según la frecuencia cardiaca ingresada" />
      </div>
    </div>

    <label for="frecuenciaRespiratoria">Frecuencia Respiratoria (rpm)</label>
    <div class="flex gap-4 mb-4">
      <div>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="frecuenciaRespiratoria" :min="SOMATOMETRIA_SIGNOS_RANGES.frecuenciaRespiratoria.min" :max="SOMATOMETRIA_SIGNOS_RANGES.frecuenciaRespiratoria.max" />
        <p v-if="mensajeErrorFrecuenciaRespiratoria" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorFrecuenciaRespiratoria }}
        </p>
      </div>
      <div>
        <input type="text"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
          v-model="categoriaFrecuenciaRespiratoria" readonly title="Se determina automáticamente según la frecunecia respiratoria ingresada" />
      </div>
    </div>

    <label for="temperaturaCorporal">Temperatura Corporal (°C)</label>
    <div class="flex gap-4 mb-4">
      <div>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="temperaturaCorporal" :min="SOMATOMETRIA_SIGNOS_RANGES.temperaturaCorporal.min" :max="SOMATOMETRIA_SIGNOS_RANGES.temperaturaCorporal.max" step="0.1" />
        <p v-if="mensajeErrorTemperaturaCorporal" class="text-red-500 text-sm mt-1">
          {{ mensajeErrorTemperaturaCorporal }}
        </p>
      </div>
      <div>
        <input type="text"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
          v-model="categoriaTemperaturaCorporal" readonly title="Se determina automáticamente según la temperatura corporal ingresada" />
      </div>
    </div>

  </div>
</template>
