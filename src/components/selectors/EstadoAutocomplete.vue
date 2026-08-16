<script setup>
import { ref, watch, onMounted, computed, inject } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import { useCatalogSearchInput } from '@/helpers/catalogSearchInput';
import { useCatalogListKeyboard } from '@/helpers/useCatalogListKeyboard';
import { sortEstadosByCode } from '@/helpers/geoCatalogSort';
import { getResidenciaUiState } from '@/helpers/residenciaGeoRules';
import {
  buildEntidadSentinelOptions,
  filterEntidadCatalogEntries,
  getAllowedEntidadCodesForPaisNacimiento,
  isNonMexicoPais,
  normalizePaisCode,
} from '@/helpers/geoSelectorRules';
import { GIIS_ENTIDAD_NO_APLICA } from '@/helpers/giisResidenciaGeo';

const { catalogSearchInputAttrs } = useCatalogSearchInput();

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Entidad de Nacimiento'
  },
  placeholder: {
    type: String,
    default: 'Buscar por código o nombre del estado...'
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'nacimiento'
  },
  paisResidencia: {
    type: [String, Number],
    default: ''
  },
  paisNacimiento: {
    type: [String, Number],
    default: ''
  },
  geoContext: {
    type: String,
    default: 'trabajador'
  }
});

const emit = defineEmits(['update:modelValue', 'select']);

const query = ref('');
const results = ref([]);
const loading = ref(false);
const showResults = ref(false);
const selectedEntry = ref(null);
const error = ref('');
const hasBlurred = ref(false);

const formSubmitAttempted = inject('formSubmitAttempted', ref(false));

const showRequiredError = computed(() => {
  const isEmpty = !props.modelValue || props.modelValue.trim() === '';
  return props.required && isEmpty && (hasBlurred.value || formSubmitAttempted.value);
});

let debounceTimer = null;

const isResidenciaMode = computed(() => props.mode === 'residencia');

const activePais = computed(() => {
  if (isResidenciaMode.value) {
    return normalizePaisCode(props.paisResidencia);
  }
  return normalizePaisCode(props.paisNacimiento);
});

const allowedEntidadCodes = computed(() => {
  if (isResidenciaMode.value) {
    return getResidenciaUiState({
      paisResidencia: props.paisResidencia,
      entidadResidencia: props.modelValue,
      municipioResidencia: '',
      localidadResidencia: '',
    }, props.geoContext).entidad.allowedEntidadCodes;
  }
  return getAllowedEntidadCodesForPaisNacimiento(activePais.value, props.geoContext);
});

const residenciaUiState = computed(() => {
  if (!isResidenciaMode.value) return null;
  return getResidenciaUiState({
    paisResidencia: props.paisResidencia,
    entidadResidencia: props.modelValue,
    municipioResidencia: '',
    localidadResidencia: '',
  }, props.geoContext);
});

const nacimientoForeignLocked = computed(
  () => !isResidenciaMode.value && isNonMexicoPais(activePais.value),
);

const isInputDisabled = computed(
  () =>
    props.disabled ||
    (residenciaUiState.value?.entidad.locked ?? false) ||
    nacimientoForeignLocked.value,
);

const sentinelOptions = computed(() => {
  const allowed = allowedEntidadCodes.value;
  if (!allowed) return [];
  return buildEntidadSentinelOptions(allowed);
});

const filterEstadosForMode = (entries, { prependAllSentinels = true } = {}) => {
  const sorted = filterEntidadCatalogEntries(
    sortEstadosByCode(entries || []),
    props.geoContext,
  );
  const allowed = allowedEntidadCodes.value;

  // Typed search: keep only sentinels already present in `entries` (query matches).
  if (!prependAllSentinels) {
    if (!allowed) return sorted;
    return sorted.filter((entry) => allowed.includes(entry.code));
  }

  if (!allowed) {
    return [...sentinelOptions.value, ...sorted];
  }

  const fromCatalog = sorted.filter((entry) => allowed.includes(entry.code));
  const catalogCodes = new Set(fromCatalog.map((e) => e.code));
  const missingSentinels = filterEntidadCatalogEntries(
    sentinelOptions.value,
    props.geoContext,
  ).filter((s) => !catalogCodes.has(s.code));

  return [...missingSentinels, ...fromCatalog];
};

const allSentinelOptions = computed(() => buildEntidadSentinelOptions([
  'NE', '00', '88', '99',
]));

async function resolveEstadoEntry(code) {
  const sentinel = allSentinelOptions.value.find((s) => s.code === code);
  if (sentinel) {
    selectedEntry.value = sentinel;
    query.value = `${sentinel.description} (${sentinel.code})`;
    return;
  }
  const { data } = await CatalogsAPI.getEstadoByCode(code);
  if (data) {
    selectedEntry.value = data;
    query.value = `${data.description} (${data.code})`;
  }
}

