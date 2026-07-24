<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import CatalogsAPI from '@/api/CatalogsAPI';
import {
  esExclusivoPorEtiqueta,
  aplicarCambioDerechohabiencia,
} from '@/helpers/afiliacionCex';

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

const genero = ref(0);
const derechohabienciaSeleccion = ref([]);
const afiliacionOptions = ref([]);
const catalogLoading = ref(false);
const catalogError = ref(null);

const generoOptions = [
  { value: 0, label: 'No especificado' },
  { value: 1, label: 'Masculino' },
  { value: 2, label: 'Femenino' },
  { value: 3, label: 'Transgénero' },
  { value: 4, label: 'Transexual' },
  { value: 5, label: 'Travesti' },
  { value: 6, label: 'Intersexual' },
  { value: 88, label: 'Otro' },
];

const optionsByCode = computed(() => {
  const map = new Map();
  for (const opt of afiliacionOptions.value) {
    map.set(opt.value, opt);
  }
  return map;
});

function getValFromSource(field, defaultVal) {
  const formVal = formDataNotaMedica[field];
  const docVal = documentos.currentDocument?.[field];
  if (formVal !== undefined) return formVal;
  if (docVal !== undefined) return docVal;
  return defaultVal;
}

function syncFormData() {
  formDataNotaMedica.genero = genero.value;
  formDataNotaMedica.derechohabiencia =
    derechohabienciaSeleccion.value.length > 0
      ? derechohabienciaSeleccion.value.join('&')
      : '0';
}

function handleDerechohabienciaChange(clickedValue) {
  derechohabienciaSeleccion.value = aplicarCambioDerechohabiencia({
    selected: [...derechohabienciaSeleccion.value],
    clickedCode: clickedValue,
    optionsByCode: optionsByCode.value,
  });
}

function mapCatalogEntry(entry, { legacy = false } = {}) {
  const label = entry.description || entry.code;
  return {
    value: String(entry.code),
    label,
    exclusive: esExclusivoPorEtiqueta(label),
    vigente: entry.vigente !== false,
    legacy,
  };
}

async function loadAfiliacionOptions(savedCodes) {
  catalogLoading.value = true;
  catalogError.value = null;
  try {
    const [vigentesRes, allRes] = await Promise.all([
      CatalogsAPI.listCatalog('cat_afiliacion', 500, true),
      CatalogsAPI.listCatalog('cat_afiliacion', 500, false),
    ]);
    const vigentes = Array.isArray(vigentesRes.data) ? vigentesRes.data : [];
    const all = Array.isArray(allRes.data) ? allRes.data : [];
    const labelByCode = Object.fromEntries(
      all.map((e) => [String(e.code), e.description || e.code]),
    );
    const allByCode = Object.fromEntries(
      all.map((e) => [String(e.code), e]),
    );

    const options = vigentes.map((e) => mapCatalogEntry(e));
    const vigenteCodes = new Set(options.map((o) => o.value));

    for (const code of savedCodes) {
      if (!vigenteCodes.has(code)) {
        const entry = allByCode[code] || {
          code,
          description: labelByCode[code] || code,
          vigente: false,
        };
        options.push(mapCatalogEntry(entry, { legacy: true }));
      }
    }

    afiliacionOptions.value = options;
  } catch (err) {
    catalogError.value =
      err?.response?.data?.message ||
      err?.message ||
      'No se pudo cargar el catálogo de afiliación';
    afiliacionOptions.value = [];
  } finally {
    catalogLoading.value = false;
  }
}

onMounted(async () => {
  const sexo = trabajadores.currentTrabajador?.sexo;
  const defaultGenero = sexo === 'Masculino' ? 1 : sexo === 'Femenino' ? 2 : 0;

  const savedGenero = getValFromSource('genero', defaultGenero);
  genero.value = savedGenero;

  const savedDerecho = getValFromSource('derechohabiencia', '0');
  let savedCodes = [];
  if (typeof savedDerecho === 'string' && savedDerecho !== '0') {
    savedCodes = savedDerecho.split('&').filter(Boolean);
  } else if (savedDerecho === '0') {
    savedCodes = [];
  }
  derechohabienciaSeleccion.value = [...savedCodes];

  await loadAfiliacionOptions(savedCodes);

  // Si el default vacío debe ser "0" y existe esa opción vigente, no forzar selección
  syncFormData();
});

watch(genero, () => syncFormData());
watch(derechohabienciaSeleccion, () => syncFormData(), { deep: true });

onUnmounted(() => {
  syncFormData();
});
</script>

<template>
  <div>
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Género y Derechohabiencia
    </h2>
    <p
      v-else
      class="text-sm font-semibold text-gray-800 mb-2"
    >
      Género y derechohabiencia
    </p>

    <div :class="variant === 'compact' ? 'mb-4' : 'mb-6'">
      <label for="genero" class="block text-base font-medium text-gray-800 mb-2">
        Género <span class="text-red-500">*</span>
      </label>
      <select
        id="genero"
        v-model="genero"
        class="w-full p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      >
        <option v-for="opt in generoOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div class="mb-4">
      <label class="block text-base font-medium text-gray-800 mb-2">
        Derechohabiencia <span class="text-red-500">*</span>
      </label>
      <p class="text-sm text-gray-600 mb-3">
        Seleccione una o más opciones (máx. 9). Las opciones “No especificado”, “Ninguna” y “Se ignora” (según etiqueta del catálogo) son exclusivas.
      </p>

      <p v-if="catalogLoading" class="text-sm text-gray-500 mb-2">Cargando catálogo de afiliación…</p>
      <p v-else-if="catalogError" class="text-sm text-red-600 mb-2">{{ catalogError }}</p>

      <div v-else class="grid grid-cols-2 gap-2">
        <label
          v-for="opt in afiliacionOptions"
          :key="opt.value"
          class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer text-sm"
          :class="{ 'opacity-70': opt.legacy }"
        >
          <input
            type="checkbox"
            :value="opt.value"
            v-model="derechohabienciaSeleccion"
            class="rounded text-emerald-600 focus:ring-emerald-500"
            @change="handleDerechohabienciaChange(opt.value)"
          />
          <span>
            {{ opt.label }}
            <span v-if="opt.legacy" class="text-xs text-amber-700">(ya no vigente)</span>
          </span>
        </label>
      </div>
    </div>
  </div>
</template>
