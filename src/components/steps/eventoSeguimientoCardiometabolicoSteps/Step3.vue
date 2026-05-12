<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { aplicarObesidadDesdeCategoriaIMC, sincronizarDiagnosticoObesidadPorImc } from '@/helpers/eventoSeguimientoCardiometabolicoOptions';
import { obtenerSomatometriaUltimaExploracionFisica } from '@/helpers/cardiometabolico/alturaDesdeExploracionFisica';

const trabajadores = useTrabajadoresStore();
const { formDataEventoSeguimientoCardiometabolico } = useFormDataStore();
const documentos = useDocumentosStore();

function som() {
  const fd = formDataEventoSeguimientoCardiometabolico;
  if (!fd.somatometria) fd.somatometria = {};
  return fd.somatometria;
}

const peso = ref(70);
const altura = ref(1.65);
const indiceMasaCorporal = ref(25.71);
const categoriaIMC = ref('Normal');
const circunferenciaCintura = ref(85);
const categoriaCircunferenciaCintura = ref('Bajo Riesgo');

/** Notas discretas cuando peso/altura/circunferencia vienen de la EF más reciente; se ocultan al editar el campo. */
const mostrarNotaPesoDesdeEF = ref(false);
const mostrarNotaAlturaDesdeEF = ref(false);
const mostrarNotaCircunferenciaDesdeEF = ref(false);
const fechaExploracionFisicaFuenteIso = ref('');

const fechaExploracionFisicaFuenteLegible = computed(() => {
  const raw = fechaExploracionFisicaFuenteIso.value;
  if (!raw) return '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
});

function limpiarNotaPesoDesdeEF() {
  mostrarNotaPesoDesdeEF.value = false;
}

function limpiarNotaAlturaDesdeEF() {
  mostrarNotaAlturaDesdeEF.value = false;
}

function limpiarNotaCircunferenciaDesdeEF() {
  mostrarNotaCircunferenciaDesdeEF.value = false;
}

function mismoValorNumericoSomatometria(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number' || Number.isNaN(a) || Number.isNaN(b)) return false;
  return Math.abs(a - b) < 0.001;
}

/** Notas de procedencia EF cuando el valor mostrado coincide con la última exploración (p. ej. relleno previo en Step 2). */
function sincronizarNotasProcedenciaExploracionFisica(efSom) {
  mostrarNotaPesoDesdeEF.value = false;
  mostrarNotaAlturaDesdeEF.value = false;
  mostrarNotaCircunferenciaDesdeEF.value = false;
  fechaExploracionFisicaFuenteIso.value = '';

  if (
    !efSom ||
    (efSom.peso == null && efSom.altura == null && efSom.circunferenciaCintura == null)
  ) {
    return;
  }

  if (efSom.peso != null && mismoValorNumericoSomatometria(peso.value, efSom.peso)) {
    mostrarNotaPesoDesdeEF.value = true;
  }
  if (efSom.altura != null && mismoValorNumericoSomatometria(altura.value, efSom.altura)) {
    mostrarNotaAlturaDesdeEF.value = true;
  }
  if (
    efSom.circunferenciaCintura != null &&
    mismoValorNumericoSomatometria(circunferenciaCintura.value, efSom.circunferenciaCintura)
  ) {
    mostrarNotaCircunferenciaDesdeEF.value = true;
  }

  if (
    (mostrarNotaPesoDesdeEF.value ||
      mostrarNotaAlturaDesdeEF.value ||
      mostrarNotaCircunferenciaDesdeEF.value) &&
    efSom.fechaExploracionFisica
  ) {
    fechaExploracionFisicaFuenteIso.value = efSom.fechaExploracionFisica;
  }
}

function pushSomatometria() {
  const s = som();
  s.peso = peso.value;
  s.altura = altura.value;
  s.indiceMasaCorporal = indiceMasaCorporal.value;
  s.categoriaIMC = categoriaIMC.value;
  s.circunferenciaCintura = circunferenciaCintura.value;
  s.categoriaCircunferenciaCintura = categoriaCircunferenciaCintura.value;
}

