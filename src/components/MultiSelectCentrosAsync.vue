<template>
  <div class="space-y-3">
    <label class="block text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-3">
      <i class="fas fa-spinner fa-spin text-blue-600 mr-2 text-sm"></i>
      <span class="text-sm text-gray-600">Cargando centros de trabajo...</span>
    </div>
    
    <!-- No empresas selected -->
    <div v-else-if="empresasSeleccionadas.length === 0" class="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-md border border-gray-200">
      <i class="fas fa-info-circle mr-2"></i>
      Selecciona empresas primero para ver centros de trabajo disponibles
    </div>
    
    <!-- Centros agrupados por empresa -->
    <div v-if="centrosAgrupados.length > 0" class="space-y-2">
      <div 
        v-for="grupo in centrosAgrupados" 
        :key="grupo.empresaId"
        class="border border-gray-200 rounded-md overflow-hidden"
      >
        <!-- Header de empresa -->
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-2 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <i class="fas fa-building text-gray-600 mr-1.5 text-xs"></i>
              <span class="text-sm font-medium text-gray-800">{{ grupo.empresaNombre }}</span>
            </div>
            <div class="text-xs text-gray-500">
              {{ grupo.centros.length }} centro{{ grupo.centros.length !== 1 ? 's' : '' }}
            </div>
          </div>
        </div>
        
        <!-- Lista de centros -->
        <div class="p-2 space-y-1">
          <div 
            v-for="centro in grupo.centros" 
            :key="centro._id"
            class="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center">
              <input
                :id="`centro-${centro._id}`"
                type="checkbox"
                :checked="selectedIds.includes(centro._id)"
                @change="toggleCentro(centro._id)"
                class="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label :for="`centro-${centro._id}`" class="ml-2 cursor-pointer">
                <div class="text-sm font-medium text-gray-900">{{ centro.nombreCentro }}</div>
                <div v-if="centro.direccion" class="text-xs text-gray-500 mt-0.5">
                  <i class="fas fa-map-marker-alt mr-1"></i>
                  {{ centro.direccion }}
                </div>
              </label>
            </div>
            
            <!-- Indicador de estado -->
            <div class="flex items-center">
              <span 
                v-if="selectedIds.includes(centro._id)"
                class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                <i class="fas fa-check mr-1 text-xs"></i>
                Asignado
              </span>
              <span 
                v-else
                class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
              >
                No asignado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- No centros disponibles -->
    <div v-else-if="empresasSeleccionadas.length > 0 && centrosTrabajo.length === 0" class="text-center py-3 text-gray-500 text-sm bg-yellow-50 rounded-md border border-yellow-200">
      <i class="fas fa-exclamation-triangle mr-2"></i>
      No hay centros de trabajo disponibles para las empresas seleccionadas
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, inject } from 'vue';
import AssignmentsAPI from '@/api/AssignmentsAPI';
import { getCentrosForEmpresas } from '@/composables/useCentrosCache';

interface Props {
  selectedIds: string[];
  empresasSeleccionadas: string[];
  empresasDisponibles?: Empresa[];
  label: string;
  placeholder: string;
  disabled?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:selected-ids': [value: string[]];
}>();

interface CentroTrabajo {
  _id: string;
  nombreCentro: string;
  direccion?: string;
  idEmpresa: string;
}

interface Empresa {
  _id: string;
  nombreComercial: string;
}

const centrosTrabajo = ref<CentroTrabajo[]>([]);
const empresas = ref<Empresa[]>([]);
const loading = ref(false);

// Obtener empresas del store o cargarlas
interface EmpresasStore {
  empresas: { value: Empresa[] };
}

const empresasStore = inject<EmpresasStore>('empresasStore') || { empresas: ref<Empresa[]>([]) };

