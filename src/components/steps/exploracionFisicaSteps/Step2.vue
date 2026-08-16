<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  SOMATOMETRIA_SIGNOS_RANGES,
  mensajeErrorSomatometriaSignosField,
} from '@/helpers/somatometriaSignosRanges';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const trabajadores = useTrabajadoresStore();
const { formDataExploracionFisica } = useFormDataStore();
const documentos = useDocumentosStore();

// Valores por defecto que se ajustarán según el sexo
const peso = ref(80);
const altura = ref(1.7);
const indiceMasaCorporal = ref(27.68);
const categoriaIMC = ref('Sobrepeso');
const circunferenciaCintura = ref(89);
const categoriaCircunferenciaCintura = ref('Bajo Riesgo');

onMounted(() => {
  // Establecer valores por defecto según el sexo
  const esHombre = trabajadores.currentTrabajador.sexo !== 'Femenino';
  const pesoPorDefecto = esHombre ? 80 : 70;
  const alturaPorDefecto = esHombre ? 1.7 : 1.6;
  const circunferenciaPorDefecto = esHombre ? 93 : 79;
  
  // Prioridad: formData > documentos.currentDocument > valores por defecto según sexo
  if (formDataExploracionFisica.peso !== undefined) {
    peso.value = formDataExploracionFisica.peso;
    altura.value = formDataExploracionFisica.altura;
    indiceMasaCorporal.value = formDataExploracionFisica.indiceMasaCorporal;
    categoriaIMC.value = formDataExploracionFisica.categoriaIMC;
    circunferenciaCintura.value = formDataExploracionFisica.circunferenciaCintura;
    categoriaCircunferenciaCintura.value = formDataExploracionFisica.categoriaCircunferenciaCintura;
  } else if (documentos.currentDocument) {
    peso.value = documentos.currentDocument.peso;
    altura.value = documentos.currentDocument.altura;
    indiceMasaCorporal.value = documentos.currentDocument.indiceMasaCorporal;
    categoriaIMC.value = documentos.currentDocument.categoriaIMC;
    circunferenciaCintura.value = documentos.currentDocument.circunferenciaCintura;
    categoriaCircunferenciaCintura.value = documentos.currentDocument.categoriaCircunferenciaCintura; 
  } else {
    // Si no hay datos previos, establecer valores según el sexo
    peso.value = pesoPorDefecto;
    altura.value = alturaPorDefecto;
    circunferenciaCintura.value = circunferenciaPorDefecto;
    // Recalcular IMC con los valores por defecto
    calcularIMC(pesoPorDefecto, alturaPorDefecto);
  }
});

onUnmounted(() => {
  formDataExploracionFisica.peso = peso.value;
  formDataExploracionFisica.altura = altura.value;
  formDataExploracionFisica.indiceMasaCorporal = indiceMasaCorporal.value;
  formDataExploracionFisica.categoriaIMC = categoriaIMC.value;
  formDataExploracionFisica.circunferenciaCintura = circunferenciaCintura.value;
  formDataExploracionFisica.categoriaCircunferenciaCintura = categoriaCircunferenciaCintura.value;
})

watch([peso, altura, circunferenciaCintura], () => {
  formDataExploracionFisica.peso = peso.value;
  formDataExploracionFisica.altura = altura.value;
  calcularIMC(peso.value, altura.value); // Pasar los valores actuales
  formDataExploracionFisica.circunferenciaCintura = circunferenciaCintura.value;
  setCategoriaCircunferenciaCintura();
});

function calcularIMC(peso, altura) {
  if (peso > 0 && altura > 0) {
    const imc = peso / (altura ** 2); // Altura ya está en metros
    const imcRedondeado = Math.round(imc * 100) / 100;

    // Actualiza tanto el estado reactivo como el formData
    indiceMasaCorporal.value = imcRedondeado; // Esto actualizará dinámicamente el v-model
    formDataExploracionFisica.indiceMasaCorporal = imcRedondeado;

    setCategoriaIMC();
  } else {
    indiceMasaCorporal.value = null;
    formDataExploracionFisica.indiceMasaCorporal = null;
  }
}

function setCategoriaIMC() {
  let IMC = formDataExploracionFisica.indiceMasaCorporal
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
  formDataExploracionFisica.categoriaIMC = categoria;
}

function setCategoriaCircunferenciaCintura() {
  let circunferencia = formDataExploracionFisica.circunferenciaCintura
  let categoria = '';
  if (trabajadores.currentTrabajador.sexo === 'Femenino') {
    if (circunferencia < 80) {
      categoria = 'Bajo Riesgo';
    } else if (circunferencia >= 80 && circunferencia <= 89) {
      categoria = 'Riesgo Aumentado';
    } else {
      categoria = 'Alto Riesgo';
    }
  } else if (trabajadores.currentTrabajador.sexo === 'Masculino') {
    if (circunferencia < 94) {
      categoria = 'Bajo Riesgo';
    } else if (circunferencia >= 94 && circunferencia <= 103) {
      categoria = 'Riesgo Aumentado';
    } else {
      categoria = 'Alto Riesgo';
    }
  }

  categoriaCircunferenciaCintura.value = categoria;
  formDataExploracionFisica.categoriaCircunferenciaCintura = categoria;
}

const mensajeErrorPeso = computed(() =>
  mensajeErrorSomatometriaSignosField('peso', peso.value),
);

const mensajeErrorAltura = computed(() =>
  mensajeErrorSomatometriaSignosField('altura', altura.value),
);

