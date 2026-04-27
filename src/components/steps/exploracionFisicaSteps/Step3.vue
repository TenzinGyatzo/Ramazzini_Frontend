<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();

const tensionArterialSistolica = ref(120);
const tensionArterialDiastolica = ref(80);
const categoriaTensionArterial = ref('Óptima');
const frecuenciaCardiaca = ref(80);
const categoriaFrecuenciaCardiaca = ref('Buena');
const frecuenciaRespiratoria = ref(17);
const categoriaFrecuenciaRespiratoria = ref('Normal');
const saturacionOxigeno = ref(97);
const categoriaSaturacionOxigeno = ref('Normal');

onMounted(() => {
  // Prioridad: formData > documentos.currentDocument > valores por defecto
  if (formDataExploracionFisica.tensionArterialSistolica !== undefined) {
    tensionArterialSistolica.value = formDataExploracionFisica.tensionArterialSistolica;
    tensionArterialDiastolica.value = formDataExploracionFisica.tensionArterialDiastolica;
    categoriaTensionArterial.value = formDataExploracionFisica.categoriaTensionArterial;
    frecuenciaCardiaca.value = formDataExploracionFisica.frecuenciaCardiaca;
    categoriaFrecuenciaCardiaca.value = formDataExploracionFisica.categoriaFrecuenciaCardiaca;
    frecuenciaRespiratoria.value = formDataExploracionFisica.frecuenciaRespiratoria;
    categoriaFrecuenciaRespiratoria.value = formDataExploracionFisica.categoriaFrecuenciaRespiratoria;
    saturacionOxigeno.value = formDataExploracionFisica.saturacionOxigeno;
    categoriaSaturacionOxigeno.value = formDataExploracionFisica.categoriaSaturacionOxigeno;
  } else if (documentos.currentDocument) {
    tensionArterialSistolica.value = documentos.currentDocument.tensionArterialSistolica;
    tensionArterialDiastolica.value = documentos.currentDocument.tensionArterialDiastolica;
    categoriaTensionArterial.value = documentos.currentDocument.categoriaTensionArterial;
    frecuenciaCardiaca.value = documentos.currentDocument.frecuenciaCardiaca;
    categoriaFrecuenciaCardiaca.value = documentos.currentDocument.categoriaFrecuenciaCardiaca;
    frecuenciaRespiratoria.value = documentos.currentDocument.frecuenciaRespiratoria;
    categoriaFrecuenciaRespiratoria.value = documentos.currentDocument.categoriaFrecuenciaRespiratoria;
    saturacionOxigeno.value = documentos.currentDocument.saturacionOxigeno;
    categoriaSaturacionOxigeno.value = documentos.currentDocument.categoriaSaturacionOxigeno;
  }
  // Si no hay formData ni currentDocument, se mantienen los valores por defecto
});

onUnmounted(() => {
  formDataExploracionFisica.tensionArterialSistolica = tensionArterialSistolica.value;
  formDataExploracionFisica.tensionArterialDiastolica = tensionArterialDiastolica.value;
  formDataExploracionFisica.categoriaTensionArterial = categoriaTensionArterial.value;
  formDataExploracionFisica.frecuenciaCardiaca = frecuenciaCardiaca.value;
  formDataExploracionFisica.categoriaFrecuenciaCardiaca = categoriaFrecuenciaCardiaca.value;
  formDataExploracionFisica.frecuenciaRespiratoria = frecuenciaRespiratoria.value;
  formDataExploracionFisica.categoriaFrecuenciaRespiratoria = categoriaFrecuenciaRespiratoria.value;
  formDataExploracionFisica.saturacionOxigeno = saturacionOxigeno.value;
  formDataExploracionFisica.categoriaSaturacionOxigeno = categoriaSaturacionOxigeno.value;
});

watch([tensionArterialSistolica, tensionArterialDiastolica, frecuenciaCardiaca, frecuenciaRespiratoria, saturacionOxigeno], () => {
  formDataExploracionFisica.tensionArterialSistolica = tensionArterialSistolica.value;
  formDataExploracionFisica.tensionArterialDiastolica = tensionArterialDiastolica.value;
  setCategoriaTensionArterial();
  formDataExploracionFisica.frecuenciaCardiaca = frecuenciaCardiaca.value;
  setCategoriaFrecuenciaCardiaca();
  formDataExploracionFisica.frecuenciaRespiratoria = frecuenciaRespiratoria.value;
  setCategoriaFrecuenciaRespiratoria();
  formDataExploracionFisica.saturacionOxigeno = saturacionOxigeno.value;
  setCategoriaSaturacionOxigeno();
});

