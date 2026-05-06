<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();

function sv() {
  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.signosVitales) fd.signosVitales = {};
  return fd.signosVitales;
}

function pushSignosVitales() {
  const s = sv();
  s.tensionArterialSistolica = tensionArterialSistolica.value;
  s.tensionArterialDiastolica = tensionArterialDiastolica.value;
  s.categoriaTensionArterial = categoriaTensionArterial.value;
  s.frecuenciaCardiaca = frecuenciaCardiaca.value;
  s.categoriaFrecuenciaCardiaca = categoriaFrecuenciaCardiaca.value;
}

const tensionArterialSistolica = ref(120);
const tensionArterialDiastolica = ref(80);
const categoriaTensionArterial = ref('Óptima');
const frecuenciaCardiaca = ref(80);
const categoriaFrecuenciaCardiaca = ref('Buena');

function hydrate(v) {
  if (!v) return;
  if (v.tensionArterialSistolica != null) tensionArterialSistolica.value = v.tensionArterialSistolica;
  if (v.tensionArterialDiastolica != null) tensionArterialDiastolica.value = v.tensionArterialDiastolica;
  if (v.categoriaTensionArterial) categoriaTensionArterial.value = v.categoriaTensionArterial;
  if (v.frecuenciaCardiaca != null) frecuenciaCardiaca.value = v.frecuenciaCardiaca;
  if (v.categoriaFrecuenciaCardiaca) categoriaFrecuenciaCardiaca.value = v.categoriaFrecuenciaCardiaca;
}

onMounted(() => {
  sv();
  const docSv = documentos.currentDocument?.signosVitales;
  const fdSv = sv();
  if (docSv && (docSv.tensionArterialSistolica != null || docSv.frecuenciaCardiaca != null)) {
    hydrate(docSv);
  } else if (fdSv?.tensionArterialSistolica != null || fdSv?.frecuenciaCardiaca != null) {
    hydrate(fdSv);
  } else {
    setCategoriaTensionArterial();
    setCategoriaFrecuenciaCardiaca();
  }
  pushSignosVitales();
});

onUnmounted(() => {
  pushSignosVitales();
});

watch([tensionArterialSistolica, tensionArterialDiastolica, frecuenciaCardiaca], () => {
  setCategoriaTensionArterial();
  setCategoriaFrecuenciaCardiaca();
  pushSignosVitales();
});

function setCategoriaTensionArterial() {
  const sistolica = tensionArterialSistolica.value;
  const diastolica = tensionArterialDiastolica.value;
  let categoriaSistolica = '';
  let categoriaDiastolica = '';

  if (sistolica <= 120) categoriaSistolica = 'Óptima';
  else if (sistolica >= 121 && sistolica <= 130) categoriaSistolica = 'Normal';
  else if (sistolica >= 131 && sistolica <= 139) categoriaSistolica = 'Alta';
  else if (sistolica >= 140 && sistolica <= 159) categoriaSistolica = 'Hipertensión grado 1';
  else if (sistolica >= 160 && sistolica <= 179) categoriaSistolica = 'Hipertensión grado 2';
  else categoriaSistolica = 'Hipertensión grado 3';

  if (diastolica <= 80) categoriaDiastolica = 'Óptima';
  else if (diastolica >= 81 && diastolica <= 85) categoriaDiastolica = 'Normal';
  else if (diastolica >= 86 && diastolica <= 89) categoriaDiastolica = 'Alta';
  else if (diastolica >= 90 && diastolica <= 99) categoriaDiastolica = 'Hipertensión grado 1';
  else if (diastolica >= 100 && diastolica <= 109) categoriaDiastolica = 'Hipertensión grado 2';
  else categoriaDiastolica = 'Hipertensión grado 3';

  let categoria = '';
  if (categoriaSistolica === 'Hipertensión grado 3' || categoriaDiastolica === 'Hipertensión grado 3')
    categoria = 'Hipertensión grado 3';
  else if (
    categoriaSistolica === 'Hipertensión grado 2' ||
    categoriaDiastolica === 'Hipertensión grado 2'
  )
    categoria = 'Hipertensión grado 2';
  else if (
    categoriaSistolica === 'Hipertensión grado 1' ||
    categoriaDiastolica === 'Hipertensión grado 1'
  )
    categoria = 'Hipertensión grado 1';
  else if (categoriaSistolica === 'Alta' || categoriaDiastolica === 'Alta')
    categoria = 'Alta';
  else if (categoriaSistolica === 'Normal' || categoriaDiastolica === 'Normal')
    categoria = 'Normal';
  else categoria = 'Óptima';

  categoriaTensionArterial.value = categoria;
}

function setCategoriaFrecuenciaCardiaca() {
  const frecuencia = frecuenciaCardiaca.value;
  let categoria = '';
  if (frecuencia < 60) categoria = 'Excelente';
  else if (frecuencia >= 60 && frecuencia <= 80) categoria = 'Buena';
  else if (frecuencia >= 81 && frecuencia <= 100) categoria = 'Normal';
  else if (frecuencia >= 101 && frecuencia <= 120) categoria = 'Elevada';
  else if (frecuencia >= 121 && frecuencia <= 140) categoria = 'Alta';
  else categoria = 'Muy alta';

  categoriaFrecuenciaCardiaca.value = categoria;
}

/** Coinciden con límites de `SignosVitalesCardiometabolicoDto` (envío API). */
const mensajeErrorTensionSistolica = computed(() => {
  const v = tensionArterialSistolica.value;
  return v < 60 ? 'Debe ser mínimo 60' : v > 200 ? 'Debe ser máximo 200' : '';
});

const mensajeErrorTensionDiastolica = computed(() => {
  const v = tensionArterialDiastolica.value;
  return v < 40 ? 'Debe ser mínimo 40' : v > 150 ? 'Debe ser máximo 150' : '';
});

const mensajeErrorFrecuenciaCardiaca = computed(() => {
  const v = frecuenciaCardiaca.value;
  return v < 40 ? 'Debe ser mínimo 40' : v > 220 ? 'Debe ser máximo 220' : '';
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
          <label for="escTensionArterialSistolica" class="block text-sm font-medium text-gray-700 mb-2">
            Sistólica (mmHg)
          </label>
          <input
            id="escTensionArterialSistolica"
            v-model.number="tensionArterialSistolica"
            type="number"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            min="60"
            max="200"
            placeholder="60-200"
          />
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
          <label for="escTensionArterialDiastolica" class="block text-sm font-medium text-gray-700 mb-2">
            Diastólica (mmHg)
          </label>
          <input
            id="escTensionArterialDiastolica"
            v-model.number="tensionArterialDiastolica"
            type="number"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
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
            categoriaTensionArterial === 'Hipertensión grado 3' ? 'bg-red-200 text-red-950' : '',
          ]"
          :value="categoriaTensionArterial"
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
      <label for="escFrecuenciaCardiaca" class="block text-base font-medium text-gray-800 mb-2">
        Frecuencia Cardíaca (lpm)
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <input
            id="escFrecuenciaCardiaca"
            v-model.number="frecuenciaCardiaca"
            type="number"
            class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
            min="40"
            max="220"
            placeholder="40-220"
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
              categoriaFrecuenciaCardiaca === 'Muy alta' ? 'bg-red-200 text-red-950' : '',
            ]"
            :value="categoriaFrecuenciaCardiaca"
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
  </div>
</template>
