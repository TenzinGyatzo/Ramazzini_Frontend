<script setup>
import { vValorDePartida } from '@/directives/valorDePartida';
import { useValorDePartida } from '@/composables/useValorDePartida';
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import {
  NOTA_MEDICA_CEX_RANGES,
  isBlankOrZero,
  isExplicitCexUnknown,
  parseOptionalNumber,
  mensajeErrorCexField,
} from '@/helpers/notaMedicaCexRanges';

import { useAutofocoPrimerVacio } from '@/composables/useAutofocoPrimerVacio';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import NumeroCaptura from '@/components/steps/captura/NumeroCaptura.vue';
import { CLASE_AYUDA, CLASE_ETIQUETA } from '@/components/steps/captura/estiloCaptura';

// Punto 38, un solo diseño para los dos modos (acomodo según el modo): peso, talla y cintura en una fila; IMC y categorías como resultado
const capturaRapida = enCapturaRapida();
/** Color sólido de la categoría: verde normal, ámbar a vigilar, rojo de riesgo. */
function colorCategoria(categoria) {
  if (categoria === 'Normal') return 'bg-emerald-600';
  if (categoria === 'Bajo peso' || categoria === 'Sobrepeso' || categoria === 'Riesgo elevado') return 'bg-amber-600';
  if (categoria === 'Obesidad clase III') return 'bg-red-800';
  if (categoria === 'Obesidad clase II') return 'bg-red-700';
  return 'bg-red-600';
}

// Al abrir el paso, el cursor va al primer dato vacío (los marcados «Se desconoce» se saltan)
useAutofocoPrimerVacio(['peso', 'talla', 'circunferenciaCintura']);

const partida = useValorDePartida();
const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();

const peso = ref(null);
const talla = ref(null);
const circunferenciaCintura = ref(null);
const indiceMasaCorporal = ref(null);
const categoriaIMC = ref('');
const categoriaCircunferenciaCintura = ref('');

const seDesconocePeso = ref(false);
const seDesconoceTalla = ref(false);
const seDesconoceCircunferencia = ref(false);

function getValFromSource(field) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined && formVal !== null) return formVal;
  if (docVal !== undefined && docVal !== null) return docVal;
  return undefined;
}

function resolveInitial(field, saved) {
  if (saved === undefined || saved === null || saved === '') {
    if (documentos.currentDocument) {
      return { seDesconoce: true, display: null };
    }
    return { seDesconoce: false, display: null };
  }
  if (isExplicitCexUnknown(field, saved)) {
    return { seDesconoce: true, display: null };
  }
  return { seDesconoce: false, display: Number(saved) };
}

function toPersistedValue(field, seDesconoce, display) {
  if (seDesconoce) return null;
  if (isBlankOrZero(display)) return null;
  return Number(display);
}

function calcularIMC() {
  if (seDesconocePeso.value || seDesconoceTalla.value) {
    indiceMasaCorporal.value = null;
    categoriaIMC.value = '';
    return;
  }
  const p = Number(peso.value);
  const t = Number(talla.value);
  if (
    Number.isFinite(p) &&
    Number.isFinite(t) &&
    p >= ranges.peso.min &&
    p <= ranges.peso.max &&
    t >= ranges.talla.min &&
    t <= ranges.talla.max
  ) {
    const tallaMt = t / 100;
    const imc = p / (tallaMt ** 2);
    indiceMasaCorporal.value = Math.round(imc * 100) / 100;
    setCategoriaIMC(indiceMasaCorporal.value);
  } else {
    indiceMasaCorporal.value = null;
    categoriaIMC.value = '';
  }
}

function setCategoriaIMC(imc) {
  if (imc == null) { categoriaIMC.value = ''; return; }
  if (imc < 18.5) categoriaIMC.value = 'Bajo peso';
  else if (imc <= 24.99) categoriaIMC.value = 'Normal';
  else if (imc <= 29.99) categoriaIMC.value = 'Sobrepeso';
  else if (imc <= 34.99) categoriaIMC.value = 'Obesidad clase I';
  else if (imc <= 39.99) categoriaIMC.value = 'Obesidad clase II';
  else categoriaIMC.value = 'Obesidad clase III';
}

/**
 * Umbral clínico para riesgo por cintura.
 * Femenino → cortes mujer; Masculino / Intersexual / no definido → cortes hombre
 * (mismo criterio que ESC: no-femenino usa umbral masculino).
 */