function setCategoriaTensionArterial() {
  let sistolica = formDataExploracionFisica.tensionArterialSistolica;
  let diastolica = formDataExploracionFisica.tensionArterialDiastolica;
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
    categoriaSistolica = 'Hipertensión grado 1';
  } else if (sistolica >= 160 && sistolica <= 179) {
    categoriaSistolica = 'Hipertensión grado 2';
  } else {
    categoriaSistolica = 'Hipertensión grado 3';
  }

  if (diastolica <= 80) {
    categoriaDiastolica = 'Óptima';
  } else if (diastolica >= 81 && diastolica <= 85) {
    categoriaDiastolica = 'Normal';
  } else if (diastolica >= 86 && diastolica <= 89) {
    categoriaDiastolica = 'Alta';
  } else if (diastolica >= 90 && diastolica <= 99) {
    categoriaDiastolica = 'Hipertensión grado 1';
  } else if (diastolica >= 100 && diastolica <= 109) {
    categoriaDiastolica = 'Hipertensión grado 2';
  } else {
    categoriaDiastolica = 'Hipertensión grado 3';
  }

  if (categoriaSistolica === 'Hipertensión grado 3' || categoriaDiastolica === 'Hipertensión grado 3') {
    categoria = 'Hipertensión grado 3';
  } else if (categoriaSistolica === 'Hipertensión grado 2' || categoriaDiastolica === 'Hipertensión grado 2') {
    categoria = 'Hipertensión grado 2';
  } else if (categoriaSistolica === 'Hipertensión grado 1' || categoriaDiastolica === 'Hipertensión grado 1') {
    categoria = 'Hipertensión grado 1';
  } else if (categoriaSistolica === 'Alta' || categoriaDiastolica === 'Alta') {
    categoria = 'Alta';
  } else if (categoriaSistolica === 'Normal' || categoriaDiastolica === 'Normal') {
    categoria = 'Normal';
  } else {
    categoria = 'Óptima';
  }

  categoriaTensionArterial.value = categoria;
  formDataExploracionFisica.categoriaTensionArterial = categoria;
}

function setCategoriaFrecuenciaCardiaca() {
  let frecuencia = formDataExploracionFisica.frecuenciaCardiaca;
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
  formDataExploracionFisica.categoriaFrecuenciaCardiaca = categoria;
}

function setCategoriaFrecuenciaRespiratoria() {
  let frecuencia = formDataExploracionFisica.frecuenciaRespiratoria;
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
  formDataExploracionFisica.categoriaFrecuenciaRespiratoria = categoria;
}

function setCategoriaSaturacionOxigeno() {
  let saturacion = formDataExploracionFisica.saturacionOxigeno;
  let categoria = '';

  if (saturacion >= 95 && saturacion <= 100) {
    categoria = 'Normal';
  } else if (saturacion >= 91 && saturacion <= 94) {
    categoria = 'Aceptable';
  } else if (saturacion >= 85 && saturacion <= 90) {
    categoria = 'Moderadamente baja';
  } else if (saturacion >= 81 && saturacion <= 84) {
    categoria = 'Hipoxemia leve';
  } else if (saturacion <= 80) {
    categoria = 'Hipoxemia grave';
  }

  categoriaSaturacionOxigeno.value = categoria;
  formDataExploracionFisica.categoriaSaturacionOxigeno = categoria;
}

// Computed para mostrar mensajes de error
const mensajeErrorTensionSistolica = computed(() => {
  return tensionArterialSistolica.value < 60 
    ? 'Debe ser mínimo 60' 
    : tensionArterialSistolica.value > 300 
      ? 'Debe ser máximo 300' 
      : '';
});

const mensajeErrorTensionDiastolica = computed(() => {
  return tensionArterialDiastolica.value < 40 
    ? 'Debe ser mínimo 40' 
    : tensionArterialDiastolica.value > 200 
      ? 'Debe ser máximo 200' 
      : '';
});

const mensajeErrorFrecuenciaCardiaca = computed(() => {
  return frecuenciaCardiaca.value < 40 
    ? 'Debe ser mínimo 40' 
    : frecuenciaCardiaca.value > 150 
      ? 'Debe ser máximo 150' 
      : '';
});

const mensajeErrorFrecuenciaRespiratoria = computed(() => {
  return frecuenciaRespiratoria.value < 12 
    ? 'Debe ser mínimo 12' 
    : frecuenciaRespiratoria.value > 45 
      ? 'Debe ser máximo 45' 
      : '';
});

const mensajeErrorSaturacionOxigeno = computed(() => {
  return saturacionOxigeno.value < 80 
    ? 'Debe ser mínimo 80' 
    : saturacionOxigeno.value > 100 
      ? 'Debe ser máximo 100' 
      : '';
});