const mensajeErrorCircunferenciaCintura = computed(() =>
  mensajeErrorSomatometriaSignosField('circunferenciaCintura', circunferenciaCintura.value),
);
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">SOMATOMETRÍA</h1>

    <!-- Peso y Altura -->
    <div :class="['grid grid-cols-2 gap-4', variant === 'compact' ? 'mb-3' : 'mb-6']">
      <div>
        <label for="peso" :class="variant === 'compact' ? 'block text-sm font-medium text-gray-800 mb-1' : 'block text-base font-medium text-gray-800 mb-2'">
          Peso (Kg)
        </label>
        <input 
          type="number"
          id="peso"
          :class="variant === 'compact'
            ? 'w-full p-2 text-center border border-gray-300 rounded-md text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
            : 'w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200'"
          v-model="peso" 
          :min="SOMATOMETRIA_SIGNOS_RANGES.peso.min" 
          :max="SOMATOMETRIA_SIGNOS_RANGES.peso.max" 
          step="0.1"
          :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.peso.min}-${SOMATOMETRIA_SIGNOS_RANGES.peso.max}`"
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
      </div>

      <div>
        <label for="altura" :class="variant === 'compact' ? 'block text-sm font-medium text-gray-800 mb-1' : 'block text-base font-medium text-gray-800 mb-2'">
          Altura (m)
        </label>
        <input 
          type="number"
          id="altura"
          :class="variant === 'compact'
            ? 'w-full p-2 text-center border border-gray-300 rounded-md text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
            : 'w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200'"
          v-model="altura" 
          step="0.01" 
          :min="SOMATOMETRIA_SIGNOS_RANGES.altura.min" 
          :max="SOMATOMETRIA_SIGNOS_RANGES.altura.max"
          :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.altura.min}-${SOMATOMETRIA_SIGNOS_RANGES.altura.max}`"
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
      </div>
    </div>

    <!-- Índice de Masa Corporal -->
    <div :class="variant === 'compact' ? 'mb-3' : 'mb-6'">
      <label :class="variant === 'compact' ? 'block text-sm font-medium text-gray-800 mb-1' : 'block text-base font-medium text-gray-800 mb-2'">
        Índice de Masa Corporal
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div class="relative">
          <input 
            type="number"
            :class="variant === 'compact'
              ? 'w-full p-2 text-center border border-gray-200 rounded-md text-sm text-gray-700 bg-gray-50 cursor-not-allowed font-semibold'
              : 'w-full p-3 text-center border-2 border-gray-200 rounded-lg text-gray-700 bg-gray-50 cursor-not-allowed font-semibold'"
            v-model="indiceMasaCorporal" 
            readonly 
            title="El IMC se calcula automáticamente en función al peso y altura"
          />
          <div v-if="variant !== 'compact'" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div class="relative">
          <input 
            type="text"
            :class="[
              variant === 'compact' ? 'w-full py-2 px-2 text-center border border-gray-200 rounded-md text-sm cursor-not-allowed font-semibold' : 'w-full py-3 px-2 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
              categoriaIMC === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaIMC === 'Bajo peso' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaIMC === 'Sobrepeso' ? 'bg-yellow-50 text-yellow-800' : '',
              categoriaIMC === 'Obesidad clase I' ? 'bg-red-50 text-red-900' : '',
              categoriaIMC === 'Obesidad clase II' ? 'bg-red-100 text-red-900' : '',
              categoriaIMC === 'Obesidad clase III' ? 'bg-red-200 text-red-950' : ''
            ]"
            v-model="categoriaIMC" 
            readonly 
            title="La categoría se determina automáticamente según su IMC"
          />
          <div 
            v-if="categoriaIMC === 'Normal' && variant !== 'compact'" 
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
    <div :class="variant === 'compact' ? 'mb-2' : 'mb-4'">
      <label :class="variant === 'compact' ? 'block text-sm font-medium text-gray-800 mb-1' : 'block text-base font-medium text-gray-800 mb-2'">
        Circunferencia de Cintura (cm)
      </label>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="relative">
            <input 
              type="number"
              :class="variant === 'compact'
                ? 'w-full p-2 text-center border border-gray-300 rounded-md text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
                : 'w-full p-3 text-center border-2 border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200'"
              v-model="circunferenciaCintura" 
              :min="SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.min"
              :max="SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.max"
              :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.min}-${SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.max}`"
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
        </div>
        <div class="relative">
          <input 
            type="text"
            :class="[
              variant === 'compact' ? 'w-full py-2 px-2 text-center border border-gray-200 rounded-md text-sm cursor-not-allowed font-semibold' : 'w-full py-3 px-2 text-center border-2 border-gray-200 rounded-lg cursor-not-allowed font-semibold',
              categoriaCircunferenciaCintura === 'Bajo Riesgo' ? 'bg-emerald-50 text-emerald-800' : '',
              categoriaCircunferenciaCintura === 'Riesgo Aumentado' ? 'bg-yellow-50 text-yellow-800 text-sm' : '',
              categoriaCircunferenciaCintura === 'Alto Riesgo' ? 'bg-red-100 text-red-900' : ''
            ]"
            v-model="categoriaCircunferenciaCintura" 
            readonly 
            title="Clasificación automática según el sexo y la circunferencia de cintura ingresada"
          />
          <div 
            v-if="categoriaCircunferenciaCintura === 'Bajo Riesgo' && variant !== 'compact'" 
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