function usaUmbralCinturaFemenino() {
  const sexo = String(trabajadores.currentTrabajador?.sexo ?? '')
    .trim()
    .toLowerCase();
  if (sexo === 'femenino' || sexo === 'mujer' || sexo === 'f') return true;
  if (
    sexo === 'masculino' ||
    sexo === 'hombre' ||
    sexo === 'm' ||
    sexo === 'h' ||
    sexo === 'intersexual'
  ) {
    return false;
  }

  // Fallback: género CEX (2=Femenino; resto incl. 6=Intersexual → umbral masculino)
  const genero = Number(formDataNotaMedica.genero);
  if (genero === 2) return true;
  return false;
}

function setCategoriaCircunferencia() {
  if (seDesconoceCircunferencia.value) {
    categoriaCircunferenciaCintura.value = '';
    return;
  }
  const c = Number(circunferenciaCintura.value);
  if (!Number.isFinite(c) || c <= 0) {
    categoriaCircunferenciaCintura.value = '';
    return;
  }

  if (usaUmbralCinturaFemenino()) {
    if (c <= 80) categoriaCircunferenciaCintura.value = 'Normal';
    else if (c <= 88) categoriaCircunferenciaCintura.value = 'Riesgo elevado';
    else categoriaCircunferenciaCintura.value = 'Riesgo muy elevado';
  } else {
    if (c <= 90) categoriaCircunferenciaCintura.value = 'Normal';
    else if (c <= 100) categoriaCircunferenciaCintura.value = 'Riesgo elevado';
    else categoriaCircunferenciaCintura.value = 'Riesgo muy elevado';
  }
}

function syncFormData() {
  formDataNotaMedica.peso = toPersistedValue('peso', seDesconocePeso.value, peso.value);
  formDataNotaMedica.talla = toPersistedValue('talla', seDesconoceTalla.value, talla.value);
  // Peso y talla son obligatorios: valor o «Se desconoce» marcado (al enviar se vuelve 999)
  formDataNotaMedica.pesoSeDesconoce = seDesconocePeso.value;
  formDataNotaMedica.tallaSeDesconoce = seDesconoceTalla.value;
  // La cintura también es obligatoria: valor o «Se desconoce» marcado (al enviar se vuelve 0)
  formDataNotaMedica.circunferenciaCinturaSeDesconoce = seDesconoceCircunferencia.value;
  formDataNotaMedica.circunferenciaCintura = toPersistedValue(
    'circunferenciaCintura',
    seDesconoceCircunferencia.value,
    circunferenciaCintura.value,
  );
  formDataNotaMedica.indiceMasaCorporal = indiceMasaCorporal.value;
  formDataNotaMedica.categoriaIMC = categoriaIMC.value;
  formDataNotaMedica.categoriaCircunferenciaCintura = categoriaCircunferenciaCintura.value;
}

onMounted(() => {
  const initPeso = resolveInitial('peso', getValFromSource('peso'));
  const initTalla = resolveInitial('talla', getValFromSource('talla'));
  const initCintura = resolveInitial(
    'circunferenciaCintura',
    getValFromSource('circunferenciaCintura'),
  );

  seDesconocePeso.value = initPeso.seDesconoce;
  seDesconoceTalla.value = initTalla.seDesconoce;
  seDesconoceCircunferencia.value = initCintura.seDesconoce;
  peso.value = initPeso.display;
  talla.value = initTalla.display;
  circunferenciaCintura.value = initCintura.display;

  const savedIMC = getValFromSource('indiceMasaCorporal');
  const savedCatIMC = getValFromSource('categoriaIMC');

  if (savedIMC != null && !seDesconocePeso.value && !seDesconoceTalla.value) {
    indiceMasaCorporal.value = savedIMC;
    categoriaIMC.value = savedCatIMC || '';
    if (!categoriaIMC.value) setCategoriaIMC(savedIMC);
  } else {
    calcularIMC();
  }
  setCategoriaCircunferencia();

  syncFormData();
});

watch(seDesconocePeso, (v) => {
  if (v) peso.value = null;
  calcularIMC();
  syncFormData();
});
watch(seDesconoceTalla, (v) => {
  if (v) talla.value = null;
  calcularIMC();
  syncFormData();
});
watch(seDesconoceCircunferencia, (v) => {
  if (v) circunferenciaCintura.value = null;
  setCategoriaCircunferencia();
  syncFormData();
});

