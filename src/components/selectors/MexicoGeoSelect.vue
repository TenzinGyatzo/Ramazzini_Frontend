<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import CatalogsAPI from '@/api/CatalogsAPI';

const props = defineProps({
  estado: {
    type: String,
    default: ''
  },
  municipio: {
    type: String,
    default: ''
  },
  localidad: {
    type: String,
    default: ''
  },
  includeLocalidad: {
    type: Boolean,
    default: false
  },
  labelEstado: {
    type: String,
    default: 'Estado'
  },
  labelMunicipio: {
    type: String,
    default: 'Municipio'
  },
  labelLocalidad: {
    type: String,
    default: 'Localidad'
  }
});

const emit = defineEmits(['update:estado', 'update:municipio', 'update:localidad']);

const estados = ref([]);
const municipios = ref([]);
const localidades = ref([]);
const loading = ref({
  estados: false,
  municipios: false,
  localidades: false
});

// Cargar estados al montar
onMounted(async () => {
  loading.value.estados = true;
  try {
    const { data } = await CatalogsAPI.getEstados();
    estados.value = data;
  } catch (err) {
    console.error('Error al cargar estados:', err);
  } finally {
    loading.value.estados = false;
  }
});

// Función para cargar municipios
const loadMunicipios = async (estadoCode) => {
  if (!estadoCode) {
    municipios.value = [];
    return;
  }
  loading.value.municipios = true;
  try {
    const { data } = await CatalogsAPI.getMunicipios(estadoCode);
    municipios.value = data;
  } catch (err) {
    console.error('Error al cargar municipios:', err);
    municipios.value = [];
  } finally {
    loading.value.municipios = false;
  }
};

// Función para cargar localidades
const loadLocalidades = async (estadoCode, municipioCode) => {
  if (!estadoCode || !municipioCode || !props.includeLocalidad) {
    localidades.value = [];
    return;
  }
  loading.value.localidades = true;
  try {
    const { data } = await CatalogsAPI.getLocalidades(estadoCode, municipioCode);
    localidades.value = data;
  } catch (err) {
    console.error('Error al cargar localidades:', err);
    localidades.value = [];
  } finally {
    loading.value.localidades = false;
  }
};

// Helper para convertir a Title Case (Primera Mayúscula)
const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (l) => l.toUpperCase());
};

// Manejadores de cambios
const onEstadoChange = async (e) => {
  const code = e.target.value;
  const description = estados.value.find(est => est.code === code)?.description || '';
  
  emit('update:estado', description);
  emit('update:municipio', '');
  emit('update:localidad', '');
  
  municipios.value = [];
  localidades.value = [];
  
  if (code) {
    await loadMunicipios(code);
  }
};

const onMunicipioChange = async (e) => {
  const code = e.target.value;
  const description = municipios.value.find(mun => mun.code === code)?.description || '';
  
  emit('update:municipio', description);
  emit('update:localidad', '');
  
  localidades.value = [];
  
  if (code && props.includeLocalidad) {
    const estadoActual = estados.value.find(est => 
      est.description.toUpperCase() === (props.estado || '').toUpperCase()
    );
    if (estadoActual) {
      await loadLocalidades(estadoActual.code, code);
    }
  }
};

const onLocalidadChange = (e) => {
  const code = e.target.value;
  const description = localidades.value.find(loc => loc.code === code)?.description || '';
  emit('update:localidad', description);
};

// Watch para cargar municipios cuando cambia el estado
watch(() => props.estado, async (newEstado, oldEstado) => {
  if (newEstado && estados.value.length > 0) {
    const estadoObj = estados.value.find(e => 
      e.description.toUpperCase() === newEstado.toUpperCase()
    );
    if (estadoObj) {
      // Siempre cargar municipios cuando cambia el estado
      await loadMunicipios(estadoObj.code);
      
      // Después de cargar municipios, verificar si hay un municipio prop válido
      await nextTick();
      if (props.municipio && municipios.value.length > 0) {
        const munObj = municipios.value.find(m => 
          m.description.toUpperCase() === props.municipio.toUpperCase()
        );
        if (!munObj) {
          // Si el municipio no existe en el nuevo estado, limpiarlo
          emit('update:municipio', '');
        }
      }
    }
  } else if (!newEstado) {
    municipios.value = [];
    emit('update:municipio', '');
  }
}, { immediate: false });

// Watch para cuando se cargan los estados y ya hay un estado seleccionado
watch(estados, async (newEstados) => {
  if (newEstados.length > 0 && props.estado) {
    const estadoObj = newEstados.find(e => 
      e.description.toUpperCase() === props.estado.toUpperCase()
    );
    if (estadoObj) {
      await loadMunicipios(estadoObj.code);
    }
  }
});

// Watch para cargar localidades cuando cambia el municipio
watch(() => props.municipio, async (newMun) => {
  if (newMun && municipios.value.length > 0 && props.includeLocalidad) {
    const estadoObj = estados.value.find(e => 
      e.description.toUpperCase() === props.estado.toUpperCase()
    );
    const munObj = municipios.value.find(m => 
      m.description.toUpperCase() === newMun.toUpperCase()
    );
    if (estadoObj && munObj) {
      await loadLocalidades(estadoObj.code, munObj.code);
    }
  } else if (!newMun) {
    localidades.value = [];
  }
});
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 dark-mode-input-surface">
    <!-- Estado -->
    <div class="flex flex-col">
      <label class="block font-medium text-lg text-gray-700 mb-1">
        {{ labelEstado }}
      </label>
      <div class="relative">
        <select
          :value="estados.find(e => e.description.toUpperCase() === (estado || '').toUpperCase())?.code || ''"
          @change="onEstadoChange"
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          :disabled="loading.estados"
        >
          <option value="">Selecciona un estado</option>
          <option v-for="est in estados" :key="est.code" :value="est.code">
            {{ toTitleCase(est.description) }}
          </option>
        </select>
        <div v-if="loading.estados" class="absolute right-8 top-3.5">
          <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Municipio -->
    <div class="flex flex-col">
      <label class="block font-medium text-lg text-gray-700 mb-1">
        {{ labelMunicipio }}
      </label>
      <div class="relative">
        <select
          :value="municipios.find(m => m.description.toUpperCase() === (municipio || '').toUpperCase())?.code || ''"
          @change="onMunicipioChange"
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          :disabled="loading.municipios || !estado"
        >
          <option value="">Selecciona un municipio</option>
          <option v-for="mun in municipios" :key="mun.code" :value="mun.code">
            {{ toTitleCase(mun.description) }}
          </option>
        </select>
        <div v-if="loading.municipios" class="absolute right-8 top-3.5">
          <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Localidad (Opcional) -->
    <div v-if="includeLocalidad" class="flex flex-col sm:col-span-2">
      <label class="block font-medium text-lg text-gray-700 mb-1">
        {{ labelLocalidad }}
      </label>
      <div class="relative">
        <select
          :value="localidades.find(l => l.description === localidad)?.code || ''"
          @change="onLocalidadChange"
          class="w-full h-12 p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          :disabled="loading.localidades || !municipio"
        >
          <option value="">Selecciona una localidad</option>
          <option v-for="loc in localidades" :key="loc.code" :value="loc.code">
            {{ loc.description }}
          </option>
        </select>
        <div v-if="loading.localidades" class="absolute right-8 top-3.5">
          <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

