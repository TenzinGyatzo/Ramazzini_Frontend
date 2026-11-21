<script setup>
import { ref, watch, onMounted, computed, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import CatalogsAPI from '@/api/CatalogsAPI';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA, CLASE_AYUDA, CLASE_INPUT } from '@/components/steps/captura/estiloCaptura';
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

// Punto 38, un solo diseño para los dos modos (acomodo según el modo): género en una línea y derechohabiencia en tres columnas
const capturaRapida = enCapturaRapida();

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

/** null = sin selección (placeholder); 0 = "No especificado" (valor CEX válido) */
const genero = ref(null);
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
  if (formVal !== undefined && formVal !== null) return formVal;
  if (docVal !== undefined && docVal !== null) return docVal;
  return defaultVal;
}

function normalizeGenero(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function syncFormData() {
  formDataNotaMedica.genero = genero.value;
  // Sin marca queda vacío: es obligatorio elegir (también «No especificado» o «Se ignora»)
  formDataNotaMedica.derechohabiencia =
    derechohabienciaSeleccion.value.length > 0
      ? derechohabienciaSeleccion.value.join('&')
      : null;
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
  // Sin precarga: solo restaurar valor ya guardado en el formulario/documento
  genero.value = normalizeGenero(getValFromSource('genero', null));

  // Lo guardado se muestra marcado, también «0 – No especificado» (antes se ponía solo)
  const savedDerecho = getValFromSource('derechohabiencia', null);
  const savedCodes =
    typeof savedDerecho === 'string'
      ? savedDerecho.split('&').map((c) => c.trim()).filter(Boolean)
      : [];
  derechohabienciaSeleccion.value = [...savedCodes];

  await loadAfiliacionOptions(savedCodes);

  syncFormData();
});

watch(genero, () => syncFormData());
watch(derechohabienciaSeleccion, () => syncFormData(), { deep: true });

</script>

<template>
  <div class="nota-medica-dark-inputs space-y-4">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Género y Derechohabiencia
    </h2>
    <div data-campo="genero" class="max-w-xs">
      <label for="genero" :class="[CLASE_ETIQUETA, 'mb-1']">Género <span class="text-red-500">*</span></label>
      <select id="genero" v-model="genero" :class="CLASE_INPUT">
        <option :value="null" disabled>Seleccionar</option>
        <option v-for="opt in generoOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <div data-campo="derechohabiencia">
      <p :class="CLASE_ETIQUETA">Derechohabiencia <span class="text-red-500">*</span></p>
      <p :class="[CLASE_AYUDA, 'mb-2']">
        Una o más (máx. 9). «No especificado», «Ninguna» y «Se ignora» van solas.
      </p>
      <p v-if="catalogLoading" class="text-sm text-gray-500">Cargando catálogo de afiliación…</p>
      <p v-else-if="catalogError" class="text-sm text-red-600">{{ catalogError }}</p>
      <div
        v-else
        :class="['grid gap-x-4 gap-y-1', capturaRapida ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2']"
      >
        <label
          v-for="opt in afiliacionOptions"
          :key="opt.value"
          :class="[
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors duration-150',
            derechohabienciaSeleccion.includes(opt.value)
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-gray-700 hover:bg-gray-50',
            { 'opacity-70': opt.legacy },
          ]"
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
