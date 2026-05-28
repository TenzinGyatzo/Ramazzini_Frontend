<script setup>
import { ref, watch, onMounted } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import { useCatalogSearchInput } from '@/helpers/catalogSearchInput';

const { catalogSearchInputAttrs } = useCatalogSearchInput();

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Código Postal'
  },
  placeholder: {
    type: String,
    default: 'Buscar por CP o colonia...'
  },
  required: {
    type: Boolean,
    default: false
  },
  /** Estilo compacto para formularios con menos espacio (ej. Step2 Lesión) */
  compact: {
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

// Debounce timer local
let debounceTimer = null;

// Cargar datos iniciales si hay un modelValue
onMounted(async () => {
  if (props.modelValue) {
    // Si el valor ya tiene el formato esperado (ej: 20000)
    // Intentamos buscarlo para obtener la descripción completa
    // Nota: Dado que un CP puede tener varios asentamientos,
    // si solo tenemos el CP, mostraremos solo el CP hasta que el usuario elija.
    query.value = props.modelValue;
  }
});

// Sincronizar query cuando cambia modelValue externamente
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    query.value = '';
    selectedEntry.value = null;
    return;
  }
  
  // Si el valor cambia externamente y no coincide con lo que tenemos
  if (selectedEntry.value?.cp !== newVal && query.value !== newVal) {
    query.value = newVal;
  }
});

const performSearch = async (val) => {
  if (!val || val.length < 3) {
    results.value = [];
    return;
  }

  loading.value = true;
  try {
    const { data } = await CatalogsAPI.searchCP(val);
    results.value = data;
    showResults.value = true;
  } catch (err) {
    console.error('Error al buscar CP:', err);
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

  // Implementación local de debounce
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(val);
  }, 300);
};

const selectResult = (result) => {
  selectedEntry.value = result;
  // Al seleccionar, mostramos la descripción formateada
  query.value = `${result.cp} - ${toTitleCase(result.asentamiento)}, ${toTitleCase(result.municipio)}, ${toTitleCase(result.estado)}`;
  showResults.value = false;
  results.value = [];
  emit('update:modelValue', result.cp);
  emit('select', result);
};

const hideResults = () => {
  setTimeout(() => {
    showResults.value = false;
  }, 200);
};

// Helper para Title Case
const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (l) => l.toUpperCase());
};
</script>

<template>
  <div class="relative dark-mode-input-surface">
    <label
      :class="[
        'block font-medium text-gray-700 mb-1',
        compact ? 'text-xs' : 'text-lg'
      ]"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <input
        type="text"
        :value="query"
        @input="onInput"
        @focus="showResults = results.length > 0"
        @blur="hideResults"
        :class="[
          'w-full border border-gray-300 rounded text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
          compact ? 'py-1.5 px-2 text-sm' : 'h-12 p-2.5 rounded-lg'
        ]"
        :placeholder="placeholder"
        v-bind="catalogSearchInputAttrs"
      />

      <div
        v-if="loading"
        :class="[
          'absolute text-emerald-500',
          compact ? 'right-2 top-1.5' : 'right-3 top-3.5'
        ]"
      >
        <svg
          :class="['animate-spin text-emerald-500', compact ? 'h-4 w-4' : 'h-5 w-5']"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>

    <!-- Resultados -->
    <ul
      v-if="showResults && results.length > 0"
      :class="[
        'absolute z-50 w-full mt-1 bg-white border border-gray-300 shadow-xl overflow-y-auto',
        compact ? 'rounded max-h-40' : 'rounded-lg max-h-60'
      ]"
    >
      <li
        v-for="result in results"
        :key="result.code"
        @click="selectResult(result)"
        :class="[
          'hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 transition-colors',
          compact ? 'p-2' : 'p-3'
        ]"
      >
        <div class="flex flex-col" :class="compact ? 'gap-0.5' : ''">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'font-bold text-emerald-700',
                compact ? 'text-sm' : ''
              ]"
            >{{ result.cp }}</span>
            <span
              :class="[
                'text-gray-800 font-medium',
                compact ? 'text-sm' : ''
              ]"
            >{{ toTitleCase(result.asentamiento) }}</span>
          </div>
          <p :class="['text-gray-500', compact ? 'text-xs' : 'text-xs mt-1']">
            {{ toTitleCase(result.municipio) }}, {{ toTitleCase(result.estado) }}
          </p>
        </div>
      </li>
    </ul>

    <div
      v-else-if="showResults && query.length >= 3 && !loading"
      :class="[
        'absolute z-50 w-full mt-1 bg-white border border-gray-300 shadow-xl text-gray-500 text-center italic',
        compact ? 'rounded p-2 text-xs' : 'rounded-lg p-3 text-sm'
      ]"
    >
      No se encontraron resultados para "{{ query }}"
    </div>
  </div>
</template>

