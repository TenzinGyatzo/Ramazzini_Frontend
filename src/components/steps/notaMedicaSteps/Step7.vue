<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';

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

const peso = ref(70);
const talla = ref(170);
const circunferenciaCintura = ref(80);
const indiceMasaCorporal = ref(null);
const categoriaIMC = ref('');
const categoriaCircunferenciaCintura = ref('');

const seDesconocePeso = ref(false);
const seDesconoceTalla = ref(false);
const seDesconoceCircunferencia = ref(false);

function getValFromSource(field, defaultVal) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined) return formVal;
  if (docVal !== undefined) return docVal;
  return defaultVal;
}

function calcularIMC() {
  if (seDesconocePeso.value || seDesconoceTalla.value) {
    indiceMasaCorporal.value = null;
    categoriaIMC.value = '';
    return;
  }
  const p = Number(peso.value);
  const t = Number(talla.value);
  if (p > 0 && t > 0) {
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

function esFemenino() {
  const genero = formDataNotaMedica.genero;
  if (genero === 2) return true;
  if (genero === 1) return false;
  const sexo = trabajadores.currentTrabajador?.sexo;
  if (sexo === 'Femenino') return true;
  if (sexo === 'Masculino') return false;
  return null;
}

function setCategoriaCircunferencia() {
  if (seDesconoceCircunferencia.value) { categoriaCircunferenciaCintura.value = ''; return; }
  const c = Number(circunferenciaCintura.value);
  const fem = esFemenino();
  if (fem === true) {
    if (c <= 80) categoriaCircunferenciaCintura.value = 'Normal';
    else if (c <= 88) categoriaCircunferenciaCintura.value = 'Riesgo elevado';
    else categoriaCircunferenciaCintura.value = 'Riesgo muy elevado';
  } else if (fem === false) {
    if (c <= 90) categoriaCircunferenciaCintura.value = 'Normal';
    else if (c <= 100) categoriaCircunferenciaCintura.value = 'Riesgo elevado';
    else categoriaCircunferenciaCintura.value = 'Riesgo muy elevado';
  } else {
    categoriaCircunferenciaCintura.value = '';
  }
}

function syncFormData() {
  // CEX: "Se desconoce" → null (validador skipea; transformer mapea peso/talla→999, circunferencia→0)
  formDataNotaMedica.peso = seDesconocePeso.value ? null : peso.value;
  formDataNotaMedica.talla = seDesconoceTalla.value ? null : talla.value;
  formDataNotaMedica.circunferenciaCintura = seDesconoceCircunferencia.value ? null : circunferenciaCintura.value;
  formDataNotaMedica.indiceMasaCorporal = indiceMasaCorporal.value;
  formDataNotaMedica.categoriaIMC = categoriaIMC.value;
  formDataNotaMedica.categoriaCircunferenciaCintura = categoriaCircunferenciaCintura.value;
}

onMounted(() => {
  const savedPeso = getValFromSource('peso', 70);
  const savedTalla = getValFromSource('talla', 170);
  const savedCintura = getValFromSource('circunferenciaCintura', 80);

  // null/999/0 = "Se desconoce" (retrocompatibilidad con docs guardados antes)
  seDesconocePeso.value = savedPeso == null || savedPeso === 999;
  seDesconoceTalla.value = savedTalla == null || savedTalla === 999;
  seDesconoceCircunferencia.value = savedCintura == null || savedCintura === 0;

  // Input muestra 0 cuando "Se desconoce"
  peso.value = seDesconocePeso.value ? 0 : savedPeso;
  talla.value = seDesconoceTalla.value ? 0 : savedTalla;
  circunferenciaCintura.value = seDesconoceCircunferencia.value ? 0 : savedCintura;

  const savedIMC = getValFromSource('indiceMasaCorporal', null);
  const savedCatIMC = getValFromSource('categoriaIMC', '');
  const savedCatCintura = getValFromSource('categoriaCircunferenciaCintura', '');

  if (savedIMC != null) {
    indiceMasaCorporal.value = savedIMC;
    categoriaIMC.value = savedCatIMC;
    categoriaCircunferenciaCintura.value = savedCatCintura;
  } else {
    calcularIMC();
    setCategoriaCircunferencia();
  }

  syncFormData();
});

watch(seDesconocePeso, (v) => {
  if (v) peso.value = 0;
  else peso.value = peso.value || 70;
  calcularIMC();
  syncFormData();
});
watch(seDesconoceTalla, (v) => {
  if (v) talla.value = 0;
  else talla.value = talla.value || 170;
  calcularIMC();
  syncFormData();
});
watch(seDesconoceCircunferencia, (v) => {
  if (v) circunferenciaCintura.value = 0;
  else circunferenciaCintura.value = circunferenciaCintura.value || 80;
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

onUnmounted(() => {
  syncFormData();
});

const mensajeErrorPeso = computed(() => {
  if (seDesconocePeso.value) return '';
  const v = Number(peso.value);
  if (v < 1) return 'CEX: mínimo 1 kg';
  if (v > 400) return 'CEX: máximo 400 kg';
  return '';
});

const mensajeErrorTalla = computed(() => {
  if (seDesconoceTalla.value) return '';
  const v = Number(talla.value);
  if (v < 30) return 'CEX: mínimo 30 cm';
  if (v > 220) return 'CEX: máximo 220 cm';
  return '';
});

const mensajeErrorCircunferencia = computed(() => {
  if (seDesconoceCircunferencia.value) return '';
  const v = Number(circunferenciaCintura.value);
  if (v < 20) return 'CEX: mínimo 20 cm';
  if (v > 300) return 'CEX: máximo 300 cm';
  return '';
});
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
      <!-- Peso -->
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="peso">Peso (kg) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="peso"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model.number="peso"
            :min="1"
            :max="400"
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

      <!-- Talla -->
      <div class="w-full sm:w-[calc(50%-0.5rem)]">
        <label for="talla">Talla (cm) <span class="text-red-500">*</span></label>
        <div class="mt-1">
          <input
            type="number"
            id="talla"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model.number="talla"
            :min="30"
            :max="220"
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

    <!-- IMC -->
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

    <!-- Circunferencia de Cintura -->
    <div class="mb-4">
      <label>Circunferencia de Cintura (cm) <span class="text-red-500">*</span></label>
      <div class="grid grid-cols-2 gap-4 mt-1">
        <div>
          <input
            type="number"
            class="w-full p-1.5 text-center border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            v-model.number="circunferenciaCintura"
            :min="20"
            :max="300"
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
