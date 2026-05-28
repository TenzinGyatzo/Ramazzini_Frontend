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
    default: 'CLUES (Clave Única de Establecimientos de Salud)'
  },
  placeholder: {
    type: String,
    default: 'Buscar por código CLUES o nombre del establecimiento...'
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

// Debounce timer local para evitar dependencia de lodash
let debounceTimer = null;

// Cargar datos iniciales si hay un modelValue
onMounted(async () => {
  if (props.modelValue) {
    try {
      loading.value = true;
      const { data } = await CatalogsAPI.getCLUESByCode(props.modelValue);
      if (data) {
        selectedEntry.value = data;
        query.value = `${data.code} - ${data.description}`;
      }
    } catch (err) {
      console.error('Error al cargar CLUES inicial:', err);
      query.value = props.modelValue;
    } finally {
      loading.value = false;
    }
  }
});

// Sincronizar query cuando cambia modelValue externamente
watch(() => props.modelValue, async (newVal) => {
  if (!newVal) {
    query.value = '';
    selectedEntry.value = null;
    return;
  }
  
  if (selectedEntry.value?.code !== newVal) {
    try {
      const { data } = await CatalogsAPI.getCLUESByCode(newVal);
      if (data) {
        selectedEntry.value = data;
        query.value = `${data.code} - ${data.description}`;
      }
    } catch (err) {
      query.value = newVal;
    }
  }
});

const performSearch = async (val) => {
  if (!val || val.length < 3) {
    results.value = [];
    return;
  }

  loading.value = true;
  try {
    const { data } = await CatalogsAPI.searchCLUES(val);
    results.value = data;
    showResults.value = true;
  } catch (err) {
    console.error('Error al buscar CLUES:', err);
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
  query.value = `${result.code} - ${result.description}`;
  showResults.value = false;
  results.value = [];
  emit('update:modelValue', result.code);
  emit('select', result);
  
  if (result.estatus !== 'EN OPERACION') {
    error.value = 'Aviso: Este establecimiento no figura "EN OPERACION"';
  } else {
    error.value = '';
  }
};

const hideResults = () => {
  setTimeout(() => {
    showResults.value = false;
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
        @focus="showResults = results.length > 0"
        @blur="hideResults"
        class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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

    <!-- Resultados -->
    <ul v-if="showResults && results.length > 0" 
        class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
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
            <p class="text-xs text-gray-500 mt-1">
              {{ result.entidad }} | {{ result.municipio }}
            </p>
          </div>
          <span 
            :class="result.estatus === 'EN OPERACION' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
            class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
          >
            {{ result.estatus }}
          </span>
        </div>
      </li>
    </ul>

    <div v-else-if="showResults && query.length >= 3 && !loading" 
         class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 text-gray-500 text-center text-sm italic">
      No se encontraron establecimientos para "{{ query }}"
    </div>

    <p class="text-xs text-gray-500 mt-1">
      <i class="fas fa-info-circle mr-1"></i>
      Código de 11 caracteres (ej. DFSSA012345). Aplica únicamente para establecimientos de salud registrados en México (CLUES – NOM-024).
      <br>
      <span class="italic">De no contar con un CLUES válido, se debe utilizar el valor 9998 - SERVICIOS MEDICOS PRIVADOS.</span>
    </p>
  </div>
</template>

<style scoped>
/* Estilos opcionales */
</style>

