<script setup lang="ts">
import CentroTrabajoItem from '@/components/CentroTrabajoItem.vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useRiesgoTrabajoStore } from '@/stores/riesgosTrabajo';
import { ref, onMounted, inject, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GreenButton from '@/components/GreenButton.vue';
import ModalCentros from '@/components/ModalCentros.vue';
import ModalEliminar from '@/components/ModalEliminar.vue';
import type { Empresa } from '@/interfaces/empresa.interface';
import type { CentroTrabajo } from '@/interfaces/centro-trabajo.interface';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserPermissions } from '@/composables/useUserPermissions';
import { usePermissionRestrictions } from '@/composables/usePermissionRestrictions';

const toast: any = inject('toast');

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const riesgosTrabajo = useRiesgoTrabajoStore();
const proveedorSaludStore = useProveedorSaludStore();
const route = useRoute();
const router = useRouter();
const { canManageCentrosTrabajo, canAccessDashboardSalud, canAccessRiesgosTrabajo } = useUserPermissions();
const { executeIfCanManageCentrosTrabajo } = usePermissionRestrictions();

const showModal = ref(false);
const showDeleteModal = ref(false);
const selectedCentroTrabajoId = ref<string | null>(null);
const selectedCentroTrabajoNombre = ref<string | null>(null);
const totalTrabajadores = ref(0);
const loadingTrabajadores = ref(false);
const tieneRiesgosTrabajo = ref(false);

// Computed para verificar si el proveedor de salud es de México
const esProveedorMexicano = computed(() => {
  return proveedorSaludStore.proveedorSalud?.pais === 'MX';
});

const openModal = async (empresa: Empresa | null = null, centroTrabajo: CentroTrabajo | null = null) => {
  // Si es un nuevo centro de trabajo (centroTrabajo === null), validar permisos
  if (!centroTrabajo) {
    executeIfCanManageCentrosTrabajo(() => {
      // Solo ejecutar si tiene permisos
      openModalInternal(empresa, centroTrabajo);
    }, 'crear nuevos centros de trabajo');
    return;
  }
  
  // Si es editar centro de trabajo existente, también validar permisos
  executeIfCanManageCentrosTrabajo(() => {
    openModalInternal(empresa, centroTrabajo);
  }, 'editar centros de trabajo');
};

const openModalInternal = async (empresa: Empresa | null = null, centroTrabajo: CentroTrabajo | null = null) => {
  showModal.value = false;
  centrosTrabajo.loadingModal;

  if (empresa && centroTrabajo) {
    try {
      await centrosTrabajo.fetchCentroTrabajoById(empresa._id, centroTrabajo._id);
    } catch (error) {
      console.error('Error al cargar el centro de trabajo:', error);
    }
  } else {
    centrosTrabajo.resetCurrentCentroTrabajo();
  }

  centrosTrabajo.loadingModal = false;
  showModal.value = true;
};

const closeModal = async () => {
  showModal.value = false;
  // Actualizar el conteo de trabajadores después de cerrar el modal
  await obtenerDatosEmpresa();
};

const toggleDeleteModal = (idCentroTrabajo: string | null = null, nombreCentro: string | null = null) => {
  showDeleteModal.value = !showDeleteModal.value;
  selectedCentroTrabajoId.value = idCentroTrabajo;
  selectedCentroTrabajoNombre.value = nombreCentro;
};

const deleteCentroTrabajoById = async (empresaId: string, centroTrabajoId: string) => {
  try {
    toast.open({ 
      message: `Eliminando centro de trabajo ${selectedCentroTrabajoNombre.value}...`, 
      type: "info" 
    });
    
    // Esperamos a que el centro de trabajo sea eliminado
    await centrosTrabajo.deleteCentroTrabajoById(empresaId, centroTrabajoId);

    toast.open({ message: 'Centro de trabajo eliminado con éxito' });

    // Una vez eliminada, volvemos a hacer fetch para actualizar la lista
    await centrosTrabajo.fetchCentrosTrabajo(String(route.params.idEmpresa));

    centrosTrabajo.resetCurrentCentroTrabajo();
    
    // Actualizar el conteo de trabajadores y riesgos
    await obtenerDatosEmpresa();
    
  } catch (error) {
    console.error('Error al eliminar el centro de trabajo', error);
    toast.open({ message: 'Hubo un error. Algunos documentos no se pudieron eliminar. Elimínalos directamente y vuelve a intentarlo', type: 'error' });
  }
};

