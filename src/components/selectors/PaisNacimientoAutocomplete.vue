<script setup>
import { ref, watch, onMounted, computed, inject } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';

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

// Opción centinela: NO ESPECIFICADO (CATALOG_KEY 248 en cat_pais)
const sentinelOption = { code: '248', description: 'NO ESPECIFICADO' };

function normalizeModelValue(val) {
  if (val == null || val === '') return '';
  return String(val);
}

onMounted(async () => {
  const val = normalizeModelValue(props.modelValue);
  if (val) {
    try {
      loading.value = true;
      if (val === sentinelOption.code) {
        selectedEntry.value = sentinelOption;
        query.value = sentinelOption.description;
      } else {
        const { data } = await CatalogsAPI.getPaisByCatalogKey(val);
        if (data) {
          selectedEntry.value = data;
          query.value = data.description || `${data.code}`;
        }
      }
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
      if (val === sentinelOption.code) {
        selectedEntry.value = sentinelOption;
        query.value = sentinelOption.description;
      } else {
        const { data } = await CatalogsAPI.getPaisByCatalogKey(val);
        if (data) {
          selectedEntry.value = data;
          query.value = data.description || `${data.code}`;
        }
      }
    } catch (err) {
      query.value = val;
    }
  }
});

const loadInitialPaises = async () => {
  loading.value = true;
  try {
    const { data } = await CatalogsAPI.searchPaises('méxico', 50);
    results.value = [sentinelOption, ...(data || [])];
    showResults.value = true;
  } catch (err) {
    console.error('Error al cargar países:', err);
    results.value = [];
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
    const matchingSentinels = [];
    if (sentinelOption.code.includes(lowerQuery) ||
        sentinelOption.description.toLowerCase().includes(lowerQuery)) {
      matchingSentinels.push(sentinelOption);
    }
    results.value = [...matchingSentinels, ...(data || [])];
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
    return;
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(val);
  }, 300);
};

const selectResult = (result) => {
  selectedEntry.value = result;
  query.value = result.description;
  showResults.value = false;
  results.value = [];
  emit('update:modelValue', result.code);
  emit('select', result);
  error.value = '';
  hasBlurred.value = true;
};

const onFocus = () => {
  if (results.value.length === 0 && !query.value) {
    loadInitialPaises();
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
        class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        :placeholder="placeholder"
        autocomplete="off"
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

    <ul v-if="showResults && results.length > 0"
        class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
      <li
        v-for="result in results"
        :key="result.code"
        @click="selectResult(result)"
        class="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 transition-colors"
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
      Catálogo cat_pais (ej. 142=México, 228=USA). Escriba para buscar.
    </p>
  </div>
</template>

<style scoped>
</style>
