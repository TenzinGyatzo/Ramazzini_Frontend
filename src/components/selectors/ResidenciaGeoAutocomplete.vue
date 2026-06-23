<script setup>
import { ref, watch, computed, inject } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import EstadoAutocomplete from './EstadoAutocomplete.vue';
import { useCatalogSearchInput } from '@/helpers/catalogSearchInput';
import { useCatalogListKeyboard } from '@/helpers/useCatalogListKeyboard';
import {
  getMunicipioDisplayCode,
  sortMunicipiosByCode,
} from '@/helpers/geoCatalogSort';
import {
  getGiisGeoForMunicipioResidencia,
  getLocalidadSentinelForEntidad,
  getMunicipioSentinelForEntidad,
  isEntidadResidenciaEspecial,
} from '@/helpers/giisResidenciaGeo';
import {
  buildLocalidadSentinelOption,
  buildMunicipioSentinelOption,
  getResidenciaUiState,
  isLocalidadGiisSentinel,
  isMunicipioGiisSentinel,
} from '@/helpers/residenciaGeoRules';

const { catalogSearchInputAttrs: municipioInputAttrs } = useCatalogSearchInput();
const { catalogSearchInputAttrs: localidadInputAttrs } = useCatalogSearchInput();

const props = defineProps({
  estadoResidencia: {
    type: String,
    default: '',
  },
  municipioResidencia: {
    type: String,
    default: '',
  },
  localidadResidencia: {
    type: String,
    default: '',
  },
  paisResidencia: {
    type: [String, Number],
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'update:estadoResidencia',
  'update:municipioResidencia',
  'update:localidadResidencia',
]);

const municipioQuery = ref('');
const municipioResults = ref([]);
const municipioLoading = ref(false);
const municipioShowResults = ref(false);
const municipioSelected = ref(null);

const localidadQuery = ref('');
const localidadResults = ref([]);
const localidadLoading = ref(false);
const localidadShowResults = ref(false);
const localidadSelected = ref(null);

const municipiosDisponibles = ref([]);
const municipioHasBlurred = ref(false);
const localidadHasBlurred = ref(false);

const formSubmitAttempted = inject('formSubmitAttempted', ref(false));

const residenciaFields = computed(() => ({
  paisResidencia: props.paisResidencia,
  entidadResidencia: props.estadoResidencia,
  municipioResidencia: props.municipioResidencia,
  localidadResidencia: props.localidadResidencia,
}));

const uiState = computed(() => getResidenciaUiState(residenciaFields.value));

const municipioLocked = computed(() => uiState.value.municipio.locked);
const localidadLocked = computed(() => uiState.value.localidad.locked);

const showMunicipioRequiredError = computed(() => {
  const isEmpty =
    !props.municipioResidencia || props.municipioResidencia.trim() === '';
  return (
    props.required &&
    isEmpty &&
    (municipioHasBlurred.value || formSubmitAttempted.value) &&
    municipioEnabled.value
  );
});

const showLocalidadRequiredError = computed(() => {
  const isEmpty =
    !props.localidadResidencia || props.localidadResidencia.trim() === '';
  return (
    props.required &&
    isEmpty &&
    (localidadHasBlurred.value || formSubmitAttempted.value) &&
    localidadEnabled.value
  );
});

let municipioDebounceTimer = null;
let localidadDebounceTimer = null;

const buildMunicipioSentinels = () =>
  uiState.value.municipio.sentinelCodes.map((code) =>
    buildMunicipioSentinelOption(code),
  );

const buildLocalidadSentinels = () =>
  uiState.value.localidad.sentinelCodes.map((code) =>
    buildLocalidadSentinelOption(code),
  );

const resolveMunicipioSentinel = (estadoCode, municipioCode) => {
  if (isEntidadResidenciaEspecial(estadoCode)) {
    return getMunicipioSentinelForEntidad(estadoCode);
  }
  if (isMunicipioGiisSentinel(municipioCode)) {
    return buildMunicipioSentinelOption(municipioCode);
  }
  return null;
};

const resolveLocalidadSentinel = (estadoCode, municipioCode, localidadCode) => {
  if (isEntidadResidenciaEspecial(estadoCode)) {
    return getLocalidadSentinelForEntidad(estadoCode);
  }
  const munGeo = getGiisGeoForMunicipioResidencia(municipioCode);
  if (munGeo && localidadCode === munGeo.localidad) {
    return buildLocalidadSentinelOption(localidadCode);
  }
  if (isLocalidadGiisSentinel(localidadCode)) {
    return buildLocalidadSentinelOption(localidadCode);
  }
  return null;
};

const syncLockedMunicipioDisplay = () => {
  if (!municipioLocked.value || !props.municipioResidencia) return;
  const sentinel = resolveMunicipioSentinel(
    props.estadoResidencia,
    props.municipioResidencia,
  );
  if (sentinel) {
    municipioSelected.value = sentinel;
    municipioQuery.value = `${sentinel.description} (${sentinel.code})`;
  }
};

const syncLockedLocalidadDisplay = () => {
  if (!localidadLocked.value || !props.localidadResidencia) return;
  const sentinel = resolveLocalidadSentinel(
    props.estadoResidencia,
    props.municipioResidencia,
    props.localidadResidencia,
  );
  if (sentinel) {
    localidadSelected.value = sentinel;
    localidadQuery.value = `${sentinel.description} (${sentinel.code})`;
  }
};

// Cargar municipios cuando se selecciona un estado
const loadMunicipiosForEstado = async (estadoCode) => {
  if (!estadoCode || isEntidadResidenciaEspecial(estadoCode)) {
    municipiosDisponibles.value = [];
    return;
  }

  try {
    const { data } = await CatalogsAPI.getMunicipios(estadoCode);
    municipiosDisponibles.value = sortMunicipiosByCode(data || []);
  } catch (err) {
    console.error('Error al cargar municipios:', err);
    municipiosDisponibles.value = [];
  }
};

const loadAllMunicipios = async () => {
  if (!props.estadoResidencia || municipioLocked.value) {
    if (municipioLocked.value) {
      municipioResults.value = [
        resolveMunicipioSentinel(
          props.estadoResidencia,
          props.municipioResidencia,
        ) || buildMunicipioSentinelOption(uiState.value.municipio.forcedValue),
      ].filter(Boolean);
    }
    return;
  }

  municipioLoading.value = true;
  try {
    const { data } = await CatalogsAPI.getMunicipios(props.estadoResidencia);
    municipioResults.value = [
      ...buildMunicipioSentinels(),
      ...sortMunicipiosByCode(data || []),
    ];
    municipioShowResults.value = true;
  } catch (err) {
    console.error('Error al cargar municipios:', err);
    municipioResults.value = [];
  } finally {
    municipioLoading.value = false;
  }
};

const loadAllLocalidades = async () => {
  if (!props.estadoResidencia || !props.municipioResidencia) {
    localidadResults.value = [];
    return;
  }

  if (localidadLocked.value) {
    const munGeo = getGiisGeoForMunicipioResidencia(props.municipioResidencia);
    const forcedCode =
      uiState.value.localidad.forcedValue ||
      munGeo?.localidad ||
      props.localidadResidencia;
    localidadResults.value = [buildLocalidadSentinelOption(forcedCode)];
    localidadShowResults.value = false;
    syncLockedLocalidadDisplay();
    return;
  }

  localidadLoading.value = true;
  try {
    const { data } = await CatalogsAPI.getLocalidades(
      props.estadoResidencia,
      props.municipioResidencia,
    );
    localidadResults.value = [
      ...buildLocalidadSentinels(),
      ...(data || []),
    ];
    localidadShowResults.value = true;
  } catch (err) {
    console.error('Error al cargar localidades:', err);
    localidadResults.value = [];
  } finally {
    localidadLoading.value = false;
  }
};

const loadLocalidadesForMunicipio = async (estadoCode, municipioCode) => {
  if (
    !estadoCode ||
    !municipioCode ||
    isEntidadResidenciaEspecial(estadoCode) ||
    isMunicipioGiisSentinel(municipioCode)
  ) {
    return;
  }

  try {
    await CatalogsAPI.getLocalidades(estadoCode, municipioCode);
  } catch (err) {
    console.error('Error al cargar localidades:', err);
  }
};

const searchMunicipio = async (query) => {
  if (!props.estadoResidencia || municipioLocked.value) {
    syncLockedMunicipioDisplay();
    return;
  }

  if (!query || query.length < 2) {
    await loadAllMunicipios();
    return;
  }

  municipioLoading.value = true;
  try {
    const { data } = await CatalogsAPI.searchMunicipios(
      props.estadoResidencia,
      query,
    );
    const lowerQuery = query.toLowerCase();
    const matchingSentinels = buildMunicipioSentinels().filter(
      (sentinel) =>
        sentinel.code.includes(lowerQuery) ||
        sentinel.description.toLowerCase().includes(lowerQuery),
    );

    municipioResults.value = [
      ...matchingSentinels,
      ...sortMunicipiosByCode(data || []),
    ];
    municipioShowResults.value = true;
  } catch (err) {
    console.error('Error al buscar municipios:', err);
    municipioResults.value = [];
  } finally {
    municipioLoading.value = false;
  }
};

const searchLocalidad = async (query) => {
  if (!props.estadoResidencia || !props.municipioResidencia) {
    localidadResults.value = [];
    return;
  }

  if (localidadLocked.value) {
    syncLockedLocalidadDisplay();
    return;
  }

  if (!query || query.length < 2) {
    await loadAllLocalidades();
    return;
  }

  localidadLoading.value = true;
  try {
    const { data } = await CatalogsAPI.getLocalidades(
      props.estadoResidencia,
      props.municipioResidencia,
      query,
    );

    const lowerQuery = query.toLowerCase();
    const matchingSentinels = buildLocalidadSentinels().filter(
      (sentinel) =>
        sentinel.code.includes(lowerQuery) ||
        sentinel.description.toLowerCase().includes(lowerQuery),
    );

    localidadResults.value = [...matchingSentinels, ...(data || [])];
    localidadShowResults.value = true;
  } catch (err) {
    console.error('Error al buscar localidades:', err);
    localidadResults.value = [];
  } finally {
    localidadLoading.value = false;
  }
};

// Manejar cambio de estado
const onEstadoChange = async (code) => {
  emit('update:estadoResidencia', code);
  // Limpiar municipio y localidad
  emit('update:municipioResidencia', '');
  emit('update:localidadResidencia', '');
  municipioQuery.value = '';
  localidadQuery.value = '';
  municipioSelected.value = null;
  localidadSelected.value = null;
  municipioResults.value = [];
  municipioShowResults.value = false;
  localidadResults.value = [];
  localidadShowResults.value = false;
  // Resetear estados de blur cuando cambia el estado
  municipioHasBlurred.value = false;
  localidadHasBlurred.value = false;

  if (!code || isEntidadResidenciaEspecial(code)) {
    municipiosDisponibles.value = [];
    return;
  }

  await loadMunicipiosForEstado(code);
};

// Manejar focus en municipio
const onMunicipioFocus = () => {
  if (!municipioEnabled.value || municipioLocked.value) return;
  loadAllMunicipios();
};

// Manejar cambio de municipio
const onMunicipioInput = (e) => {
  if (municipioLocked.value) return;

  const val = e.target.value;
  municipioQuery.value = val;
  
  if (!val) {
    emit('update:municipioResidencia', '');
    municipioSelected.value = null;
    municipioResults.value = [];
    municipioResetHighlight();
    emit('update:localidadResidencia', '');
    localidadQuery.value = '';
    localidadSelected.value = null;
    localidadResults.value = [];
    localidadShowResults.value = false;
    return;
  }

  municipioResetHighlight();

  if (municipioDebounceTimer) clearTimeout(municipioDebounceTimer);
  municipioDebounceTimer = setTimeout(() => {
    searchMunicipio(val);
  }, 300);
};

const onMunicipioSelect = (result) => {
  municipioSelected.value = result;
  municipioQuery.value = `${result.description} (${result.code})`;
  municipioShowResults.value = false;
  municipioResults.value = [];
  
  const municipioCode = result.code.includes('-')
    ? result.code.split('-')[1]
    : result.code;
  emit('update:municipioResidencia', municipioCode);
  municipioHasBlurred.value = true;

  emit('update:localidadResidencia', '');
  localidadQuery.value = '';
  localidadSelected.value = null;
  localidadResults.value = [];
  localidadShowResults.value = false;
  localidadHasBlurred.value = false;

  if (!isMunicipioGiisSentinel(municipioCode) && props.estadoResidencia) {
    loadLocalidadesForMunicipio(props.estadoResidencia, municipioCode);
  }
};

// Manejar focus en localidad
const onLocalidadFocus = () => {
  if (!localidadEnabled.value || localidadLocked.value) return;
  loadAllLocalidades();
};

// Manejar cambio de localidad
const onLocalidadInput = (e) => {
  if (localidadLocked.value) return;

  const val = e.target.value;
  localidadQuery.value = val;
  
  if (!val) {
    emit('update:localidadResidencia', '');
    localidadSelected.value = null;
    localidadResults.value = [];
    localidadResetHighlight();
    return;
  }

  localidadResetHighlight();

  if (localidadDebounceTimer) clearTimeout(localidadDebounceTimer);
  localidadDebounceTimer = setTimeout(() => {
    searchLocalidad(val);
  }, 300);
};

const onLocalidadSelect = (result) => {
  localidadSelected.value = result;
  localidadQuery.value = `${result.description} (${result.code})`;
  localidadShowResults.value = false;
  localidadResults.value = [];
  
  // Extraer solo el código de localidad (4 dígitos) según NOM-024
  // El código puede venir en formato "25-001-0001" o solo "0001"
  let localidadCode = result.code;
  if (result.code && result.code.includes('-')) {
    // Si viene en formato completo, extraer solo la última parte (4 dígitos)
    const parts = result.code.split('-');
    localidadCode = parts[parts.length - 1];
  }
  
  emit('update:localidadResidencia', localidadCode);
  localidadHasBlurred.value = true; // Marcar como blurred cuando se selecciona
};

// Watch para cargar municipio cuando hay estado inicial o cambia externamente
watch(() => props.estadoResidencia, async (newEstado) => {
  municipioResults.value = [];
  localidadResults.value = [];
  municipioShowResults.value = false;
  localidadShowResults.value = false;

  if (newEstado && !isEntidadResidenciaEspecial(newEstado)) {
    await loadMunicipiosForEstado(newEstado);
  } else {
    municipiosDisponibles.value = [];
  }
}, { immediate: true });

const municipioEnabled = computed(() => !!props.estadoResidencia);

const localidadEnabled = computed(
  () => municipioEnabled.value && !!props.municipioResidencia,
);

const loadInitialMunicipio = async () => {
  if (
    props.municipioResidencia &&
    props.estadoResidencia &&
    municipioEnabled.value
  ) {
    try {
      if (isMunicipioGiisSentinel(props.municipioResidencia)) {
        const sentinel = resolveMunicipioSentinel(
          props.estadoResidencia,
          props.municipioResidencia,
        );
        if (sentinel) {
          municipioSelected.value = sentinel;
          municipioQuery.value = `${sentinel.description} (${sentinel.code})`;
        }
      } else {
        await loadMunicipiosForEstado(props.estadoResidencia);
        const municipio = municipiosDisponibles.value.find((m) => {
          const munCode = m.code.includes('-') ? m.code.split('-')[1] : m.code;
          return munCode === props.municipioResidencia;
        });
        if (municipio) {
          municipioSelected.value = municipio;
          municipioQuery.value = `${municipio.description} (${getMunicipioDisplayCode(municipio)})`;
        }
      }
    } catch (err) {
      console.error('Error al cargar municipio inicial:', err);
    }
  }
};

const loadInitialLocalidad = async () => {
  if (props.localidadResidencia && localidadEnabled.value) {
    try {
      if (isLocalidadGiisSentinel(props.localidadResidencia)) {
        const sentinel = resolveLocalidadSentinel(
          props.estadoResidencia,
          props.municipioResidencia,
          props.localidadResidencia,
        );
        if (sentinel) {
          localidadSelected.value = sentinel;
          localidadQuery.value = `${sentinel.description} (${sentinel.code})`;
        }
      } else {
        const { data } = await CatalogsAPI.getLocalidades(
          props.estadoResidencia,
          props.municipioResidencia,
        );
        const localidad = data?.find((l) => {
          let locCode = l.code;
          if (l.code && l.code.includes('-')) {
            locCode = l.code.split('-').pop();
          }
          return locCode === props.localidadResidencia;
        });
        if (localidad) {
          localidadSelected.value = localidad;
          localidadQuery.value = `${localidad.description} (${localidad.code.split('-').pop()})`;
        }
      }
    } catch (err) {
      console.error('Error al cargar localidad inicial:', err);
    }
  }
};

watch(
  () => [
    props.paisResidencia,
    props.estadoResidencia,
    props.municipioResidencia,
    props.localidadResidencia,
  ],
  () => {
    syncLockedMunicipioDisplay();
    syncLockedLocalidadDisplay();
  },
  { immediate: true },
);

// Cargar valores iniciales cuando cambian los props
watch([() => props.municipioResidencia, () => props.estadoResidencia], () => {
  if (municipioEnabled.value && props.municipioResidencia) {
    loadInitialMunicipio();
  } else if (!props.municipioResidencia) {
    municipioQuery.value = '';
    municipioSelected.value = null;
  }
}, { immediate: true });

watch([() => props.localidadResidencia, () => props.municipioResidencia, () => props.estadoResidencia], () => {
  if (localidadEnabled.value && props.localidadResidencia) {
    loadInitialLocalidad();
  } else if (!props.localidadResidencia) {
    localidadQuery.value = '';
    localidadSelected.value = null;
  }
}, { immediate: true });

const hideMunicipioResults = () => {
  setTimeout(() => {
    municipioShowResults.value = false;
    municipioHasBlurred.value = true;
  }, 200);
};

const hideLocalidadResults = () => {
  setTimeout(() => {
    localidadShowResults.value = false;
    localidadHasBlurred.value = true;
  }, 200);
};

const {
  highlightedIndex: municipioHighlightedIndex,
  listRef: municipioListRef,
  listboxId: municipioListboxId,
  onKeydown: onMunicipioKeydown,
  resetHighlight: municipioResetHighlight,
  isHighlighted: isMunicipioHighlighted,
  setHighlightOnHover: setMunicipioHighlightOnHover,
  optionId: municipioOptionId,
} = useCatalogListKeyboard(
  municipioShowResults,
  municipioResults,
  onMunicipioSelect,
);

const {
  highlightedIndex: localidadHighlightedIndex,
  listRef: localidadListRef,
  listboxId: localidadListboxId,
  onKeydown: onLocalidadKeydown,
  resetHighlight: localidadResetHighlight,
  isHighlighted: isLocalidadHighlighted,
  setHighlightOnHover: setLocalidadHighlightOnHover,
  optionId: localidadOptionId,
} = useCatalogListKeyboard(
  localidadShowResults,
  localidadResults,
  onLocalidadSelect,
);
</script>

<template>
  <div class="space-y-4 dark-mode-input-surface">
    <!-- Fila 1: Entidad + Municipio -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <EstadoAutocomplete
          :model-value="estadoResidencia"
          @update:model-value="onEstadoChange"
          label="Entidad Residencia"
          placeholder="Buscar por nombre del estado"
          :required="required"
          mode="residencia"
          :pais-residencia="paisResidencia"
        />
      </div>

      <!-- Municipio Residencia -->
      <div class="relative">
      <label class="block font-medium text-lg text-gray-700 mb-1">
        Municipio Residencia
        <span v-if="required" class="text-red-500">*</span>
      </label>
      
      <div class="relative">
        <input
          type="text"
          :value="municipioQuery"
          @input="onMunicipioInput"
          @focus="onMunicipioFocus"
          @blur="hideMunicipioResults"
          @keydown="onMunicipioKeydown"
          role="combobox"
          :aria-expanded="municipioShowResults && municipioResults.length > 0"
          :aria-controls="municipioListboxId"
          :aria-activedescendant="municipioHighlightedIndex >= 0 ? municipioOptionId(municipioHighlightedIndex) : undefined"
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Buscar Municipio"
          v-bind="municipioInputAttrs"
          :disabled="!municipioEnabled || municipioLocked"
        />
        
        <div v-if="municipioLoading" class="absolute right-3 top-3.5">
          <svg class="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      <!-- Resultados Municipio -->
      <ul
        v-if="municipioShowResults && municipioResults.length > 0"
        :id="municipioListboxId"
        ref="municipioListRef"
        role="listbox"
        class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
      >
        <li
          v-for="(result, index) in municipioResults"
          :key="result.code"
          :id="municipioOptionId(index)"
          data-list-option
          role="option"
          :aria-selected="isMunicipioHighlighted(index)"
          @click="onMunicipioSelect(result)"
          @mouseenter="setMunicipioHighlightOnHover(index)"
          class="p-3 cursor-pointer border-b last:border-b-0 transition-colors"
          :class="isMunicipioHighlighted(index) ? 'bg-emerald-100' : 'hover:bg-emerald-50'"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="font-bold text-emerald-700 text-sm">{{ getMunicipioDisplayCode(result) }}</span>
              <p class="text-gray-800 font-medium leading-tight mt-0.5">{{ result.description }}</p>
            </div>
          </div>
        </li>
      </ul>

      <div v-else-if="municipioShowResults && municipioQuery.length >= 2 && !municipioLoading" 
           class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 text-gray-500 text-center text-sm italic">
        No se encontraron municipios para "{{ municipioQuery }}"
      </div>

      <!-- Mensaje de error de validación requerida (estilo FormKit) -->
      <div v-if="showMunicipioRequiredError" class="text-red-700 text-sm mb-0 mt-1">
        Este campo es obligatorio
      </div>

      <p class="text-xs text-gray-500 mt-1">
        <i class="fas fa-info-circle mr-1"></i>
         Ordenados por código numérico. Escriba para buscar.
      </p>
      </div>
    </div>

    <!-- Fila 2: Localidad + País -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Localidad Residencia -->
      <div class="relative">
      <label class="block font-medium text-lg text-gray-700 mb-1">
        Localidad Residencia
        <span v-if="required" class="text-red-500">*</span>
      </label>
      
      <div class="relative">
        <input
          type="text"
          :value="localidadQuery"
          @input="onLocalidadInput"
          @focus="onLocalidadFocus"
          @blur="hideLocalidadResults"
          @keydown="onLocalidadKeydown"
          role="combobox"
          :aria-expanded="localidadShowResults && localidadResults.length > 0"
          :aria-controls="localidadListboxId"
          :aria-activedescendant="localidadHighlightedIndex >= 0 ? localidadOptionId(localidadHighlightedIndex) : undefined"
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Buscar por código o nombre de la localidad..."
          v-bind="localidadInputAttrs"
          :disabled="!localidadEnabled || localidadLocked"
        />
        
        <div v-if="localidadLoading" class="absolute right-3 top-3.5">
          <svg class="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      <!-- Resultados Localidad -->
      <ul
        v-if="localidadShowResults && localidadResults.length > 0"
        :id="localidadListboxId"
        ref="localidadListRef"
        role="listbox"
        class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
      >
        <li
          v-for="(result, index) in localidadResults"
          :key="result.code"
          :id="localidadOptionId(index)"
          data-list-option
          role="option"
          :aria-selected="isLocalidadHighlighted(index)"
          @click="onLocalidadSelect(result)"
          @mouseenter="setLocalidadHighlightOnHover(index)"
          class="p-3 cursor-pointer border-b last:border-b-0 transition-colors"
          :class="isLocalidadHighlighted(index) ? 'bg-emerald-100' : 'hover:bg-emerald-50'"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="font-bold text-emerald-700 text-sm">{{ result.code }}</span>
              <p class="text-gray-800 font-medium leading-tight mt-0.5">{{ result.description }}</p>
            </div>
          </div>
        </li>
      </ul>

      <div v-else-if="localidadShowResults && localidadQuery.length >= 2 && !localidadLoading" 
           class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 text-gray-500 text-center text-sm italic">
        No se encontraron localidades para "{{ localidadQuery }}"
      </div>

      <!-- Mensaje de error de validación requerida (estilo FormKit) -->
      <div v-if="showLocalidadRequiredError" class="text-red-700 text-sm mb-0 mt-1">
        Este campo es obligatorio
      </div>

      <p class="text-xs text-gray-500 mt-1">
        <i class="fas fa-info-circle mr-1"></i>
        Ordenados por código numérico. Escriba para buscar.
      </p>
      </div>

      <div v-if="$slots.pais">
        <slot name="pais" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos opcionales */
</style>