// Función para obtener trabajadores y riesgos de trabajo en paralelo
const obtenerDatosEmpresa = async () => {
  if (!empresas.currentEmpresa || centrosTrabajo.centrosTrabajo.length === 0) {
    totalTrabajadores.value = 0;
    tieneRiesgosTrabajo.value = false;
    return;
  }

  loadingTrabajadores.value = true;
  try {
    // Ejecutar ambos fetch en paralelo para mayor eficiencia
    const [resultadosTrabajadores, riesgosEmpresa] = await Promise.all([
      // Obtener trabajadores de todos los centros en paralelo
      Promise.all(
        centrosTrabajo.centrosTrabajo.map(centro => 
          trabajadores.fetchTrabajadores(empresas.currentEmpresa!._id, centro._id)
        )
      ),
      // Obtener riesgos de trabajo de la empresa
      trabajadores.fetchRiesgosTrabajoPorEmpresa(empresas.currentEmpresa._id)
    ]);
    
    // Calcular el total de trabajadores
    const total = resultadosTrabajadores.reduce((sum, trabajadoresCentro) => {
      return sum + (Array.isArray(trabajadoresCentro) ? trabajadoresCentro.length : 0);
    }, 0);
    
    totalTrabajadores.value = total;
    
    // Verificar riesgos de trabajo
    if (total === 0) {
      tieneRiesgosTrabajo.value = false;
    } else {
      const tieneRiesgos = riesgosEmpresa && Array.isArray(riesgosEmpresa) && riesgosEmpresa.length > 0;
      tieneRiesgosTrabajo.value = tieneRiesgos;
    }
  } catch (error) {
    // console.error('Error al obtener datos de la empresa:', error);
    totalTrabajadores.value = 0;
    tieneRiesgosTrabajo.value = false;
  } finally {
    loadingTrabajadores.value = false;
  }
};

onMounted(async () => {
  const empresaId = String(route.params.idEmpresa);
  
  // Cargar proveedor de salud desde localStorage si está disponible
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user?.idProveedorSalud) {
    await proveedorSaludStore.loadProveedorSalud(user.idProveedorSalud);
  } else {
    console.error('No se encontró idProveedorSalud en el usuario');
  }
  
  // Ejecutar en paralelo las llamadas que no dependen entre sí
  const [centrosResult] = await Promise.all([
    centrosTrabajo.fetchCentrosTrabajo(empresaId),
    // Setear el ID de empresa actual en el store y obtener datos de la empresa
    (async () => {
      empresas.currentEmpresaId = empresaId;
      await empresas.fetchEmpresaById(empresaId);
    })()
  ]);
  
  // Obtener trabajadores y riesgos de trabajo en paralelo
  await obtenerDatosEmpresa();
});
</script>

