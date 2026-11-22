<script setup>
import { vValorDePartida } from '@/directives/valorDePartida';
import { useValorDePartida } from '@/composables/useValorDePartida';
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  SOMATOMETRIA_SIGNOS_RANGES,
  mensajeErrorSomatometriaSignosField,
} from '@/helpers/somatometriaSignosRanges';
import { esMedicion, imcDesdePesoAltura } from '@/helpers/medicionesClinicas';

const partida = useValorDePartida();
const { formDataCertificadoExpedito } = useFormDataStore();
const documentos = useDocumentosStore();

// Sin valores por defecto: se escribe lo que se midió. Sin medición no hay IMC ni categoría.
const peso = ref(null);
const altura = ref(null);
const indiceMasaCorporal = ref(null);
const categoriaIMC = ref('');

onMounted(() => {
  // Prioridad: formData (se regresó al paso) > documentos.currentDocument > vacío
  const fuente =
    formDataCertificadoExpedito.peso !== undefined || formDataCertificadoExpedito.altura !== undefined
      ? formDataCertificadoExpedito
      : documentos.currentDocument;
  if (fuente) {
    peso.value = fuente.peso ?? null;
    altura.value = fuente.altura ?? null;
    indiceMasaCorporal.value = imcDesdePesoAltura(peso.value, altura.value) ?? fuente.indiceMasaCorporal ?? null;
    setCategoriaIMC(indiceMasaCorporal.value);
  }
});

onUnmounted(() => {
  formDataCertificadoExpedito.peso = peso.value;
  formDataCertificadoExpedito.altura = altura.value;
  formDataCertificadoExpedito.indiceMasaCorporal = indiceMasaCorporal.value;
})

watch([peso, altura], () => {
  formDataCertificadoExpedito.peso = peso.value;
  formDataCertificadoExpedito.altura = altura.value;
  calcularIMC(peso.value, altura.value); // Pasar los valores actuales
});

function calcularIMC(peso, altura) {
  const imc = imcDesdePesoAltura(peso, altura);
  indiceMasaCorporal.value = imc;
  formDataCertificadoExpedito.indiceMasaCorporal = imc;
  setCategoriaIMC(imc);
}

function setCategoriaIMC(IMC) {
  let categoria = '';

  if (!esMedicion(IMC)) {
    categoria = '';
  } else if (IMC < 18.5) {
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

const mensajeErrorPeso = computed(() =>
  mensajeErrorSomatometriaSignosField('peso', peso.value),
);

const mensajeErrorAltura = computed(() =>
  mensajeErrorSomatometriaSignosField('altura', altura.value),
);

</script>

<template>
  <div>
    <h1 class="font-bold mb-4 text-gray-800 ">Medidas del cuerpo</h1>
    <h2 class="mb-4">SOMATOMETRÍA</h2>

    <div class="flex gap-4 mb-4">
      <div data-campo="peso">
        <label for="peso">Peso (Kg)</label>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="peso" v-valor-de-partida="partida('peso')" :min="SOMATOMETRIA_SIGNOS_RANGES.peso.min" :max="SOMATOMETRIA_SIGNOS_RANGES.peso.max" step="0.1"
          :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.peso.min}-${SOMATOMETRIA_SIGNOS_RANGES.peso.max}`">
        <p v-if="mensajeErrorPeso" class="text-red-500 text-sm mt-1">{{ mensajeErrorPeso }}</p>
      </div>
      <div data-campo="altura">
        <label for="altura">Altura (m)</label>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="altura" v-valor-de-partida="partida('altura')" step="0.01" :min="SOMATOMETRIA_SIGNOS_RANGES.altura.min" :max="SOMATOMETRIA_SIGNOS_RANGES.altura.max"
          :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.altura.min}-${SOMATOMETRIA_SIGNOS_RANGES.altura.max}`" />
        <p v-if="mensajeErrorAltura" class="text-red-500 text-sm mt-1">{{ mensajeErrorAltura }}</p>
      </div>
    </div>

    <label for="indiceMasaCorporal">Índice de Masa Corporal</label>
    <div class="flex gap-4 mb-4">
      <div>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
          v-model="indiceMasaCorporal" placeholder="Se calcula solo" data-calculado readonly title="El IMC se calcula automáticamente en función al peso y altura" />
      </div>
      <div>
        <input type="text"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
          v-model="categoriaIMC" placeholder="Según el IMC" data-calculado readonly title="La categoría se determina automáticamente según su IMC"/>
      </div>
    </div>

  </div>
</template>
