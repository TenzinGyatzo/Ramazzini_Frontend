<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  SOMATOMETRIA_SIGNOS_RANGES,
  mensajeErrorSomatometriaSignosField,
} from '@/helpers/somatometriaSignosRanges';

const { formDataCertificadoExpedito } = useFormDataStore();
const documentos = useDocumentosStore();

const peso = ref(80);
const altura = ref(1.7);
const indiceMasaCorporal = ref(27.68);
const categoriaIMC = ref('Sobrepeso');

onMounted(() => {
  if (documentos.currentDocument) {
    peso.value = documentos.currentDocument.peso;
    altura.value = documentos.currentDocument.altura;
    indiceMasaCorporal.value = documentos.currentDocument.indiceMasaCorporal;
    categoriaIMC.value = documentos.currentDocument.categoriaIMC;
    setCategoriaIMC();
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
  if (peso > 0 && altura > 0) {
    const imc = peso / (altura ** 2); // Altura ya está en metros
    const imcRedondeado = Math.round(imc * 100) / 100;

    // Actualiza tanto el estado reactivo como el formData
    indiceMasaCorporal.value = imcRedondeado; // Esto actualizará dinámicamente el v-model
    formDataCertificadoExpedito.indiceMasaCorporal = imcRedondeado;

    setCategoriaIMC();
  } else {
    indiceMasaCorporal.value = null;
    formDataCertificadoExpedito.indiceMasaCorporal = null;
  }
}

function setCategoriaIMC() {
  let IMC = formDataCertificadoExpedito.indiceMasaCorporal
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
      <div>
        <label for="peso">Peso (Kg)</label>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="peso" :min="SOMATOMETRIA_SIGNOS_RANGES.peso.min" :max="SOMATOMETRIA_SIGNOS_RANGES.peso.max" step="0.1">
        <p v-if="mensajeErrorPeso" class="text-red-500 text-sm mt-1">{{ mensajeErrorPeso }}</p>
      </div>
      <div>
        <label for="altura">Altura (m)</label>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="altura" step="0.01" :min="SOMATOMETRIA_SIGNOS_RANGES.altura.min" :max="SOMATOMETRIA_SIGNOS_RANGES.altura.max" />
        <p v-if="mensajeErrorAltura" class="text-red-500 text-sm mt-1">{{ mensajeErrorAltura }}</p>
      </div>
    </div>

    <label for="indiceMasaCorporal">Índice de Masa Corporal</label>
    <div class="flex gap-4 mb-4">
      <div>
        <input type="number"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
          v-model="indiceMasaCorporal" readonly title="El IMC se calcula automáticamente en función al peso y altura" />
      </div>
      <div>
        <input type="text"
          class="w-full p-1.5 text-center mt-1 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-100 cursor-default"
          v-model="categoriaIMC" readonly title="La categoría se determina automáticamente según su IMC"/>
      </div>
    </div>

  </div>
</template>