function hydrateFromSom(source) {
  if (!source) return;
  if (source.peso != null) peso.value = source.peso;
  if (source.altura != null) altura.value = source.altura;
  if (source.indiceMasaCorporal != null) indiceMasaCorporal.value = source.indiceMasaCorporal;
  if (source.categoriaIMC) categoriaIMC.value = source.categoriaIMC;
  if (source.circunferenciaCintura != null) circunferenciaCintura.value = source.circunferenciaCintura;
  if (source.categoriaCircunferenciaCintura) categoriaCircunferenciaCintura.value = source.categoriaCircunferenciaCintura;
}

onMounted(() => {
  som();
  const docSom = documentos.currentDocument?.somatometria;
  const fdSom = som();
  const fdTieneMediciones =
    fdSom?.peso != null || fdSom?.altura != null || fdSom?.circunferenciaCintura != null;
  const docTieneMediciones =
    docSom?.peso != null || docSom?.altura != null || docSom?.circunferenciaCintura != null;

  if (fdTieneMediciones) {
    hydrateFromSom(fdSom);
  } else if (docTieneMediciones) {
    hydrateFromSom(docSom);
  } else {
    const esHombre = trabajadores.currentTrabajador?.sexo === 'Masculino';
    peso.value = esHombre ? 80 : 70;
    altura.value = esHombre ? 1.7 : 1.6;
    circunferenciaCintura.value = esHombre ? 93 : 79;
    calcularIMC(peso.value, altura.value);
    setCategoriaCircunferenciaCintura();
  }

  const alturaPersistida = fdSom?.altura != null || docSom?.altura != null;
  const pesoPersistido = fdSom?.peso != null || docSom?.peso != null;
  const circunferenciaPersistida =
    fdSom?.circunferenciaCintura != null || docSom?.circunferenciaCintura != null;

  const efSom = obtenerSomatometriaUltimaExploracionFisica(
    documentos.documentsByYear,
    trabajadores.currentTrabajador?._id,
  );

  let aplicoDatosEf = false;
  if (efSom) {
    if (!alturaPersistida && efSom.altura != null) {
      altura.value = efSom.altura;
      aplicoDatosEf = true;
    }
    if (!pesoPersistido && efSom.peso != null) {
      peso.value = efSom.peso;
      aplicoDatosEf = true;
    }
    if (!circunferenciaPersistida && efSom.circunferenciaCintura != null) {
      circunferenciaCintura.value = efSom.circunferenciaCintura;
      aplicoDatosEf = true;
    }
  }
  if (aplicoDatosEf) {
    calcularIMC(peso.value, altura.value);
    setCategoriaCircunferenciaCintura();
  }

  sincronizarNotasProcedenciaExploracionFisica(efSom);

  pushSomatometria();
  aplicarObesidadDesdeCategoriaIMC(formDataEventoSeguimientoCardiometabolico, categoriaIMC.value);
  sincronizarDiagnosticoObesidadPorImc(formDataEventoSeguimientoCardiometabolico, indiceMasaCorporal.value);
});

watch([peso, altura, circunferenciaCintura], () => {
  calcularIMC(peso.value, altura.value);
  setCategoriaCircunferenciaCintura();
  pushSomatometria();
});

function calcularIMC(p, h) {
  if (p > 0 && h > 0) {
    const imc = Math.round((p / h ** 2) * 100) / 100;
    indiceMasaCorporal.value = imc;
    setCategoriaIMC(imc);
  } else {
    indiceMasaCorporal.value = null;
    categoriaIMC.value = '';
  }
  aplicarObesidadDesdeCategoriaIMC(formDataEventoSeguimientoCardiometabolico, categoriaIMC.value);
  sincronizarDiagnosticoObesidadPorImc(
    formDataEventoSeguimientoCardiometabolico,
    typeof indiceMasaCorporal.value === 'number' ? indiceMasaCorporal.value : undefined,
  );
}

