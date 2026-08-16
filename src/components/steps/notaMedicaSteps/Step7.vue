<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import {
  NOTA_MEDICA_CEX_RANGES,
  NOTA_MEDICA_CEX_SENTINEL,
  isBlankOrZero,
  isExplicitCexUnknown,
  parseOptionalNumber,
  mensajeErrorCexField,
} from '@/helpers/notaMedicaCexRanges';

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
  if (seDesconoce) return NOTA_MEDICA_CEX_SENTINEL[field];
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
  if (Number.isFinite(p) && Number.isFinite(t) && p > 0 && t > 0) {
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
  formDataNotaMedica.circunferenciaCintura = toPersistedValue(
    'circunferenciaCintura',
    seDesconoceCircunferencia.value,
    circunferenciaCintura.value,
  );
  formDataNotaMedica.indiceMasaCorporal = indiceMasaCorporal.value;
  formDataNotaMedica.categoriaIMC = categoriaIMC.value;
  formDataNotaMedica.categoriaCircunferenciaCintura = categoriaCircunferenciaCintura.value;
}

function finalizeEmptyAsUnknown() {
  if (!seDesconocePeso.value && isBlankOrZero(peso.value)) {
    seDesconocePeso.value = true;
    peso.value = null;
  }
  if (!seDesconoceTalla.value && isBlankOrZero(talla.value)) {
    seDesconoceTalla.value = true;
    talla.value = null;
  }
  if (!seDesconoceCircunferencia.value && isBlankOrZero(circunferenciaCintura.value)) {
    seDesconoceCircunferencia.value = true;
    circunferenciaCintura.value = null;
  }
  calcularIMC();
  setCategoriaCircunferencia();
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

onUnmounted(() => {
  finalizeEmptyAsUnknown();
  syncFormData();
});

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
    <p
      v-if="variant !== 'compact'"
      class="text-sm text-gray-600 mb-4"
    >
      Marque "Se desconoce" si no se registró el dato.
    </p>
    <p
      v-else
      class="text-xs text-gray-600 mb-2"
    >
      Marque "Se desconoce" si no se registró el dato.
    </p>

    <div class="flex gap-4 mb-4 flex-wrap">
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="peso">Peso (kg) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="peso"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="peso ?? ''"
            @input="peso = parseOptionalNumber($event.target.value)"
            :min="ranges.peso.min"
            :max="ranges.peso.max"
            step="0.001"
            placeholder="1-400"
            :disabled="seDesconocePeso"
          />
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconocePeso" class="rounded" />
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorPeso" class="text-red-500 text-sm mt-1">{{ mensajeErrorPeso }}</p>
      </div>

      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="talla">Talla (cm) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="talla"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="talla ?? ''"
            @input="talla = parseOptionalNumber($event.target.value)"
            :min="ranges.talla.min"
            :max="ranges.talla.max"
            step="1"
            placeholder="30-220"
            :disabled="seDesconoceTalla"
          />
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceTalla" class="rounded" />
            Se desconoce
          </label>
        </div>
        <p v-if="mensajeErrorTalla" class="text-red-500 text-sm mt-1">{{ mensajeErrorTalla }}</p>
      </div>
    </div>

    <div class="mb-4">
      <label class="block text-base font-medium text-gray-800 mb-2">Índice de Masa Corporal</label>
      <div class="grid grid-cols-2 gap-4">
        <input
          type="number"
          class="w-full p-2 text-center border border-gray-200 rounded-lg text-gray-700 bg-gray-50 cursor-not-allowed font-semibold"
          :value="indiceMasaCorporal"
          readonly
          title="Calculado automáticamente"
        />
        <input
          type="text"
          :class="[
            'w-full py-2 px-2 text-center border border-gray-200 rounded-lg cursor-not-allowed font-semibold',
            categoriaIMC === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
            categoriaIMC === 'Bajo peso' ? 'bg-yellow-50 text-yellow-800' : '',
            categoriaIMC === 'Sobrepeso' ? 'bg-yellow-50 text-yellow-800' : '',
            categoriaIMC === 'Obesidad clase I' ? 'bg-red-50 text-red-900' : '',
            categoriaIMC === 'Obesidad clase II' ? 'bg-red-100 text-red-900' : '',
            categoriaIMC === 'Obesidad clase III' ? 'bg-red-200 text-red-950' : '',
          ]"
          :value="categoriaIMC"
          readonly
        />
      </div>
    </div>

    <div class="mb-4">
      <label>Circunferencia de Cintura (cm) <span class="text-red-500">*</span></label>
      <div class="grid grid-cols-2 gap-4 mt-1">
        <div>
          <input
            type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :value="circunferenciaCintura ?? ''"
            @input="circunferenciaCintura = parseOptionalNumber($event.target.value)"
            :min="ranges.circunferenciaCintura.min"
            :max="ranges.circunferenciaCintura.max"
            step="1"
            placeholder="20-300"
            :disabled="seDesconoceCircunferencia"
          />
          <label class="flex items-center gap-1.5 text-sm mt-1">
            <input type="checkbox" v-model="seDesconoceCircunferencia" class="rounded" />
            Se desconoce
          </label>
          <p v-if="mensajeErrorCircunferencia" class="text-red-500 text-sm mt-1">{{ mensajeErrorCircunferencia }}</p>
        </div>
        <input
          type="text"
          :class="[
            'h-10 w-full py-1.5 px-2 text-center border border-gray-200 rounded-lg cursor-not-allowed font-semibold',
            categoriaCircunferenciaCintura === 'Normal' ? 'bg-emerald-50 text-emerald-800' : '',
            categoriaCircunferenciaCintura === 'Riesgo elevado' ? 'bg-yellow-50 text-yellow-800' : '',
            categoriaCircunferenciaCintura === 'Riesgo muy elevado' ? 'bg-red-100 text-red-900' : '',
          ]"
          :value="categoriaCircunferenciaCintura"
          readonly
        />
      </div>
    </div>
  </div>
</template>
