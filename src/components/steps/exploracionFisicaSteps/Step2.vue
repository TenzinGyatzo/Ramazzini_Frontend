<script setup>
import { useValorDePartida } from '@/composables/useValorDePartida';
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import {
  SOMATOMETRIA_SIGNOS_RANGES,
  mensajeErrorSomatometriaSignosField,
} from '@/helpers/somatometriaSignosRanges';
import { esMedicion, imcDesdePesoAltura } from '@/helpers/medicionesClinicas';
import UsarUltimaExploracionFisica from '../UsarUltimaExploracionFisica.vue';
import NumeroCaptura from '@/components/steps/captura/NumeroCaptura.vue';
import { colorCategoria } from '@/components/steps/captura/colorCategoria';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

// Punto 41: un solo diseño en los dos modos, como la somatometría de la nota médica
const capturaRapida = enCapturaRapida();

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';

// Al abrir el paso, el cursor va al primer dato obligatorio vacío
useAutofocoPrimerVacio(['peso', 'altura', 'circunferenciaCintura']);

const partida = useValorDePartida();
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

// Sin valores por defecto: se escribe lo que se midió (o se copia de la última exploración
// física con el botón). Sin medición no hay IMC ni categoría.
const peso = ref(null);
const altura = ref(null);
const indiceMasaCorporal = ref(null);
const categoriaIMC = ref('');
const circunferenciaCintura = ref(null);
const categoriaCircunferenciaCintura = ref('');
/** La cintura es opcional: si no se pudo medir se marca «Se desconoce» (queda registrado). */
const cinturaSeDesconoce = ref(false);

onMounted(() => {
  // Prioridad: formData > documentos.currentDocument > vacío
  if (formDataExploracionFisica.peso !== undefined) {
    peso.value = formDataExploracionFisica.peso;
    altura.value = formDataExploracionFisica.altura;
    indiceMasaCorporal.value = formDataExploracionFisica.indiceMasaCorporal;
    categoriaIMC.value = formDataExploracionFisica.categoriaIMC ?? '';
    circunferenciaCintura.value = formDataExploracionFisica.circunferenciaCintura;
    categoriaCircunferenciaCintura.value = formDataExploracionFisica.categoriaCircunferenciaCintura ?? '';
    cinturaSeDesconoce.value = formDataExploracionFisica.circunferenciaCinturaSeDesconoce === true;
  } else if (documentos.currentDocument) {
    peso.value = documentos.currentDocument.peso;
    altura.value = documentos.currentDocument.altura;
    indiceMasaCorporal.value = documentos.currentDocument.indiceMasaCorporal;
    categoriaIMC.value = documentos.currentDocument.categoriaIMC ?? '';
    circunferenciaCintura.value = documentos.currentDocument.circunferenciaCintura;
    categoriaCircunferenciaCintura.value = documentos.currentDocument.categoriaCircunferenciaCintura ?? '';
    cinturaSeDesconoce.value = documentos.currentDocument.circunferenciaCinturaSeDesconoce === true;
  }
});

watch(cinturaSeDesconoce, (seDesconoce) => {
  formDataExploracionFisica.circunferenciaCinturaSeDesconoce = seDesconoce;
  // Sin medición: se borra la que hubiera (y su categoría)
  if (seDesconoce) circunferenciaCintura.value = null;
});


watch([peso, altura, circunferenciaCintura], () => {
  formDataExploracionFisica.peso = peso.value;
  formDataExploracionFisica.altura = altura.value;
  calcularIMC(peso.value, altura.value); // Pasar los valores actuales
  formDataExploracionFisica.circunferenciaCintura = circunferenciaCintura.value;
  setCategoriaCircunferenciaCintura();
});

/** Copia de la última exploración física lo que traiga (solo a pedido del usuario). */
function usarUltimaExploracion(som) {
  if (som.peso != null) peso.value = som.peso;
  if (som.altura != null) altura.value = som.altura;
  if (som.circunferenciaCintura != null) {
    cinturaSeDesconoce.value = false;
    circunferenciaCintura.value = som.circunferenciaCintura;
  }
}

function calcularIMC(peso, altura) {
  const imc = imcDesdePesoAltura(peso, altura);
  indiceMasaCorporal.value = imc;
  formDataExploracionFisica.indiceMasaCorporal = imc;
  setCategoriaIMC();
}

