<script setup>
import { ref, watch, onMounted, computed, inject } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';

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

// Intentar obtener el estado de validación del formulario desde el contexto
const formSubmitAttempted = inject('formSubmitAttempted', ref(false));

// Computed para determinar si debe mostrar error de validación requerida
// Muestra el error si el campo es requerido, está vacío, y (el usuario hizo blur o el formulario intentó enviarse)
const showRequiredError = computed(() => {
  const isEmpty = !props.modelValue || props.modelValue.trim() === '';
  return props.required && isEmpty && (hasBlurred.value || formSubmitAttempted.value);
});

// Debounce timer local
let debounceTimer = null;

// Opciones centinela
const sentinelOptions = [
  { code: 'NE', description: 'Extranjero' },
  { code: '00', description: 'No disponible' }
];

// Cargar datos iniciales si hay un modelValue
onMounted(async () => {
  if (props.modelValue) {
    try {
      loading.value = true;
      // Verificar si es un centinela primero
      const sentinel = sentinelOptions.find(s => s.code === props.modelValue);
      if (sentinel) {
        selectedEntry.value = sentinel;
        query.value = `${sentinel.description} (${sentinel.code})`;
      } else {
        const { data } = await CatalogsAPI.getEstadoByCode(props.modelValue);
        if (data) {
          selectedEntry.value = data;
          query.value = `${data.description} (${data.code})`;
        }
      }
    } catch (err) {
      console.error('Error al cargar estado inicial:', err);
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
      // Verificar si es un centinela primero
      const sentinel = sentinelOptions.find(s => s.code === newVal);
      if (sentinel) {
        selectedEntry.value = sentinel;
        query.value = `${sentinel.description} (${sentinel.code})`;
      } else {
        const { data } = await CatalogsAPI.getEstadoByCode(newVal);
        if (data) {
          selectedEntry.value = data;
          query.value = `${data.description} (${data.code})`;
        }
      }
    } catch (err) {
      query.value = newVal;
    }
  }
});

const loadAllEstados = async () => {
  loading.value = true;
  try {
    const { data } = await CatalogsAPI.getEstados();
    // Agregar centinelas al inicio
    results.value = [...sentinelOptions, ...data];
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
    // Si no hay query, cargar todos los estados
    await loadAllEstados();
    return;
  }

  loading.value = true;
  try {
    const { data } = await CatalogsAPI.searchEstados(val);
    
    // Agregar centinelas al inicio de los resultados si la búsqueda coincide
    const lowerQuery = val.toLowerCase();
    const matchingSentinels = sentinelOptions.filter(s => 
      s.code.toLowerCase().includes(lowerQuery) || 
      s.description.toLowerCase().includes(lowerQuery)
    );
    
    results.value = [...matchingSentinels, ...data];
    showResults.value = true;
  } catch (err) {
    console.error('Error al buscar estados:', err);
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
  query.value = `${result.description} (${result.code})`;
  showResults.value = false;
  results.value = [];
  emit('update:modelValue', result.code);
  emit('select', result);
  error.value = '';
  hasBlurred.value = true; // Marcar como blurred cuando se selecciona
};

const onFocus = () => {
  // Si no hay resultados y no hay query, cargar todos los estados
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

    <!-- Mensaje de error de validación requerida (estilo FormKit) -->
    <div v-if="showRequiredError" class="text-red-700 text-sm mb-0 mt-1">
      Este campo es obligatorio
    </div>

    <!-- Resultados -->
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
      No se encontraron estados para "{{ query }}"
    </div>

    <p class="text-xs text-gray-500 mt-1">
      <i class="fas fa-info-circle mr-1"></i>
      Código INEGI de 2 dígitos. Puede usar "NE" para Extranjero o "00" para No disponible.
    </p>
  </div>
</template>

<style scoped>
/* Estilos opcionales */
</style>