watch([peso, talla], () => {
  calcularIMC();
  syncFormData();
});

watch(circunferenciaCintura, () => {
  setCategoriaCircunferencia();
  syncFormData();
});

// Recalcular si llega sexo/género después (p. ej. intersexual / carga async)
watch(
  () => [
    trabajadores.currentTrabajador?.sexo,
    formDataNotaMedica.genero,
    seDesconoceCircunferencia.value,
    circunferenciaCintura.value,
  ],
  () => {
    setCategoriaCircunferencia();
    syncFormData();
  },
);

const mensajeErrorPeso = computed(() =>
  mensajeErrorCexField('peso', peso.value, seDesconocePeso.value),
);

const mensajeErrorTalla = computed(() =>
  mensajeErrorCexField('talla', talla.value, seDesconoceTalla.value),
);

const mensajeErrorCircunferencia = computed(() =>
  mensajeErrorCexField(
    'circunferenciaCintura',
    circunferenciaCintura.value,
    seDesconoceCircunferencia.value,
  ),
);

const ranges = NOTA_MEDICA_CEX_RANGES;
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Somatometría
    </h2>
    <p :class="[CLASE_AYUDA, 'mb-3']">Marque «Se desconoce» si no se registró el dato.</p>
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
        v-model:se-desconoce="seDesconocePeso"
        etiqueta="Peso"
        unidad="kg"
        obligatorio
        con-se-desconoce
        step="0.001"
        placeholder="1-400"
        :min="ranges.peso.min"
        :max="ranges.peso.max"
        :error="mensajeErrorPeso"
        :partida="partida('peso')"
      />
      <NumeroCaptura
        id="talla"
        data-campo="talla"
        v-model="talla"
        v-model:se-desconoce="seDesconoceTalla"
        etiqueta="Talla"
        unidad="cm"
        obligatorio
        con-se-desconoce
        placeholder="30-220"
        :min="ranges.talla.min"
        :max="ranges.talla.max"
        :error="mensajeErrorTalla"
        :partida="partida('tallaCm')"
      />
      <NumeroCaptura
        id="circunferenciaCintura"
        data-campo="circunferenciaCintura"
        v-model="circunferenciaCintura"
        v-model:se-desconoce="seDesconoceCircunferencia"
        etiqueta="Cintura"
        unidad="cm"
        obligatorio
        con-se-desconoce
        placeholder="20-300"
        :min="ranges.circunferenciaCintura.min"
        :max="ranges.circunferenciaCintura.max"
        :error="mensajeErrorCircunferencia"
        :partida="partida('circunferenciaCintura')"
      />
    </div>

    <!-- Lo que se calcula solo: valor grande y la categoría en una etiqueta de color sólido -->
    <div :class="['mt-4 grid gap-3', capturaRapida ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1']">
      <div
        data-calculado
        class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-xs text-gray-500">{{ capturaRapida ? 'Índice de masa corporal' : 'IMC' }}</p>
          <p class="text-base font-bold text-gray-900 leading-tight">{{ indiceMasaCorporal ?? '—' }}</p>
        </div>
        <span
          v-if="categoriaIMC"
          :class="['shrink-0 px-2.5 py-1 rounded-md text-sm font-semibold text-white', colorCategoria(categoriaIMC)]"
        >{{ categoriaIMC }}</span>
        <span v-else class="text-xs text-gray-400">Se calcula con peso y talla</span>
      </div>
      <div
        data-calculado
        class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="text-xs text-gray-500">Riesgo por cintura</p>
          <p class="text-base font-bold text-gray-900 leading-tight">
            {{ circunferenciaCintura != null && !seDesconoceCircunferencia ? `${circunferenciaCintura} cm` : '—' }}
          </p>
        </div>
        <span
          v-if="categoriaCircunferenciaCintura"
          :class="['shrink-0 px-2.5 py-1 rounded-md text-sm font-semibold text-white', colorCategoria(categoriaCircunferenciaCintura)]"
        >{{ categoriaCircunferenciaCintura }}</span>
        <span v-else class="text-xs text-gray-400">Se calcula con la cintura</span>
      </div>
    </div>
  </div>
</template>
