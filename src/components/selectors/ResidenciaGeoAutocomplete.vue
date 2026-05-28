<script setup>
import { ref, watch, computed, inject } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';
import EstadoAutocomplete from './EstadoAutocomplete.vue';
import { useCatalogSearchInput } from '@/helpers/catalogSearchInput';

const { catalogSearchInputAttrs: municipioInputAttrs } = useCatalogSearchInput();
const { catalogSearchInputAttrs: localidadInputAttrs } = useCatalogSearchInput();

const props = defineProps({
  estadoResidencia: {
    type: String,
    default: ''
  },
  municipioResidencia: {
    type: String,
    default: ''
  },
  localidadResidencia: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:estadoResidencia', 'update:municipioResidencia', 'update:localidadResidencia']);

// Estados internos para municipio y localidad
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

// Estados para validación
const municipioHasBlurred = ref(false);
const localidadHasBlurred = ref(false);

// Intentar obtener el estado de validación del formulario desde el contexto
const formSubmitAttempted = inject('formSubmitAttempted', ref(false));

// Computed para determinar si debe mostrar error de validación requerida
const showMunicipioRequiredError = computed(() => {
  const isEmpty = !props.municipioResidencia || props.municipioResidencia.trim() === '';
  return props.required && isEmpty && (municipioHasBlurred.value || formSubmitAttempted.value) && municipioEnabled.value;
});

const showLocalidadRequiredError = computed(() => {
  const isEmpty = !props.localidadResidencia || props.localidadResidencia.trim() === '';
  return props.required && isEmpty && (localidadHasBlurred.value || formSubmitAttempted.value) && localidadEnabled.value;
});

// Centinelas
const estadoSentinels = [
  { code: 'NE', description: 'Extranjero' },
  { code: '00', description: 'No disponible' }
];
const municipioSentinel = { code: '000', description: 'No disponible' };
const localidadSentinel = { code: '0000', description: 'No disponible' };

// Debounce timers
let municipioDebounceTimer = null;
let localidadDebounceTimer = null;

// Cargar municipios cuando se selecciona un estado
const loadMunicipiosForEstado = async (estadoCode) => {
  if (!estadoCode || estadoCode === 'NE' || estadoCode === '00') {
    municipiosDisponibles.value = [];
    return;
  }
  
  try {
    console.log('[ResidenciaGeo] Cargando municipios para estado:', estadoCode);
    const { data } = await CatalogsAPI.getMunicipios(estadoCode);
    console.log('[ResidenciaGeo] Municipios recibidos:', data?.length || 0);
    municipiosDisponibles.value = data || [];
  } catch (err) {
    console.error('Error al cargar municipios:', err);
    municipiosDisponibles.value = [];
  }
};

// Cargar todos los municipios del estado (para mostrar al hacer focus)
const loadAllMunicipios = async () => {
  if (!props.estadoResidencia) {
    municipioResults.value = [];
    return;
  }
  if (props.estadoResidencia === 'NE' || props.estadoResidencia === '00') {
    municipioResults.value = [municipioSentinel];
    municipioShowResults.value = true;
    return;
  }

  municipioLoading.value = true;
  try {
    const { data } = await CatalogsAPI.getMunicipios(props.estadoResidencia);
    // Agregar centinela al inicio
    municipioResults.value = [municipioSentinel, ...(data || [])];
    municipioShowResults.value = true;
  } catch (err) {
    console.error('Error al cargar municipios:', err);
    municipioResults.value = [];
  } finally {
    municipioLoading.value = false;
  }
};

// Cargar todas las localidades del municipio (para mostrar al hacer focus)
const loadAllLocalidades = async () => {
  if (!props.estadoResidencia || !props.municipioResidencia) {
    localidadResults.value = [];
    return;
  }
  if (props.municipioResidencia === '000') {
    localidadResults.value = [localidadSentinel];
    localidadShowResults.value = true;
    return;
  }
  if (props.estadoResidencia === 'NE' || props.estadoResidencia === '00') {
    localidadResults.value = [];
    return;
  }

  console.log('[ResidenciaGeo] Cargando localidades para estado:', props.estadoResidencia, 'municipio:', props.municipioResidencia);
  localidadLoading.value = true;
  try {
    const { data } = await CatalogsAPI.getLocalidades(props.estadoResidencia, props.municipioResidencia);
    console.log('[ResidenciaGeo] Localidades recibidas:', data?.length || 0, data);
    // Agregar centinela al inicio
    localidadResults.value = [localidadSentinel, ...(data || [])];
    localidadShowResults.value = true;
  } catch (err) {
    console.error('Error al cargar localidades:', err);
    localidadResults.value = [];
  } finally {
    localidadLoading.value = false;
  }
};

// Cargar localidades cuando se selecciona un municipio
const loadLocalidadesForMunicipio = async (estadoCode, municipioCode) => {
  if (!estadoCode || !municipioCode || estadoCode === 'NE' || estadoCode === '00' || municipioCode === '000') {
    return;
  }
  
  try {
    const { data } = await CatalogsAPI.getLocalidades(estadoCode, municipioCode);
    // No necesitamos guardar esto porque usamos búsqueda
  } catch (err) {
    console.error('Error al cargar localidades:', err);
  }
};

// Buscar municipio
const searchMunicipio = async (query) => {
  if (!props.estadoResidencia) {
    municipioResults.value = [];
    return;
  }
  if (props.estadoResidencia === 'NE' || props.estadoResidencia === '00') {
    municipioResults.value = [municipioSentinel];
    municipioShowResults.value = true;
    return;
  }

  if (!query || query.length < 2) {
    // Si no hay query, cargar todos los municipios del estado
    await loadAllMunicipios();
    return;
  }

  municipioLoading.value = true;
  try {
    const { data } = await CatalogsAPI.searchMunicipios(props.estadoResidencia, query);
    
    // Agregar centinela si coincide
    const lowerQuery = query.toLowerCase();
    const matchingSentinels = [];
    if (municipioSentinel.code.includes(lowerQuery) || 
        municipioSentinel.description.toLowerCase().includes(lowerQuery)) {
      matchingSentinels.push(municipioSentinel);
    }
    
    municipioResults.value = [...matchingSentinels, ...data];
    municipioShowResults.value = true;
  } catch (err) {
    console.error('Error al buscar municipios:', err);
    municipioResults.value = [];
  } finally {
    municipioLoading.value = false;
  }
};

// Buscar localidad
const searchLocalidad = async (query) => {
  if (!props.estadoResidencia || !props.municipioResidencia) {
    localidadResults.value = [];
    return;
  }
  if (props.municipioResidencia === '000') {
    localidadResults.value = [localidadSentinel];
    localidadShowResults.value = true;
    return;
  }
  if (props.estadoResidencia === 'NE' || props.estadoResidencia === '00') {
    localidadResults.value = [];
    return;
  }

  if (!query || query.length < 2) {
    // Si no hay query, cargar todas las localidades del municipio
    await loadAllLocalidades();
    return;
  }

  localidadLoading.value = true;
  try {
    const { data } = await CatalogsAPI.getLocalidades(props.estadoResidencia, props.municipioResidencia, query);
    
    // Agregar centinela si coincide
    const lowerQuery = query.toLowerCase();
    const matchingSentinels = [];
    if (localidadSentinel.code.includes(lowerQuery) || 
        localidadSentinel.description.toLowerCase().includes(lowerQuery)) {
      matchingSentinels.push(localidadSentinel);
    }
    
    localidadResults.value = [...matchingSentinels, ...data];
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

  if (!code || code === 'NE' || code === '00') {
    municipiosDisponibles.value = [];
    return;
  }

  await loadMunicipiosForEstado(code);
};

// Manejar focus en municipio
const onMunicipioFocus = () => {
  if (municipioEnabled.value) loadAllMunicipios();
};

// Manejar cambio de municipio
const onMunicipioInput = (e) => {
  const val = e.target.value;
  municipioQuery.value = val;
  
  if (!val) {
    emit('update:municipioResidencia', '');
    municipioSelected.value = null;
    municipioResults.value = [];
    emit('update:localidadResidencia', '');
    localidadQuery.value = '';
    localidadSelected.value = null;
    localidadResults.value = [];
    localidadShowResults.value = false;
    return;
  }

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
  
  // Extraer solo el código del municipio (si viene en formato "25-001", extraer "001")
  const municipioCode = result.code.includes('-') ? result.code.split('-')[1] : result.code;
  emit('update:municipioResidencia', municipioCode);
  municipioHasBlurred.value = true; // Marcar como blurred cuando se selecciona
  
  // Limpiar localidad
  emit('update:localidadResidencia', '');
  localidadQuery.value = '';
  localidadSelected.value = null;
  localidadResults.value = [];
  localidadShowResults.value = false;
  localidadHasBlurred.value = false; // Resetear blurred de localidad
  
  // Cargar localidades si no es centinela
  if (municipioCode !== '000' && props.estadoResidencia) {
    loadLocalidadesForMunicipio(props.estadoResidencia, municipioCode);
  }
};

// Manejar focus en localidad
const onLocalidadFocus = () => {
  if (localidadEnabled.value) loadAllLocalidades();
};

// Manejar cambio de localidad
const onLocalidadInput = (e) => {
  const val = e.target.value;
  localidadQuery.value = val;
  
  if (!val) {
    emit('update:localidadResidencia', '');
    localidadSelected.value = null;
    localidadResults.value = [];
    return;
  }

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

  if (newEstado && newEstado !== 'NE' && newEstado !== '00') {
    await loadMunicipiosForEstado(newEstado);
  } else {
    municipiosDisponibles.value = [];
  }
}, { immediate: true });

// Computed para habilitar/deshabilitar campos
const municipioEnabled = computed(() => {
  return !!props.estadoResidencia;
});

const localidadEnabled = computed(() => {
  return municipioEnabled.value && !!props.municipioResidencia;
});

// Cargar valores iniciales para municipio y localidad
const loadInitialMunicipio = async () => {
  if (props.municipioResidencia && props.estadoResidencia && municipioEnabled.value) {
    try {
      if (props.municipioResidencia === '000') {
        municipioSelected.value = municipioSentinel;
        municipioQuery.value = `${municipioSentinel.description} (${municipioSentinel.code})`;
      } else {
        await loadMunicipiosForEstado(props.estadoResidencia);
        // Buscar el municipio por código, considerando que puede venir solo el código del municipio
        const municipio = municipiosDisponibles.value.find(m => {
          const munCode = m.code.includes('-') ? m.code.split('-')[1] : m.code;
          return munCode === props.municipioResidencia;
        });
        if (municipio) {
          municipioSelected.value = municipio;
          municipioQuery.value = `${municipio.description} (${municipio.code})`;
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
      if (props.localidadResidencia === '0000') {
        localidadSelected.value = localidadSentinel;
        localidadQuery.value = `${localidadSentinel.description} (${localidadSentinel.code})`;
      } else {
        const { data } = await CatalogsAPI.getLocalidades(props.estadoResidencia, props.municipioResidencia);
        // Buscar la localidad por código, puede venir en formato "25-001-0001" o solo "0001"
        const localidad = data?.find(l => {
          let locCode = l.code;
          if (l.code && l.code.includes('-')) {
            const parts = l.code.split('-');
            locCode = parts[parts.length - 1];
          }
          return locCode === props.localidadResidencia;
        });
        if (localidad) {
          localidadSelected.value = localidad;
          localidadQuery.value = `${localidad.description} (${localidad.code})`;
        }
      }
    } catch (err) {
      console.error('Error al cargar localidad inicial:', err);
    }
  }
};

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
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 dark-mode-input-surface">
    <!-- Estado Residencia -->
    <div>
      <EstadoAutocomplete
        :model-value="estadoResidencia"
        @update:model-value="onEstadoChange"
        label="Entidad Residencia"
        placeholder="Buscar por nombre del estado"
        :required="required"
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
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Buscar Municipio"
          v-bind="municipioInputAttrs"
          :disabled="!municipioEnabled"
        />
        
        <div v-if="municipioLoading" class="absolute right-3 top-3.5">
          <svg class="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      <!-- Resultados Municipio -->
      <ul v-if="municipioShowResults && municipioResults.length > 0" 
          class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
        <li 
          v-for="result in municipioResults" 
          :key="result.code"
          @click="onMunicipioSelect(result)"
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
        Código INEGI de 3 dígitos. Use "000" si no está disponible.
      </p>
    </div>

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
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Buscar por código o nombre de la localidad..."
          v-bind="localidadInputAttrs"
          :disabled="!localidadEnabled"
        />
        
        <div v-if="localidadLoading" class="absolute right-3 top-3.5">
          <svg class="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      <!-- Resultados Localidad -->
      <ul v-if="localidadShowResults && localidadResults.length > 0" 
          class="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
        <li 
          v-for="result in localidadResults" 
          :key="result.code"
          @click="onLocalidadSelect(result)"
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
        Código INEGI de 4 dígitos. Use "0000" si no está disponible.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Estilos opcionales */
</style>