function setCategoriaIMC() {
  let IMC = formDataExploracionFisica.indiceMasaCorporal
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
  formDataExploracionFisica.categoriaIMC = categoria;
}

function setCategoriaCircunferenciaCintura() {
  let circunferencia = formDataExploracionFisica.circunferenciaCintura
  let categoria = '';
  if (!esMedicion(circunferencia)) {
    categoria = '';
  } else if (trabajadores.currentTrabajador?.sexo === 'Femenino') {
    if (circunferencia < 80) {
      categoria = 'Bajo Riesgo';
    } else if (circunferencia >= 80 && circunferencia <= 89) {
      categoria = 'Riesgo Aumentado';
    } else {
      categoria = 'Alto Riesgo';
    }
  } else {
    // Masculino, Intersexual o sin sexo registrado: cortes de hombre, como la nota médica
    // (antes con Intersexual no se calculaba el riesgo)
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
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Somatometría</h1>

    <UsarUltimaExploracionFisica :compacto="variant === 'compact'" @usar="usarUltimaExploracion" />

    <div
      :class="[
        'grid',
        capturaRapida ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4' : 'grid-cols-2 gap-x-3 gap-y-3',
      ]"
    >
      <NumeroCaptura
        id="peso"
        data-campo="peso"
        v-model="peso"
        etiqueta="Peso"
        unidad="kg"
        obligatorio
        step="0.1"
        :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.peso.min}-${SOMATOMETRIA_SIGNOS_RANGES.peso.max}`"
        :min="SOMATOMETRIA_SIGNOS_RANGES.peso.min"
        :max="SOMATOMETRIA_SIGNOS_RANGES.peso.max"
        :error="mensajeErrorPeso"
        :partida="partida('peso')"
      />
      <NumeroCaptura
        id="altura"
        data-campo="altura"
        v-model="altura"
        etiqueta="Altura"
        unidad="m"
        obligatorio
        step="0.01"
        :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.altura.min}-${SOMATOMETRIA_SIGNOS_RANGES.altura.max}`"
        :min="SOMATOMETRIA_SIGNOS_RANGES.altura.min"
        :max="SOMATOMETRIA_SIGNOS_RANGES.altura.max"
        :error="mensajeErrorAltura"
        :partida="partida('altura')"
      />
      <NumeroCaptura
        id="circunferenciaCintura"
        data-campo="circunferenciaCintura"
        v-model="circunferenciaCintura"
        v-model:se-desconoce="cinturaSeDesconoce"
        etiqueta="Cintura"
        unidad="cm"
        obligatorio
        con-se-desconoce
        :placeholder="`${SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.min}-${SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.max}`"
        :min="SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.min"
        :max="SOMATOMETRIA_SIGNOS_RANGES.circunferenciaCintura.max"
        :error="mensajeErrorCircunferenciaCintura"
        :partida="partida('circunferenciaCintura')"
      />
    </div>

    <!-- Lo que se calcula solo: valor grande y la categoría en una etiqueta de color sólido -->
    <div :class="['mt-4 grid gap-3', capturaRapida ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1']">
      <div
        data-campo="indiceMasaCorporal"
        data-calculado
        class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-xs text-gray-500">{{ capturaRapida ? 'Índice de masa corporal' : 'IMC' }}</p>
          <p class="text-base font-bold text-gray-900 leading-tight">{{ indiceMasaCorporal ?? '—' }}</p>
        </div>
        <span
          v-if="categoriaIMC"
          :class="['shrink-0 px-2 py-0.5 rounded-md text-sm font-medium text-white', colorCategoria(categoriaIMC)]"
        >{{ categoriaIMC }}</span>
        <span v-else class="text-xs text-gray-400">Se calcula con peso y altura</span>
      </div>
      <div
        data-calculado
        class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Riesgo por cintura</p>
          <p class="text-base font-bold text-gray-900 leading-tight">
            {{ circunferenciaCintura != null && !cinturaSeDesconoce ? `${circunferenciaCintura} cm` : '—' }}
          </p>
        </div>
        <span
          v-if="categoriaCircunferenciaCintura"
          :class="['shrink-0 px-2 py-0.5 rounded-md text-sm font-medium text-white', colorCategoria(categoriaCircunferenciaCintura)]"
        >{{ categoriaCircunferenciaCintura }}</span>
        <span v-else class="text-xs text-gray-400">Se calcula con la cintura</span>
      </div>
    </div>
  </div>
</template>