</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">SIGNOS VITALES</h1>

    <!-- Tensión Arterial -->
    <div class="mb-6">
      <h3 class="text-base font-semibold text-gray-800 mb-3">Tensión Arterial</h3>
      <div class="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label for="tensionArterialSistolica" class="block text-sm font-medium text-gray-700 mb-2">
            Sistólica (mmHg)
          </label>
          <input 
            type="number"
            id="tensionArterialSistolica"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            v-model="tensionArterialSistolica" 
            min="60" 
            max="300"
            placeholder="60-300"
          >
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorTensionSistolica" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorTensionSistolica }}
            </p>
          </transition>
        </div>
        <div>
          <label for="tensionArterialDiastolica" class="block text-sm font-medium text-gray-700 mb-2">
            Diastólica (mmHg)
          </label>
          <input 
            type="number"
            id="tensionArterialDiastolica"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            v-model="tensionArterialDiastolica" 
            min="40" 
            max="200"
            placeholder="40-200"
          />
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorTensionDiastolica" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorTensionDiastolica }}
            </p>
          </transition>
        </div>
      </div>
      <div class="relative">
        <input 
          type="text"
          :class="[
            'w-full p-3 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
            categoriaTensionArterial === 'Óptima' ? 'bg-emerald-50 text-emerald-800' : '',
            categoriaTensionArterial === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
            categoriaTensionArterial === 'Alta' ? 'bg-yellow-50 text-yellow-800' : '',
            categoriaTensionArterial === 'Hipertensión grado 1' ? 'bg-red-50 text-red-900' : '',
            categoriaTensionArterial === 'Hipertensión grado 2' ? 'bg-red-100 text-red-900' : '',
            categoriaTensionArterial === 'Hipertensión grado 3' ? 'bg-red-200 text-red-950' : ''
          ]"
          v-model="categoriaTensionArterial" 
          readonly 
          title="Se determina automáticamente según los valores de presión arterial"
        />
        <div 
          v-if="categoriaTensionArterial === 'Óptima'" 
          class="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Frecuencia Cardíaca -->
    <div class="mb-6">
      <label for="frecuenciaCardiaca" class="block text-base font-medium text-gray-800 mb-2">
        Frecuencia Cardíaca (lpm)
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <input 
            type="number"
            id="frecuenciaCardiaca"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            v-model="frecuenciaCardiaca" 
            min="40" 
            max="150"
            placeholder="40-150"
          />
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorFrecuenciaCardiaca" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorFrecuenciaCardiaca }}
            </p>
          </transition>
        </div>
        <div class="relative">
          <input 
            type="text"
            :class="[
              'w-full p-3 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
              categoriaFrecuenciaCardiaca === 'Excelente' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaFrecuenciaCardiaca === 'Buena' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaFrecuenciaCardiaca === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaFrecuenciaCardiaca === 'Elevada' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaFrecuenciaCardiaca === 'Alta' ? 'bg-red-50 text-red-900' : '',
              categoriaFrecuenciaCardiaca === 'Muy Alta' ? 'bg-red-200 text-red-950' : ''
            ]"
            v-model="categoriaFrecuenciaCardiaca" 
            readonly 
            title="Se determina automáticamente según la frecuencia cardiaca ingresada"
          />
          <div 
            v-if="categoriaFrecuenciaCardiaca === 'Excelente' || categoriaFrecuenciaCardiaca === 'Buena'" 
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Frecuencia Respiratoria -->
    <div class="mb-6">
      <label for="frecuenciaRespiratoria" class="block text-base font-medium text-gray-800 mb-2">
        Frecuencia Respiratoria (rpm)
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <input 
            type="number"
            id="frecuenciaRespiratoria"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            v-model="frecuenciaRespiratoria" 
            min="12" 
            max="45"
            placeholder="12-45"
          />
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorFrecuenciaRespiratoria" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorFrecuenciaRespiratoria }}
            </p>
          </transition>
        </div>
        <div class="relative">
          <input 
            type="text"
            :class="[
              'w-full p-3 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
              categoriaFrecuenciaRespiratoria === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaFrecuenciaRespiratoria === 'Bradipnea' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaFrecuenciaRespiratoria === 'Taquipnea' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaFrecuenciaRespiratoria === 'Hiperventilación' ? 'bg-red-100 text-red-900' : ''
            ]"
            v-model="categoriaFrecuenciaRespiratoria" 
            readonly 
            title="Se determina automáticamente según la frecuencia respiratoria ingresada"
          />
          <div 
            v-if="categoriaFrecuenciaRespiratoria === 'Normal'" 
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Saturación de Oxígeno -->
    <div class="mb-4">
      <label for="saturacionOxigeno" class="block text-base font-medium text-gray-800 mb-2">
        Saturación de Oxígeno (%)
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <input 
            type="number"
            id="saturacionOxigeno"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            v-model="saturacionOxigeno" 
            min="80" 
            max="100"
            placeholder="80-100"
          />
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorSaturacionOxigeno" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorSaturacionOxigeno }}
            </p>
          </transition>
        </div>
        <div class="relative">
          <input 
            type="text"
            :class="[
              'w-full p-3 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
              categoriaSaturacionOxigeno === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaSaturacionOxigeno === 'Aceptable' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaSaturacionOxigeno === 'Moderadamente baja' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaSaturacionOxigeno === 'Hipoxemia leve' ? 'bg-red-50 text-red-900' : '',
              categoriaSaturacionOxigeno === 'Hipoxemia grave' ? 'bg-red-100 text-red-950' : ''
            ]"
            v-model="categoriaSaturacionOxigeno" 
            readonly 
            title="Se determina automáticamente según la saturación de oxígeno ingresada"
          />
          <div 
            v-if="categoriaSaturacionOxigeno === 'Normal'" 
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