watch(
  nacimientoForeignLocked,
  (locked) => {
    if (!locked) return;
    if (props.modelValue !== GIIS_ENTIDAD_NO_APLICA) {
      emit('update:modelValue', GIIS_ENTIDAD_NO_APLICA);
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (props.modelValue) {
    try {
      loading.value = true;
      await resolveEstadoEntry(props.modelValue);
    } catch (err) {
      console.error('Error al cargar estado inicial:', err);
      query.value = props.modelValue;
    } finally {
      loading.value = false;
    }
  }
});

watch(() => props.modelValue, async (newVal) => {
  if (!newVal) {
    query.value = '';
    selectedEntry.value = null;
    return;
  }

  if (selectedEntry.value?.code !== newVal) {
    try {
      await resolveEstadoEntry(newVal);
    } catch (err) {
      query.value = newVal;
    }
  }
});

const loadAllEstados = async () => {
  if (isInputDisabled.value) {
    showResults.value = false;
    return;
  }

  loading.value = true;
  try {
    const { data } = await CatalogsAPI.getEstados();
    results.value = filterEstadosForMode(data);
    showResults.value = true;
  } catch (err) {
    console.error('Error al cargar estados:', err);
    results.value = [];
  } finally {
    loading.value = false;
  }
};

const performSearch = async (val) => {
  if (!val || val.length < 2) {
    await loadAllEstados();
    return;
  }

  loading.value = true;
  try {
    const { data } = await CatalogsAPI.searchEstados(val);

    const lowerQuery = val.toLowerCase();
    const matchingSentinels = sentinelOptions.value.filter(
      (s) =>
        s.code.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery),
    );

    results.value = filterEstadosForMode(
      [...matchingSentinels, ...(data || [])],
      { prependAllSentinels: false },
    );
    showResults.value = true;
  } catch (err) {
    console.error('Error al buscar estados:', err);
    results.value = [];
  } finally {
    loading.value = false;
  }
};

const onInput = (e) => {
  if (isInputDisabled.value) return;

  const val = e.target.value;
  query.value = val;

  if (!val) {
    emit('update:modelValue', '');
    selectedEntry.value = null;
    results.value = [];
    resetHighlight();
    return;
  }

  resetHighlight();

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(val);
  }, 300);
};

const selectResult = (result) => {
  selectedEntry.value = result;
  query.value = `${result.description} (${result.code})`;
  showResults.value = false;
  results.value = [];
  emit('update:modelValue', result.code);
  emit('select', result);
  error.value = '';
  hasBlurred.value = true;
};

const onFocus = () => {
  if (isInputDisabled.value) return;

  if (results.value.length === 0 && !query.value) {
    loadAllEstados();
  } else if (results.value.length > 0) {
    showResults.value = true;
  }
};

const hideResults = () => {
  setTimeout(() => {
    showResults.value = false;
    hasBlurred.value = true;
  }, 200);
};

const {
  highlightedIndex,
  listRef,
  listboxId,
  onKeydown,
  resetHighlight,
  isHighlighted,
  setHighlightOnHover,
  optionId,
} = useCatalogListKeyboard(showResults, results, selectResult);
</script>

<template>
  <div class="relative dark-mode-input-surface">
    <label class="block font-medium text-lg text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <input
        type="text"
        :value="query"
        @input="onInput"
        @focus="onFocus"
        @blur="hideResults"
        @keydown="onKeydown"
        role="combobox"
        :aria-expanded="showResults && results.length > 0"
        :aria-controls="listboxId"
        :aria-activedescendant="highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined"
        :disabled="isInputDisabled"
        class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        :placeholder="placeholder"
        v-bind="catalogSearchInputAttrs"
      />

      <div v-if="loading" class="absolute right-3 top-3.5">
        <svg class="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>

    <div v-if="error" class="text-amber-700 text-xs mt-1 font-medium italic">
      <i class="fas fa-exclamation-triangle mr-1"></i> {{ error }}
    </div>

    <div v-if="showRequiredError" class="text-red-700 text-sm mb-0 mt-1">
      Este campo es obligatorio
    </div>

    <ul
      v-if="showResults && results.length > 0"
      :id="listboxId"
      ref="listRef"
      role="listbox"
      class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto"
    >
      <li
        v-for="(result, index) in results"
        :key="result.code"
        :id="optionId(index)"
        data-list-option
        role="option"
        :aria-selected="isHighlighted(index)"
        @click="selectResult(result)"
        @mouseenter="setHighlightOnHover(index)"
        class="p-3 cursor-pointer border-b last:border-b-0 transition-colors"
        :class="isHighlighted(index) ? 'bg-emerald-100' : 'hover:bg-emerald-50'"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="font-bold text-emerald-700 text-sm">{{ result.code }}</span>
            <p class="text-gray-800 font-medium leading-tight mt-0.5">{{ result.description }}</p>
          </div>
        </div>
      </li>
    </ul>

    <div v-else-if="showResults && query.length >= 2 && !loading"
         class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 text-gray-500 text-center text-sm italic">
      No se encontraron estados para "{{ query }}"
    </div>

    <p class="text-xs text-gray-500 mt-1">
      <i class="fas fa-info-circle mr-1"></i>
      (ej. 25=Sinaloa, 14=Jalisco). Escriba para buscar.
    </p>
  </div>
</template>

<style scoped>
</style>