// Función para cargar centros de trabajo
const cargarCentros = async () => {
  if (props.empresasSeleccionadas.length === 0) {
    centrosTrabajo.value = [];
    return;
  }

  loading.value = true;
  try {
    centrosTrabajo.value = await getCentrosForEmpresas(props.empresasSeleccionadas);
  } catch (error) {
    console.error('Error al cargar centros de trabajo:', error);
    centrosTrabajo.value = [];
  } finally {
    loading.value = false;
  }
};

// Función para obtener el nombre de una empresa por su ID
const getEmpresaNombre = (empresaId: string): string => {

  const empresa = empresas.value.find(e => e._id === empresaId);
  if (empresa) {
    return empresa.nombreComercial;
  }

  console.warn(`Empresa con ID ${empresaId} no encontrada en el array local`);
  return `Empresa ${empresaId.slice(-4)}`;
};

// Computed para agrupar centros por empresa
const centrosAgrupados = computed(() => {
  const grupos = new Map();
  
  centrosTrabajo.value.forEach(centro => {
    const empresaId = centro.idEmpresa;
    const empresaNombre = getEmpresaNombre(empresaId);
    
    if (!grupos.has(empresaId)) {
      grupos.set(empresaId, {
        empresaId,
        empresaNombre,
        centros: []
      });
    }
    
    grupos.get(empresaId).centros.push(centro);
  });
  
  return Array.from(grupos.values()).sort((a, b) => 
    a.empresaNombre.localeCompare(b.empresaNombre)
  );
});

// Función para toggle de centro
const toggleCentro = (centroId: string) => {
  const newSelectedIds = [...props.selectedIds];
  const index = newSelectedIds.indexOf(centroId);
  
  if (index > -1) {
    newSelectedIds.splice(index, 1);
  } else {
    newSelectedIds.push(centroId);
  }
  
  emit('update:selected-ids', newSelectedIds);
};

// Cargar centros cuando cambien las empresas seleccionadas
watch(() => props.empresasSeleccionadas, cargarCentros, { immediate: true });

// Limpiar selección cuando no hay empresas
watch(() => props.empresasSeleccionadas, (newEmpresas) => {
  if (newEmpresas.length === 0) {
    emit('update:selected-ids', []);
  }
});

// Cargar empresas si no están disponibles
const cargarEmpresas = async () => {
  if (empresas.value.length === 0) {
    try {
      // Primero intentar usar las empresas pasadas como prop
      if (props.empresasDisponibles && props.empresasDisponibles.length > 0) {
        empresas.value = props.empresasDisponibles;
        return;
      }
      
      // Intentar obtener empresas del store
      if (empresasStore.empresas && empresasStore.empresas.value && empresasStore.empresas.value.length > 0) {
        empresas.value = empresasStore.empresas.value;
      } else {
        // Si no están en el store, cargarlas directamente
        interface UserStore {
          user: { idProveedorSalud: string };
        }
        const userStore = inject<UserStore>('userStore');
        if (userStore && userStore.user) {
          const resultado = await AssignmentsAPI.getAvailableEmpresas(
            userStore.user.idProveedorSalud
          );
          empresas.value = resultado.data || [];
        }
      }
    } catch (error) {
      console.error('Error al cargar empresas:', error);
    }
  }
};

// Función para cargar empresas cuando sea necesario
const ensureEmpresasLoaded = async () => {
  if (empresas.value.length === 0) {
    await cargarEmpresas();
  }
};

// Cargar empresas al montar el componente
cargarEmpresas();

// Watcher para cargar empresas cuando cambien las empresas seleccionadas
watch(() => props.empresasSeleccionadas, async (newEmpresas) => {
  if (newEmpresas.length > 0) {
    await ensureEmpresasLoaded();
  }
}, { immediate: true });

// Watcher para empresas disponibles pasadas como prop
watch(() => props.empresasDisponibles, (newEmpresas) => {
  if (newEmpresas && newEmpresas.length > 0) {
    empresas.value = newEmpresas;
  }
}, { immediate: true });
</script>

