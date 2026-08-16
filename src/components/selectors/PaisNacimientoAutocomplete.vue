<script setup>
import { ref, watch, onMounted, computed, inject } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import { useCatalogSearchInput } from '@/helpers/catalogSearchInput';
import { useCatalogListKeyboard } from '@/helpers/useCatalogListKeyboard';
import {
  PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE,
  PAIS_NACIMIENTO_NO_ESPECIFICADO_LABEL,
  PAIS_NACIMIENTO_SE_IGNORA_CODE,
  PAIS_NACIMIENTO_SE_IGNORA_LABEL,
  sortPaisesForSelector,
} from '@/helpers/paisNacimiento';
import {
  filterPaisCatalogEntries,
  getExcludedPaisCodes,
} from '@/helpers/geoSelectorRules';

const { catalogSearchInputAttrs } = useCatalogSearchInput();

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: 'País de nacimiento'
  },
  placeholder: {
    type: String,
    default: 'Buscar por nombre de país...'
  },
  required: {
    type: Boolean,
    default: false
  },
  excludeNoEspecificado: {
    type: Boolean,
    default: false
  },
  geoContext: {
    type: String,
    default: 'trabajador'
  },
  disabled: {
    type: Boolean,
    default: false
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
  const isEmpty = props.modelValue === '' || props.modelValue == null;
  return props.required && isEmpty && (hasBlurred.value || formSubmitAttempted.value);
});

let debounceTimer = null;

const sentinelOptions = [
  {
    code: PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE,
    description: PAIS_NACIMIENTO_NO_ESPECIFICADO_LABEL,
  },
  {
    code: PAIS_NACIMIENTO_SE_IGNORA_CODE,
    description: PAIS_NACIMIENTO_SE_IGNORA_LABEL,
  },
];

const effectiveExcludeCodes = computed(() => {
  const fromContext = getExcludedPaisCodes(props.geoContext);
  if (props.excludeNoEspecificado && !fromContext.includes(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE)) {
    return [...fromContext, PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE];
  }
  return fromContext;
});

function orderPaisesForSelector(items = [], { includeAllSentinels = true } = {}) {
  const filtered = filterPaisCatalogEntries(items, props.geoContext);
  const merged =
    props.geoContext === 'trabajador' && includeAllSentinels
      ? [
          ...sentinelOptions.filter(
            (s) => !effectiveExcludeCodes.value.includes(s.code),
          ),
          ...filtered,
        ]
      : filtered;
  return sortPaisesForSelector(merged, {
    geoContext: props.geoContext,
    excludeNoEspecificado: effectiveExcludeCodes.value.includes(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE),
    excludeSeIgnora: effectiveExcludeCodes.value.includes(PAIS_NACIMIENTO_SE_IGNORA_CODE),
    excludeCodes: effectiveExcludeCodes.value,
    // Only inject missing sentinels when showing the full list (focus / short query).
    injectMissingSentinels: includeAllSentinels,
  });
}

function normalizeModelValue(val) {
  if (val == null || val === '') return '';
  return String(val);
}

function formatPaisDisplay(entry) {
  const code = entry?.code != null ? String(entry.code) : '';
  const description = entry?.description ?? code;
  return description && code ? `${description} (${code})` : description || code;
}

async function resolveInitialEntry(val) {
  const sentinel = sentinelOptions.find((s) => s.code === val);
  if (sentinel) {
    selectedEntry.value = sentinel;
    query.value = formatPaisDisplay(sentinel);
    return;
  }
  const { data } = await CatalogsAPI.getPaisByCatalogKey(val);
  if (data) {
    selectedEntry.value = data;
    query.value = formatPaisDisplay(data);
  }
}

onMounted(async () => {
  const val = normalizeModelValue(props.modelValue);
  if (val) {
    try {
      loading.value = true;
      await resolveInitialEntry(val);
    } catch (err) {
      console.error('Error al cargar país inicial:', err);
      query.value = val;
    } finally {
      loading.value = false;
    }
  }
});

watch(() => props.modelValue, async (newVal) => {
  const val = normalizeModelValue(newVal);
  if (!val) {
    query.value = '';
    selectedEntry.value = null;
    return;
  }

  if (selectedEntry.value?.code !== val) {
    try {
      await resolveInitialEntry(val);
    } catch (err) {
      query.value = val;
    }
  }
});

const loadInitialPaises = async () => {
  loading.value = true;
  try {
    const { data } = await CatalogsAPI.listCatalog('cat_pais', 500);
    results.value = orderPaisesForSelector(data || []);
    showResults.value = true;
  } catch (err) {
    console.error('Error al cargar países:', err);
    try {
      const { data } = await CatalogsAPI.searchPaises('a', 100);
      results.value = orderPaisesForSelector(data || []);
      showResults.value = true;
    } catch (fallbackErr) {
      console.error('Error al cargar países (fallback):', fallbackErr);
      results.value = orderPaisesForSelector([]);
    }
  } finally {
    loading.value = false;
  }
};

const performSearch = async (val) => {
  if (!val || val.length < 2) {
    await loadInitialPaises();
    return;
  }

  loading.value = true;
  try {
    const { data } = await CatalogsAPI.searchPaises(val, 50);
    const lowerQuery = val.toLowerCase();
    const matchingSentinels = props.geoContext === 'trabajador'
      ? sentinelOptions.filter(
          (s) =>
            !effectiveExcludeCodes.value.includes(s.code) &&
            (s.code.includes(lowerQuery) ||
              s.description.toLowerCase().includes(lowerQuery)),
        )
      : [];
    results.value = orderPaisesForSelector(
      [...matchingSentinels, ...(data || [])],
      { includeAllSentinels: false },
    );
    showResults.value = true;
  } catch (err) {
    console.error('Error al buscar países:', err);
    results.value = [];
  } finally {
    loading.value = false;
  }
};

const onInput = (e) => {
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
  query.value = formatPaisDisplay(result);
  showResults.value = false;
  results.value = [];
  emit('update:modelValue', result.code);
  emit('select', result);
  error.value = '';
  hasBlurred.value = true;
};

const onFocus = () => {
  if (results.value.length === 0) {
    loadInitialPaises();
  } else {
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
        :disabled="disabled"
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
      No se encontraron países para "{{ query }}"
    </div>

    <p class="text-xs text-gray-500 mt-1">
      <i class="fas fa-info-circle mr-1"></i>
      (ej. 142=México, 228=USA). Escriba para buscar.
    </p>
  </div>
</template>

<style scoped>
</style>