<template>
  <Transition appear mode="out-in" name="slide-up">
    <div>
      <Transition appear name="fade">
        <ModalCentros v-if="showModal" @closeModal="closeModal" />
      </Transition>

      <Transition appear name="fade">
        <ModalEliminar v-if="showDeleteModal && selectedCentroTrabajoId && selectedCentroTrabajoNombre"
          :idRegistro="selectedCentroTrabajoId" :identificacion="selectedCentroTrabajoNombre"
          tipoRegistro="Centro de Trabajo" @closeModal="toggleDeleteModal" @confirmDelete="deleteCentroTrabajoById" />
      </Transition>

      <div class="min-h-screen">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Header moderno con información de la empresa -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden mb-8">
            <div class="p-6">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <!-- Información de la empresa -->
                <div class="flex items-center gap-4 mb-4 sm:mb-0">
                  <!-- Logo o placeholder -->
                  <div class="flex-shrink-0">
                    <img
                      v-if="empresas.currentEmpresa?.logotipoEmpresa?.data"
                      :src="'/uploads/logos/' + empresas.currentEmpresa.logotipoEmpresa.data + '?t=' + empresas.currentEmpresa.updatedAt"
                      :alt="'Logo de ' + empresas.currentEmpresa?.nombreComercial"
                      class="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg shadow-lg"
                    />
                    <div v-else class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <i class="fas fa-building text-gray-400 text-xl"></i>
                    </div>
                  </div>
                  
                  <!-- Información de la empresa -->
                  <div class="flex-1 min-w-0">
                    <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                      {{ empresas.currentEmpresa?.nombreComercial || 'Cargando empresa...' }}
                    </h1>
                    <p v-if="empresas.currentEmpresa?.razonSocial" class="empresa-item-subtitle text-sm sm:text-base text-gray-600 mt-1 truncate">
                      {{ empresas.currentEmpresa?.razonSocial }}
                    </p>
                    <p v-else class="text-sm sm:text-base text-gray-400 italic mt-1 truncate">
                      Razón social no registrada
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span v-if="loadingTrabajadores" class="text-xs text-gray-400">
                        <i class="fas fa-spinner fa-spin mr-1"></i>
                        Contando trabajadores...
                      </span>
                      <span v-else class="empresa-item-subtitle text-xs text-gray-500">
                        {{ totalTrabajadores || 0 }} {{ (totalTrabajadores || 0) === 1 ? 'trabajador' : 'trabajadores' }} {{ (totalTrabajadores || 0) === 1 ? 'registrado' : 'registrados' }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Botón de acción principal -->
                <div v-if="centrosTrabajo.centrosTrabajo.length > 0" class="flex-shrink-0">
                  <div class="w-full sm:w-auto">
                    <button 
                      type="button"
                      @click="openModal(null)"
                      :disabled="!canManageCentrosTrabajo"
                      :class="[
                        'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-normal rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-emerald-200 active:scale-95 shadow-lg',
                        canManageCentrosTrabajo 
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-600 hover:to-emerald-700 text-white hover:scale-105 hover:shadow-xl' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                      ]"
                      :title="canManageCentrosTrabajo ? 'Crear nuevo centro de trabajo' : 'No tienes permisos para crear centros de trabajo'"
                    >
                      <i class="fas fa-plus text-sm"></i>
                      <span>Nueva Entidad</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Otras vistas integradas en el header -->
              <div v-if="centrosTrabajo.centrosTrabajo.length > 0" class="mt-6 pt-6 border-t border-gray-100">
                
                <!-- Botones de otras vistas -->
                <div class="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    v-if="canAccessDashboardSalud"
                    type="button"
                    :disabled="!empresas.currentEmpresa || totalTrabajadores === 0"
                    @click="empresas.currentEmpresa && router.push({ name: 'dashboard-empresa', params: { idEmpresa: empresas.currentEmpresa._id } })"
                    class="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    :title="totalTrabajadores > 0 ? 'Ver dashboard de salud' : 'No hay trabajadores registrados'"
                    >
                    <i class="fas fa-chart-line text-sm"></i>
                    <span>Estadísticas de Salud</span>
                  </button>
                  <button
                    v-if="esProveedorMexicano && canAccessRiesgosTrabajo"
                    type="button"
                    :disabled="!empresas.currentEmpresa || !tieneRiesgosTrabajo"
                    @click="empresas.currentEmpresa && router.push({ name: 'riesgos-trabajo', params: { idEmpresa: empresas.currentEmpresa._id } })"
                    class="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    :title="!tieneRiesgosTrabajo ? 'No hay riesgos de trabajo registrados' : 'Ver riesgos de trabajo'"
                  >
                    <i class="fas fa-hard-hat text-sm"></i>
                    <span>Riesgos de Trabajo</span>
                  </button>
                </div>
                
              </div>
            </div>
          </div>

          <!-- Contenido principal -->
          <div class="py-2">
            <Transition appear mode="out-in" name="slide-up">
              <div v-if="!empresas.currentEmpresa" class="text-center py-20">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4 animate-pulse">
                  <i class="fa-solid fa-building text-2xl text-emerald-600"></i>
                </div>
                <p class="text-gray-600 text-lg">Cargando información de la empresa...</p>
              </div>

              <div v-else>
                <!-- Lista de áreas -->
                <div v-if="empresas.currentEmpresa && centrosTrabajo.centrosTrabajo.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div v-for="centro in centrosTrabajo.centrosTrabajo" :key="centro._id">
                    <CentroTrabajoItem :centro="centro"
                    :empresa="empresas.currentEmpresa" class="mb-2" @editarCentro="openModal"
                    @eliminarCentro="toggleDeleteModal" />
                  </div>
                </div>

                <!-- Estado vacío con explicación -->
                <div v-else class="text-center">
                  <div class="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full">
                    <i class="fa-solid fa-building text-6xl text-gray-400"></i>
                  </div>
                  <h2 class="text-2xl font-bold text-gray-900 mb-4">
                    Organiza la empresa
                  </h2>
                  <p class="text-gray-600 mb-8 max-w-2xl mx-auto">
                    Segmenta a los trabajadores creando diferentes tipos de entidades organizacionales para una gestión más eficiente.
                  </p>
                  
                  <!-- Explicación de tipos de entidades -->
                  <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 max-w-4xl mx-auto">
                    <h3 class="text-lg font-semibold text-gray-800 mb-6">
                      ¿Qué puedes crear?
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      
                      <!-- Centros de Trabajo -->
                      <div class="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200">
                        <div class="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <i class="fas fa-industry text-white text-lg"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 mb-2">Centros de Trabajo</h4>
                        <p class="text-sm text-gray-600">
                          Ubicaciones físicas o sedes de operación
                        </p>
                      </div>
                      
                      <!-- Áreas -->
                      <div class="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                        <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <i class="fas fa-sitemap text-white text-lg"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 mb-2">Áreas</h4>
                        <p class="text-sm text-gray-600">
                          Divisiones funcionales como Operaciones, Logística, Administración
                        </p>
                      </div>
                      
                      <!-- Departamentos -->
                      <div class="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                        <div class="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <i class="fas fa-layer-group text-white text-lg"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 mb-2">Departamentos</h4>
                        <p class="text-sm text-gray-600">
                          Unidades especializadas como Producción, Mantenimiento, Almacén
                        </p>
                      </div>
                      
                      <!-- Proyectos -->
                      <div class="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                        <div class="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <i class="fas fa-project-diagram text-white text-lg"></i>
                        </div>
                        <h4 class="font-semibold text-gray-900 mb-2">Proyectos</h4>
                        <p class="text-sm text-gray-600">
                          Iniciativas temporales con objetivos específicos
                        </p>
                      </div>
                    </div>
                    
                    <!-- Beneficios -->
                    <div class="mt-8 pt-6 border-t border-gray-200">
                      <h4 class="font-semibold text-gray-800 mb-4 text-center">
                        Beneficios de la segmentación
                      </h4>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-chart-line text-emerald-600 text-sm"></i>
                          </div>
                          <span class="text-sm text-gray-700">Mejor análisis de datos</span>
                        </div>
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-users text-blue-600 text-sm"></i>
                          </div>
                          <span class="text-sm text-gray-700">Gestión organizada</span>
                        </div>
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-shield-alt text-purple-600 text-sm"></i>
                          </div>
                          <span class="text-sm text-gray-700">Control de riesgos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <GreenButton 
                    text="Crear Primera Entidad" 
                    size="large"
                    :disabled="!canManageCentrosTrabajo"
                    @click="openModal(null)" 
                    title="Crear el primer centro de trabajo"
                  />
                </div>


              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Animaciones para las transiciones */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.slide-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Animación personalizada para el icono de carga */
@keyframes gentle-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: gentle-pulse 2s ease-in-out infinite;
}

/* Mejoras para los botones */
button:active {
  transform: scale(0.98);
}

/* Efectos de hover para las tarjetas */
.transform {
  transition: all 0.3s ease;
}

.transform:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* Responsive design mejorado */
@media (max-width: 640px) {
  .max-w-7xl {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>