function setCategoriaIMC(IMC) {
  if (typeof IMC !== 'number' || Number.isNaN(IMC)) {
    categoriaIMC.value = '';
    return;
  }
  let categoria = '';
  if (IMC < 18.5) {
    categoria = 'Bajo peso';
  } else if (IMC >= 18.5 && IMC <= 24.99) {
    categoria = 'Normal';
  } else if (IMC >= 25 && IMC <= 29.99) {
    categoria = 'Sobrepeso';
  } else if (IMC >= 30 && IMC <= 34.99) {
    categoria = 'Obesidad clase I';
  } else if (IMC >= 35 && IMC <= 39.99) {
    categoria = 'Obesidad clase II';
  } else if (IMC >= 40) {
    categoria = 'Obesidad clase III';
  }
  categoriaIMC.value = categoria;
}

function setCategoriaCircunferenciaCintura() {
  const circunferencia = circunferenciaCintura.value;
  let categoria = '';
  if (trabajadores.currentTrabajador?.sexo === 'Femenino') {
    if (circunferencia < 80) categoria = 'Bajo Riesgo';
    else if (circunferencia <= 89) categoria = 'Riesgo Aumentado';
    else categoria = 'Alto Riesgo';
  } else {
    if (circunferencia < 94) categoria = 'Bajo Riesgo';
    else if (circunferencia <= 103) categoria = 'Riesgo Aumentado';
    else categoria = 'Alto Riesgo';
  }
  categoriaCircunferenciaCintura.value = categoria;
}

const mensajeErrorPeso = computed(() => {
  return peso.value < 35
    ? 'Debe ser mínimo 35'
    : peso.value > 300
      ? 'Debe ser máximo 300'
      : '';
});
const mensajeErrorAltura = computed(() => {
  return altura.value < 1.2
    ? 'Debe ser mínimo 1.20 m'
    : altura.value > 2.3
      ? 'Debe ser máximo 2.30 m'
      : '';
});

const mensajeErrorCircunferenciaCintura = computed(() => {
  return circunferenciaCintura.value < 40
    ? 'Debe ser mínimo 40 cm'
    : circunferenciaCintura.value > 200
      ? 'Debe ser máximo 200 cm'
      : '';
});
</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada (alineado con exploración física — somatometría) -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">SOMATOMETRÍA</h1>

    <!-- Peso y Altura -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label for="peso" class="block text-base font-medium text-gray-800 mb-2">
          Peso (Kg)
        </label>
        <input
          id="peso"
          v-model.number="peso"
          type="number"
          class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
          min="35"
          max="300"
          step="0.1"
          placeholder="35-300"
          @input="limpiarNotaPesoDesdeEF"
          @change="limpiarNotaPesoDesdeEF"
        >
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 transform -translate-y-1"
          enter-to-class="opacity-100 transform translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 transform translate-y-0"
          leave-to-class="opacity-0 transform -translate-y-1"
        >
          <p v-if="mensajeErrorPeso" class="text-red-600 text-sm mt-2 font-medium">
            ⚠️ {{ mensajeErrorPeso }}
          </p>
        </transition>
        <p
          v-if="mostrarNotaPesoDesdeEF"
          class="text-xs text-gray-500 mt-1.5 leading-snug"
        >
          <template v-if="fechaExploracionFisicaFuenteLegible">
            Valor obtenido de exploración física · {{ fechaExploracionFisicaFuenteLegible }}
          </template>
          <template v-else>
            Valor obtenido de exploración física
          </template>
        </p>
      </div>

      <div>
        <label for="altura" class="block text-base font-medium text-gray-800 mb-2">
          Altura (m)
        </label>
        <input
          id="altura"
          v-model.number="altura"
          type="number"
          class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
          step="0.01"
          min="1.2"
          max="2.3"
          placeholder="1.20-2.30"
          @input="limpiarNotaAlturaDesdeEF"
          @change="limpiarNotaAlturaDesdeEF"
        />
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 transform -translate-y-1"
          enter-to-class="opacity-100 transform translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 transform translate-y-0"
          leave-to-class="opacity-0 transform -translate-y-1"
        >
          <p v-if="mensajeErrorAltura" class="text-red-600 text-sm mt-2 font-medium">
            ⚠️ {{ mensajeErrorAltura }}
          </p>
        </transition>
        <p
          v-if="mostrarNotaAlturaDesdeEF"
          class="text-xs text-gray-500 mt-1.5 leading-snug"
        >
          <template v-if="fechaExploracionFisicaFuenteLegible">
            Valor obtenido de exploración física · {{ fechaExploracionFisicaFuenteLegible }}
          </template>
          <template v-else>
            Valor obtenido de exploración física
          </template>
        </p>
      </div>
    </div>

    <!-- Índice de Masa Corporal -->
    <div class="mb-6">
      <label class="block text-base font-medium text-gray-800 mb-2">
        Índice de Masa Corporal
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div class="relative">
          <input
            v-model="indiceMasaCorporal"
            type="number"
            class="w-full p-3 text-center border-2 border-gray-200 rounded-lg text-gray-700 bg-gray-50 cursor-not-allowed font-semibold"
            readonly
            title="El IMC se calcula automáticamente en función al peso y altura"
          />
          <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div class="relative">
          <input
            v-model="categoriaIMC"
            type="text"
            :class="[
              'w-full py-3 px-2 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
              categoriaIMC === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaIMC === 'Bajo peso' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaIMC === 'Sobrepeso' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaIMC === 'Obesidad clase I' ? 'bg-red-50 text-red-900' : '',
              categoriaIMC === 'Obesidad clase II' ? 'bg-red-100 text-red-900' : '',
              categoriaIMC === 'Obesidad clase III' ? 'bg-red-200 text-red-950' : ''
            ]"
            readonly
            title="La categoría se determina automáticamente según su IMC"
          />
          <div
            v-if="categoriaIMC === 'Normal'"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Circunferencia de Cintura -->
    <div class="mb-4">
      <label class="block text-base font-medium text-gray-800 mb-2">
        Circunferencia de Cintura (cm)
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="relative">
            <input
              v-model.number="circunferenciaCintura"
              type="number"
              class="w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
              min="40"
              max="200"
              placeholder="40-200"
              @input="limpiarNotaCircunferenciaDesdeEF"
              @change="limpiarNotaCircunferenciaDesdeEF"
            />
          </div>
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 transform -translate-y-1"
            enter-to-class="opacity-100 transform translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 transform translate-y-0"
            leave-to-class="opacity-0 transform -translate-y-1"
          >
            <p v-if="mensajeErrorCircunferenciaCintura" class="text-red-600 text-sm mt-2 font-medium">
              ⚠️ {{ mensajeErrorCircunferenciaCintura }}
            </p>
          </transition>
          <p
            v-if="mostrarNotaCircunferenciaDesdeEF"
            class="text-xs text-gray-500 mt-1.5 leading-snug"
          >
            <template v-if="fechaExploracionFisicaFuenteLegible">
              Valor obtenido de exploración física · {{ fechaExploracionFisicaFuenteLegible }}
            </template>
            <template v-else>
              Valor obtenido de exploración física
            </template>
          </p>
        </div>
        <div class="relative">
          <input
            v-model="categoriaCircunferenciaCintura"
            type="text"
            :class="[
              'w-full py-3 px-2 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
              categoriaCircunferenciaCintura === 'Bajo Riesgo' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaCircunferenciaCintura === 'Riesgo Aumentado' ? 'bg-yellow-50 text-yellow-800 text-sm' : '',
              categoriaCircunferenciaCintura === 'Alto Riesgo' ? 'bg-red-100 text-red-900' : ''
            ]"
            readonly
            title="Clasificación automática según el sexo y la circunferencia de cintura ingresada"
          />
          <div
            v-if="categoriaCircunferenciaCintura === 'Bajo Riesgo'"
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
